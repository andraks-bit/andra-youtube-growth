// Shared calendar-sync engine used by the host connect endpoint, the "sync now"
// button, and the daily cron. Fetches a boat's external calendar (.ics/webcal),
// reads the busy days, and blocks them on the boat — replacing only the rows it
// imported before (source='ical'), never touching real bookings or manual blocks.
import { createClient } from '@supabase/supabase-js'
import { parseICS, busyDates, normalizeIcalUrl } from './ical'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function fetchIcs(url: string): Promise<string> {
  const res = await fetch(normalizeIcalUrl(url), {
    headers: { 'User-Agent': 'BoatHire24-Calendar/1.0 (+https://boathire24.com)', Accept: 'text/calendar, text/plain, */*' },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`The calendar URL returned HTTP ${res.status}. Check the link is the public .ics / webcal address.`)
  const text = await res.text()
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('That URL did not return a calendar feed (no VCALENDAR). Use the public .ics or webcal:// link, not the web page.')
  return text
}

/** Days from today to +2 years — we never block the past and cap the horizon. */
function futureBusyDays(text: string): string[] {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0)
  const horizon = new Date(today.getTime() + 730 * 86400000)
  const lo = today.toISOString().slice(0, 10), hi = horizon.toISOString().slice(0, 10)
  return busyDates(parseICS(text)).filter((d) => d >= lo && d <= hi)
}

export async function syncBoatIcal(boat: { id: string; ical_url: string | null }): Promise<{ imported: number }> {
  if (!boat.ical_url) throw new Error('No calendar URL is set for this boat.')
  let days: string[]
  try {
    days = futureBusyDays(await fetchIcs(boat.ical_url))
  } catch (e) {
    await admin.from('boats').update({ ical_last_sync: new Date().toISOString(), ical_sync_status: 'error', ical_sync_error: (e as Error).message.slice(0, 300) }).eq('id', boat.id)
    throw e
  }
  // Replace only the blocks WE imported last time; leave bookings + manual blocks alone.
  await admin.from('availability').delete().eq('boat_id', boat.id).eq('source', 'ical')
  if (days.length) {
    const rows = days.map((date) => ({ boat_id: boat.id, date, status: 'blocked' as const, source: 'ical' }))
    // ignoreDuplicates → INSERT … ON CONFLICT DO NOTHING, so a date already 'booked'
    // or manually 'blocked' keeps its existing row.
    const { error } = await admin.from('availability').upsert(rows, { onConflict: 'boat_id,date', ignoreDuplicates: true })
    if (error) throw new Error(error.message)
  }
  await admin.from('boats').update({ ical_last_sync: new Date().toISOString(), ical_sync_status: 'ok', ical_sync_error: null }).eq('id', boat.id)
  return { imported: days.length }
}

/** Remove a boat's imported blocks and forget the URL (disconnect). */
export async function disconnectBoatIcal(boatId: string): Promise<void> {
  await admin.from('availability').delete().eq('boat_id', boatId).eq('source', 'ical')
  await admin.from('boats').update({ ical_url: null, ical_last_sync: null, ical_sync_status: null, ical_sync_error: null }).eq('id', boatId)
}
