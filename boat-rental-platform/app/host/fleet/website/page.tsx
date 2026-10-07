import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import WebsiteImportClient from './WebsiteImportClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Import from your website' }

export default async function WebsiteImportPage({ searchParams }: { searchParams: Promise<{ host?: string; url?: string; submission?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/host/fleet/website')

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, city, country')
    .order('name')

  // Admin concierge: import on behalf of another host (e.g. the BoatHire24
  // managed account). Only admins may target a host other than themselves.
  const { host, url, submission } = await searchParams
  let targetHostId: string | undefined
  let targetLabel: string | undefined
  if (host && host !== user.id) {
    const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (me?.is_admin) {
      const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data: target } = await admin.from('profiles').select('id, full_name').eq('id', host).single()
      if (target) { targetHostId = target.id; targetLabel = target.full_name ?? 'managed host' }
    }
  }

  return <WebsiteImportClient locations={locations ?? []} targetHostId={targetHostId} targetLabel={targetLabel} initialUrl={url} submissionId={submission} />
}
