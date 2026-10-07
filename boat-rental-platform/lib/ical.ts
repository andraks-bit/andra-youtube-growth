// iCal (RFC 5545) parsing + generation for calendar sync.
//
// Import: a host publishes a public calendar (iCloud "Public Calendar", Google
// "Secret iCal address", Airbnb/Booking.com export, …) and gives us its .ics /
// webcal URL. We fetch it, read the busy events, and block those dates on the
// boat so double-bookings can't happen — no manual updates.
//
// Export: every boat also exposes its BoatHire24 bookings + blocks as an .ics
// feed the host can subscribe to from iCloud, so our bookings show up in their
// calendar automatically. Together that is a two-way sync.

export interface IcalEvent {
  uid: string
  start: Date // wall-clock date/time as UTC (tz offset ignored — we only need the calendar day)
  end: Date
  allDay: boolean
  summary: string
  cancelled: boolean
  transparent: boolean // TRANSP:TRANSPARENT = free/available → not a block
}

/** webcal:// → https://, strip whitespace. */
export function normalizeIcalUrl(url: string): string {
  const u = (url || '').trim()
  if (/^webcal:\/\//i.test(u)) return u.replace(/^webcal:\/\//i, 'https://')
  return u
}

/** YYYY-MM-DD for a UTC date. */
export function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/** Parse an iCal date/time value (with its property params) into a UTC Date built
 *  from the wall-clock components. Returns allDay=true for VALUE=DATE (YYYYMMDD). */
function parseIcalDate(value: string, params: Record<string, string>): { date: Date; allDay: boolean } | null {
  const v = value.trim()
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v)
  if (dateOnly || params.VALUE === 'DATE') {
    const m = dateOnly || /^(\d{4})(\d{2})(\d{2})/.exec(v)
    if (!m) return null
    return { date: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])), allDay: true }
  }
  const dt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?Z?$/.exec(v)
  if (dt) return { date: new Date(Date.UTC(+dt[1], +dt[2] - 1, +dt[3], +dt[4], +dt[5], +(dt[6] || 0))), allDay: false }
  return null
}

/** Unfold RFC5545 folded lines (a CRLF followed by space/tab continues the line). */
function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').replace(/\r[ \t]/g, '')
}

/** Split "DTSTART;TZID=Europe/Madrid;VALUE=DATE-TIME" into name + params map. */
function parseProp(line: string): { name: string; params: Record<string, string>; value: string } | null {
  const colon = line.indexOf(':')
  if (colon === -1) return null
  const head = line.slice(0, colon)
  const value = line.slice(colon + 1)
  const parts = head.split(';')
  const name = parts[0].toUpperCase()
  const params: Record<string, string> = {}
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=')
    if (eq > -1) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).toUpperCase()
  }
  return { name, params, value }
}

export function parseICS(text: string): IcalEvent[] {
  const lines = unfold(String(text || '')).split(/\r?\n/)
  const events: IcalEvent[] = []
  let cur: Partial<IcalEvent> & { _start?: { date: Date; allDay: boolean }; _end?: { date: Date; allDay: boolean }; _duration?: string } | null = null
  for (const raw of lines) {
    const line = raw.trim()
    if (line === 'BEGIN:VEVENT') { cur = { uid: '', summary: '', cancelled: false, transparent: false }; continue }
    if (line === 'END:VEVENT') {
      if (cur && cur._start) {
        const allDay = cur._start.allDay
        const start = cur._start.date
        let end = cur._end?.date
        if (!end) end = new Date(start.getTime() + (allDay ? 86400000 : 3600000)) // default: +1 day (all-day) / +1h
        events.push({ uid: cur.uid || '', start, end, allDay, summary: cur.summary || '', cancelled: !!cur.cancelled, transparent: !!cur.transparent })
      }
      cur = null; continue
    }
    if (!cur) continue
    const p = parseProp(line)
    if (!p) continue
    switch (p.name) {
      case 'UID': cur.uid = p.value.trim(); break
      case 'SUMMARY': cur.summary = p.value.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/gi, ' ').trim(); break
      case 'DTSTART': { const d = parseIcalDate(p.value, p.params); if (d) cur._start = d; break }
      case 'DTEND': { const d = parseIcalDate(p.value, p.params); if (d) cur._end = d; break }
      case 'STATUS': if (/CANCELLED/i.test(p.value)) cur.cancelled = true; break
      case 'TRANSP': if (/TRANSPARENT/i.test(p.value)) cur.transparent = true; break
    }
  }
  return events
}

