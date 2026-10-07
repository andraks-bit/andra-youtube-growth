import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { ArrowLeft } from 'lucide-react'
import ListingWizard from '@/components/host/ListingWizard'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/host/listings/${id}`)

  // Check if caller is admin
  const { data: me } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  const isAdmin = me?.is_admin === true

  // Admins can edit any listing; hosts can only edit their own.
  let query = supabaseAdmin
    .from('boats')
    .select(`
      id, name, slug, tagline, description, type, length_m, capacity_pax, cabins, bathrooms,
      builder, model_year, departure_port, marina_lat, marina_lng,
      includes_skipper, includes_fuel, includes_drinks, admin_note, host_id,
      min_hours, pricing_type, instant_book, cancellation_policy, status, location_id, is_fishing_trip,
      locations(city, country),
      boat_pricing(id, duration_hours, price, currency, season),
      boat_features(id, feature),
      boat_images(id, storage_url, alt, sort_order, is_hero)
    `)
    .eq('id', id)
  if (!isAdmin) query = query.eq('host_id', user.id)
  const { data: boat } = await query.single() as { data: any }

  // Is this an admin editing someone else's listing?
  const adminConcierge = isAdmin && boat && boat.host_id !== user.id

  // Look up the host's name (for the banner)
  let hostInfo: { name: string; email: string } | null = null
  if (adminConcierge && boat) {
    const [{ data: { user: hostUser } }, { data: hostProfile }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(boat.host_id),
      supabaseAdmin.from('profiles').select('full_name').eq('id', boat.host_id).single(),
    ])
    hostInfo = {
      name: hostProfile?.full_name ?? hostUser?.email ?? '—',
      email: hostUser?.email ?? '',
    }
  }

  if (!boat) notFound()

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, city, country')
    .order('name')

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <Link href="/host/listings" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', color: muted, textDecoration: 'none', flexShrink: 0 }}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </Link>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: text }}>Edit listing</h1>
        </div>

        {adminConcierge && hostInfo && (
          <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(116,207,232,0.10)', border: '1px solid rgba(116,207,232,0.30)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#74cfe8', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: '4px' }}>
              🛡️ Admin · Concierge Edit Mode
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(244,244,242,0.75)', margin: 0 }}>
              Editing on behalf of <strong style={{ color: text }}>{hostInfo.name}</strong>
              {hostInfo.email && <> (<span style={{ fontFamily: 'monospace' }}>{hostInfo.email}</span>)</>}
            </p>
          </div>
        )}

        {boat.admin_note && (
          <div style={{ marginBottom: '24px', padding: '20px 22px', background: 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(248,113,113,0.05) 100%)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.10em' }}>Note from our team</span>
            </div>
            <p style={{ fontSize: '14px', color: '#f4f4f2', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-line' }}>
              {boat.admin_note}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(244,244,242,0.50)', marginTop: '12px', marginBottom: 0 }}>
              Make the changes above and save — we&apos;ll re-activate your listing within a few hours.
            </p>
          </div>
        )}

        <ListingWizard locations={locations ?? []} initialData={boat as any} boatId={id} returnTo={adminConcierge ? '/admin/boathire24' : undefined} conciergeEdit={adminConcierge} />
      </div>
    </div>
  )
}
