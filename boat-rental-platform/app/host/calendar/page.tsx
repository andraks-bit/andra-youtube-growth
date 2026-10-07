import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HostCalendarClient from './HostCalendarClient'
import CalendarSync from './CalendarSync'

export default async function HostCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ boat?: string }>
}) {
  const { boat: boatId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/host/calendar')

  const { data: boats } = await supabase
    .from('boats')
    .select('id, name, slug')
    .eq('host_id', user.id)
    .order('name')

  const selectedBoat = boats?.find((b) => b.id === boatId) ?? boats?.[0] ?? null

  const { data: availability } = selectedBoat
    ? await supabase
        .from('availability')
        .select('date, status')
        .eq('boat_id', selectedBoat.id)
        .gte('date', new Date().toISOString().slice(0, 10))
        .order('date')
    : { data: [] }

  const { data: bookings } = selectedBoat
    ? await supabase
        .from('bookings')
        .select('start_datetime, end_datetime, status')
        .eq('boat_id', selectedBoat.id)
        .in('status', ['confirmed', 'pending'])
        .gte('start_datetime', new Date().toISOString())
    : { data: [] }

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading calendar…</div>}>
      <HostCalendarClient
        boats={boats ?? []}
        selectedBoat={selectedBoat}
        availability={(availability ?? []).map((a) => ({ date: a.date, status: a.status }))}
        bookings={(bookings ?? []).map((b) => ({
          start: b.start_datetime,
          end: b.end_datetime,
          status: b.status,
        }))}
      />
      {selectedBoat && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 40px' }}>
          <CalendarSync boatId={selectedBoat.id} boatName={selectedBoat.name} />
        </div>
      )}
    </Suspense>
  )
}
