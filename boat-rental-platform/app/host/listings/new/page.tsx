import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ListingWizard from '@/components/host/ListingWizard'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ host?: string; submission?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/host/listings/new')

  // Admin can pass ?host=<userId> to create the listing on behalf of that host
  const params = await searchParams
  let targetHost: { id: string; name: string; email: string } | null = null

  if (params.host) {
    const { data: me } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (me?.is_admin) {
      const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(params.host)
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles').select('full_name').eq('id', params.host).single()
      if (targetUser) {
        targetHost = {
          id: targetUser.id,
          name: targetProfile?.full_name ?? targetUser.email ?? '—',
          email: targetUser.email ?? '',
        }
      }
    }
  }

  const { data: locations } = await supabase.from('locations').select('id, name, city, country').order('name')

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {targetHost && (
          <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(116,207,232,0.10)', border: '1px solid rgba(116,207,232,0.30)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#74cfe8', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: '4px' }}>
              🛡️ Admin · Concierge Listing Mode
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(244,244,242,0.75)', margin: 0 }}>
              You're creating this listing on behalf of <strong style={{ color: '#f4f4f2' }}>{targetHost.name}</strong>
              {targetHost.email && <> (<span style={{ fontFamily: 'monospace' }}>{targetHost.email}</span>)</>}.
              The boat will be owned by this host, not by you.
            </p>
          </div>
        )}
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#f4f4f2', marginBottom: '28px' }}>
          {targetHost ? `Create listing for ${targetHost.name}` : 'Create a listing'}
        </h1>
        <ListingWizard
          locations={locations ?? []}
          targetHostId={targetHost?.id}
          submissionId={targetHost && params.submission ? params.submission : undefined}
          returnTo={targetHost ? '/admin/boathire24' : undefined}
        />
      </div>
    </div>
  )
}
