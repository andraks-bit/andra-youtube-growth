import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FleetImportClient from './FleetImportClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Bulk Import' }

export default async function FleetImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/host/fleet/import')

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, city, country')
    .order('name')

  return <FleetImportClient userId={user.id} locations={locations ?? []} />
}
