import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FleetCalendarClient from './FleetCalendarClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Fleet Calendar' }

export default async function FleetCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/host/fleet/calendar')

  const { data: boats } = await supabase
    .from('boats')
    .select('id, name, status, type')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })

  return <FleetCalendarClient boats={boats ?? []} />
}
