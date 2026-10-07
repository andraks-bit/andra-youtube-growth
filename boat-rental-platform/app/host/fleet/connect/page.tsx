import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FeedConnectClient from './FeedConnectClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Connect your boat feed' }

export default async function FeedConnectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/host/fleet/connect')

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, city, country')
    .order('city')

  return <FeedConnectClient locations={locations ?? []} />
}
