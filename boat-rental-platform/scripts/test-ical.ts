// Unit tests for lib/ical.ts — run: npx tsx scripts/test-ical.ts
import { parseICS, busyDates, generateICS, daysToRanges, normalizeIcalUrl, ymd } from '../lib/ical'

let pass = 0, fail = 0
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g === w) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}\n      got:  ${g}\n      want: ${w}`) }
}

// A realistic iCloud-style public calendar with folded lines, all-day + timed,
// a multi-day booking, a cancelled event, and a free/transparent event.
const ICS = [
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Apple Inc.//iOS 17//EN', 'CALSCALE:GREGORIAN',
  // single all-day (Jun 27) — DTEND exclusive next day
  'BEGIN:VEVENT', 'UID:aaa@icloud', 'SUMMARY:Charter - Smith party', 'DTSTART;VALUE=DATE:20260627', 'DTEND;VALUE=DATE:20260628', 'END:VEVENT',
  // multi-day all-day (Jul 03..Jul 05 inclusive → DTEND Jul 06)
  // folded mid-word: RFC5545 splits with CRLF+space, and unfolding removes that space (so "fo"+"lded" = "folded")
  'BEGIN:VEVENT', 'UID:bbb@icloud', 'SUMMARY:Blocked - maintenance haul out at the yard with a very long fo', ' lded summary line to exercise unfolding', 'DTSTART;VALUE=DATE:20260703', 'DTEND;VALUE=DATE:20260706', 'END:VEVENT',
  // timed same-day (Jul 10 09:00-13:00 local) → blocks Jul 10 only
  'BEGIN:VEVENT', 'UID:ccc@icloud', 'SUMMARY:Morning trip', 'DTSTART;TZID=Europe/Madrid:20260710T090000', 'DTEND;TZID=Europe/Madrid:20260710T130000', 'END:VEVENT',
  // cancelled → ignored
  'BEGIN:VEVENT', 'UID:ddd@icloud', 'SUMMARY:Cancelled trip', 'STATUS:CANCELLED', 'DTSTART;VALUE=DATE:20260715', 'DTEND;VALUE=DATE:20260716', 'END:VEVENT',
  // transparent/free → ignored
  'BEGIN:VEVENT', 'UID:eee@icloud', 'SUMMARY:Tentative', 'TRANSP:TRANSPARENT', 'DTSTART;VALUE=DATE:20260720', 'DTEND;VALUE=DATE:20260721', 'END:VEVENT',
  // UTC timed with Z
  'BEGIN:VEVENT', 'UID:fff@icloud', 'SUMMARY:Sunset cruise', 'DTSTART:20260725T160000Z', 'DTEND:20260725T190000Z', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

console.log('parseICS / busyDates:')
const events = parseICS(ICS)
eq('event count', events.length, 6)
eq('unfolded summary', events[1].summary, 'Blocked - maintenance haul out at the yard with a very long folded summary line to exercise unfolding')
const busy = busyDates(events)
eq('busy days', busy, ['2026-06-27', '2026-07-03', '2026-07-04', '2026-07-05', '2026-07-10', '2026-07-25'])

console.log('normalizeIcalUrl:')
eq('webcal→https', normalizeIcalUrl('webcal://p1-caldav.icloud.com/published/2/abc'), 'https://p1-caldav.icloud.com/published/2/abc')
eq('https passthrough', normalizeIcalUrl(' https://x.com/a.ics '), 'https://x.com/a.ics')

console.log('daysToRanges:')
eq('merge contiguous', daysToRanges(['2026-07-03', '2026-07-04', '2026-07-05', '2026-06-27']), [
  { start: '2026-06-27', endExclusive: '2026-06-28' },
  { start: '2026-07-03', endExclusive: '2026-07-06' },
])

console.log('generateICS round-trip:')
const ranges = daysToRanges(busy).map((r, i) => ({ uid: `bh24-${i}@boathire24.com`, startDate: r.start, endDateExclusive: r.endExclusive, summary: 'Booked on BoatHire24' }))
const out = generateICS({ calName: 'Denia Sport Fishing Charter — BoatHire24', events: ranges, now: new Date('2026-07-12T00:00:00Z') })
eq('valid VCALENDAR wrapper', /^BEGIN:VCALENDAR\r\n[\s\S]*END:VCALENDAR\r\n$/.test(out), true)
eq('CRLF line endings', out.includes('\r\n'), true)
eq('has DTSTART;VALUE=DATE', out.includes('DTSTART;VALUE=DATE:20260627'), true)
// parse our own output back → same busy days
const reparsed = busyDates(parseICS(out))
eq('round-trip busy days match', reparsed, busy)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