/** The set of calendar days (YYYY-MM-DD) that are busy, given parsed events.
 *  Cancelled + transparent(free) events are ignored. DTEND is exclusive. */
export function busyDates(events: IcalEvent[]): string[] {
  const days = new Set<string>()
  for (const e of events) {
    if (e.cancelled || e.transparent) continue
    // walk each UTC day from start up to (but excluding) end; if end lands exactly on
    // midnight, that day is not occupied (DTEND exclusive). Guard against runaway ranges.
    const startDay = Date.UTC(e.start.getUTCFullYear(), e.start.getUTCMonth(), e.start.getUTCDate())
    let endMs = e.end.getTime()
    const endIsMidnight = e.end.getUTCHours() === 0 && e.end.getUTCMinutes() === 0 && e.end.getUTCSeconds() === 0
    // for timed events ending after midnight, include the end day; for all-day / midnight-end, exclude it
    const endDay = Date.UTC(e.end.getUTCFullYear(), e.end.getUTCMonth(), e.end.getUTCDate()) - (e.allDay || endIsMidnight ? 86400000 : 0)
    if (endMs < e.start.getTime()) continue
    let d = startDay
    for (let i = 0; d <= endDay && i < 400; i++, d += 86400000) days.add(ymd(new Date(d)))
    if (days.size === 0) days.add(ymd(new Date(startDay)))
  }
  return [...days].sort()
}

/** Fold a line to <=75 octets per RFC5545 (CRLF + space continuation). */
function fold(line: string): string {
  if (line.length <= 74) return line
  const out: string[] = []
  let s = line
  while (s.length > 74) { out.push(out.length === 0 ? s.slice(0, 74) : ' ' + s.slice(0, 73)); s = s.slice(out.length === 1 ? 74 : 73) }
  out.push(' ' + s)
  return out.join('\r\n')
}

function icsDate(ymdStr: string): string { return ymdStr.replace(/-/g, '') }
function icsStamp(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}${String(d.getUTCSeconds()).padStart(2, '0')}Z`
}
const esc = (s: string) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

export interface IcsExportEvent { uid: string; startDate: string; endDateExclusive: string; summary: string }

/** Build a VCALENDAR export feed of all-day busy periods. */
export function generateICS(opts: { calName: string; events: IcsExportEvent[]; now?: Date }): string {
  const now = opts.now || new Date()
  const stamp = icsStamp(now)
  const L: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BoatHire24//Calendar Sync//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', fold(`X-WR-CALNAME:${esc(opts.calName)}`),
  ]
  for (const e of opts.events) {
    L.push('BEGIN:VEVENT',
      fold(`UID:${e.uid}`),
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(e.startDate)}`,
      `DTEND;VALUE=DATE:${icsDate(e.endDateExclusive)}`,
      fold(`SUMMARY:${esc(e.summary)}`),
      'STATUS:CONFIRMED', 'TRANSP:OPAQUE', 'END:VEVENT')
  }
  L.push('END:VCALENDAR')
  return L.join('\r\n') + '\r\n'
}

/** Merge a sorted list of YYYY-MM-DD busy days into contiguous [start, endExclusive) ranges. */
export function daysToRanges(days: string[]): Array<{ start: string; endExclusive: string }> {
  const sorted = [...new Set(days)].sort()
  const ranges: Array<{ start: string; endExclusive: string }> = []
  const addDay = (s: string, n: number) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d) }
  let i = 0
  while (i < sorted.length) {
    const start = sorted[i]
    let last = start
    while (i + 1 < sorted.length && sorted[i + 1] === addDay(last, 1)) { last = sorted[++i] }
    ranges.push({ start, endExclusive: addDay(last, 1) })
    i++
  }
  return ranges
}
