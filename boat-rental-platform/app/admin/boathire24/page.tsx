import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import ManagedListings from '@/components/admin/ManagedListings'
import LeadContactEdit from '@/components/admin/LeadContactEdit'
import AddCustomerButton from '@/components/admin/AddCustomerButton'
import LeadBoats from '@/components/admin/LeadBoats'
import DeleteLeadButton from '@/components/admin/DeleteLeadButton'
import LeadComment from '@/components/admin/LeadComment'
import LeadVerified2x from '@/components/admin/LeadVerified2x'
import EditNameButton from '@/components/admin/EditNameButton'

export const metadata: Metadata = { title: 'BoatHire24 managed | Admin' }
export const dynamic = 'force-dynamic'

const text = '#f4f4f2', muted = 'rgba(244,244,242,0.55)', gold = '#74cfe8'
const card = 'rgba(255,255,255,0.03)', border = 'rgba(116,207,232,0.18)'

type Boat = { name?: string; url?: string; price?: string; prices?: Record<string, string>; cancellation?: string; cancellationCustom?: string; currency?: string }
type Sub = {
  id: string; contact_name: string | null; company: string | null; website: string | null
  email: string | null; phone: string | null; boats: Boat[]; note: string | null
  source: string | null; status: string; created_at: string; country: string | null; port: string | null
}
const DUR_ORDER = ['2h', '4h', '6h', 'day']
const POLICY_LABEL: Record<string, string> = { flexible: 'Flexible (24h)', moderate: 'Moderate (5 days)', strict: 'Strict (14 days)', custom: 'Custom' }
const CUR_SYM: Record<string, string> = { EUR: '€', GBP: '£', USD: '$', CHF: 'CHF', AED: 'AED', AUD: 'A$', CAD: 'C$', SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'zł', TRY: '₺', ZAR: 'R', SAR: 'SAR', QAR: 'QAR', HRK: 'kn' }
const symOf = (c?: string) => CUR_SYM[c || 'EUR'] || c || '€'
function num(s: string): number | null {
  const m = s.replace(/[ ,.](?=\d{3}\b)/g, '').match(/\d+(?:[.,]\d+)?/)
  return m ? Math.round(parseFloat(m[0].replace(',', '.'))) : null
}
const STATUS_COLOR: Record<string, string> = { pending: '#f59e0b', confirmed: '#22c55e', completed: '#22c55e', cancelled: '#f87171' }

export default async function BoatHire24HubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/boathire24')
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: me } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/')

  const { data: managed } = await admin.from('profiles').select('id').eq('is_managed_account', true).maybeSingle()
  const managedHostId = managed?.id ?? null

  // Listing leads (from /get-listed)
  const { data: subData } = await admin.from('listing_submissions').select('*').order('created_at', { ascending: false }).limit(300)
  const subs = (subData ?? []) as Sub[]

  // Boats grouped per lead (submission_id) + the location their boats are in
  // (the ground truth — a lead's typed country is often wrong, e.g. "Spain"
  // for a Phuket operator).
  const byLead = new Map<string, { id: string; name: string; status: string; slug: string }[]>()
  const locVotes = new Map<string, Map<string, number>>() // submission_id -> "City, Country" -> count
  const subIds = subs.map((s) => s.id)
  if (subIds.length) {
    const { data: leadBoats } = await admin.from('boats').select('id, name, status, slug, submission_id, locations(city, country)').in('submission_id', subIds)
    for (const bt of (leadBoats ?? []) as { id: string; name: string; status: string; slug: string; submission_id: string; locations: { city?: string; country?: string } | null }[]) {
      const arr = byLead.get(bt.submission_id) ?? []
      arr.push({ id: bt.id, name: bt.name, status: bt.status, slug: bt.slug })
      byLead.set(bt.submission_id, arr)
      const loc = [bt.locations?.city, bt.locations?.country].filter(Boolean).join(', ')
      if (loc) {
        const votes = locVotes.get(bt.submission_id) ?? new Map<string, number>()
        votes.set(loc, (votes.get(loc) ?? 0) + 1)
        locVotes.set(bt.submission_id, votes)
      }
    }
  }
  // The most common boat location per lead.
  const locByLead = new Map<string, string>()
  for (const [sid, votes] of locVotes) {
    locByLead.set(sid, [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0])
  }

  // Inquiries / bookings on managed boats
  let inquiries: { id: string; boatName: string; renter: string; when: string; total: number; currency: string; status: string }[] = []
  if (managedHostId) {
    const { data: mBoats } = await admin.from('boats').select('id, name').eq('host_id', managedHostId)
    const idToName = new Map((mBoats ?? []).map((b: { id: string; name: string }) => [b.id, b.name]))
    const ids = [...idToName.keys()]
    if (ids.length) {
      const { data: bk } = await admin.from('bookings')
        .select('id, boat_id, renter_id, start_datetime, total, currency, status, created_at')
        .in('boat_id', ids).order('created_at', { ascending: false }).limit(100)
      const renterIds = [...new Set((bk ?? []).map((b: { renter_id: string }) => b.renter_id))]
      const nameById = new Map<string, string>()
      if (renterIds.length) {
        const { data: profs } = await admin.from('profiles').select('id, full_name').in('id', renterIds)
        for (const p of (profs ?? []) as { id: string; full_name: string | null }[]) nameById.set(p.id, p.full_name ?? '')
      }
      inquiries = (bk ?? []).map((b: { id: string; boat_id: string; renter_id: string; start_datetime: string; total: number; currency: string; status: string }) => ({
        id: b.id, boatName: idToName.get(b.boat_id) ?? '—', renter: nameById.get(b.renter_id) || '—',
        when: b.start_datetime ? new Date(b.start_datetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—',
        total: b.total ?? 0, currency: b.currency ?? 'EUR', status: b.status,
      }))
    }
  }

  const H2: React.CSSProperties = { fontSize: 20, fontWeight: 800, margin: '40px 0 6px' }

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text, fontFamily: '-apple-system,Segoe UI,sans-serif' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '48px 20px 90px' }}>
        <a href="/admin" style={{ color: muted, fontSize: 13, textDecoration: 'none' }}>← Admin Panel</a>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '12px 0 4px' }}>🚤 BoatHire24 <span style={{ color: gold }}>managed</span></h1>
        <p style={{ color: muted, fontSize: 14, margin: '0 0 8px', maxWidth: 720, lineHeight: 1.5 }}>
          Everything for the managed model in one place — boats we list on operators&apos; behalf, leads from the <a href="/get-listed" target="_blank" rel="noopener" style={{ color: gold }}>get-listed</a> form, and inquiries on those boats. We list at the owner&apos;s price + 15%.
        </p>

        {/* ── Managed fleet ── */}
        <h2 style={H2}>Managed fleet</h2>
        <div style={{ marginTop: 14 }}><ManagedListings hostId={managedHostId} /></div>

        {/* ── Listing leads ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', ...H2 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Listing leads <span style={{ color: gold }}>({subs.length})</span></h2>
          <AddCustomerButton />
        </div>
        <p style={{ color: muted, fontSize: 13, margin: '0 0 14px' }}>Operators who submitted their fleet via the get-listed form, or added manually. Import their boats and add 15% on top.</p>
        {subs.length === 0 ? (
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: 32, textAlign: 'center', color: muted }}>No submissions yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {subs.map((s) => (
              <div key={s.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, flexWrap: 'wrap' }}>
                    {s.company || s.contact_name || '—'}{s.company && s.contact_name && <span style={{ color: muted, fontSize: 13 }}> · {s.contact_name}</span>}
                    {(() => {
                      const manual = s.source === 'admin-manual'
                      return (
                        <span title={manual ? 'Added manually by an admin' : 'Came in via the get-listed form'} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 99, color: manual ? gold : '#7fe3aa', background: manual ? 'rgba(116,207,232,0.12)' : 'rgba(94,214,140,0.12)', border: `1px solid ${manual ? 'rgba(116,207,232,0.28)' : 'rgba(94,214,140,0.28)'}` }}>{manual ? '✍ Manual' : '✉ Email'}</span>
                      )
                    })()}
                    <LeadVerified2x id={s.id} verified={(s as any).verified_2x} />
                    <EditNameButton id={s.id} />
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, color: muted }}>{new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                    <DeleteLeadButton id={s.id} name={s.company || s.contact_name || 'this lead'} />
                  </span>
                </div>
                <LeadContactEdit id={s.id} website={s.website} email={s.email} phone={s.phone} contactName={s.contact_name} company={s.company} location={locByLead.get(s.id) || [s.port, s.country].filter(Boolean).join(', ')} />
                <LeadComment id={s.id} note={s.note} />
                {Array.isArray(s.boats) && s.boats.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                    {s.boats.map((b, i) => {
                      const pr = b.prices && Object.keys(b.prices).length
                        ? Object.entries(b.prices).sort((a, c) => DUR_ORDER.indexOf(a[0]) - DUR_ORDER.indexOf(c[0])) : []
                      return (
                        <div key={i} style={{ padding: '5px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <span style={{ color: text, fontSize: 13 }}>{b.name || '—'} {b.url && <a href={b.url.startsWith('http') ? b.url : `https://${b.url}`} target="_blank" rel="noopener" style={{ color: gold, fontSize: 12 }}>↗</a>}</span>
                          {pr.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 3 }}>
                              {pr.map(([k, v]) => { const p = num(v); return <span key={k} style={{ fontSize: 12, color: muted }}>{k === 'day' ? 'Full day' : k}: {v}{p ? <span style={{ color: gold }}> → {symOf(b.currency)}{Math.round(p * 1.15).toLocaleString()}</span> : null}</span> })}
                            </div>
                          ) : b.price ? <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{b.price}</div> : null}
                          {b.cancellation && <div style={{ fontSize: 11.5, color: muted, marginTop: 3 }}>↩ {POLICY_LABEL[b.cancellation] || b.cancellation}{b.cancellation === 'custom' && b.cancellationCustom ? `: ${b.cancellationCustom}` : ''}</div>}
                        </div>
                      )
                    })}
                  </div>
                )}
                <LeadBoats boats={byLead.get(s.id) ?? []} />
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a href={`${managedHostId ? `/host/fleet/website?host=${managedHostId}` : '/host/fleet/website'}${managedHostId ? '&' : '?'}submission=${s.id}${s.website ? `&url=${encodeURIComponent(s.website)}` : ''}`} style={{ fontSize: 12, fontWeight: 700, color: '#07101e', background: gold, textDecoration: 'none', borderRadius: 8, padding: '7px 14px' }}>🔗 Import their site →</a>
                  <a href={managedHostId ? `/host/listings/new?host=${managedHostId}&submission=${s.id}` : '/host/listings/new'} style={{ fontSize: 12, fontWeight: 700, color: gold, textDecoration: 'none', border: `1px solid ${border}`, borderRadius: 8, padding: '7px 14px' }}>+ Add listing manually</a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Inquiries on managed boats ── */}
        <h2 style={H2}>Inquiries on managed boats <span style={{ color: gold }}>({inquiries.length})</span></h2>
        <p style={{ color: muted, fontSize: 13, margin: '0 0 14px' }}>Booking requests &amp; bookings for boats under the BoatHire24 account. Check availability with the owner before confirming.</p>
        {inquiries.length === 0 ? (
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: 32, textAlign: 'center', color: muted }}>No inquiries on managed boats yet.</div>
        ) : (
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
            {inquiries.map((q, i) => (
              <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < inquiries.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{q.boatName}</div>
                  <div style={{ fontSize: 12, color: muted }}>{q.renter} · {q.when}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 13, color: gold, fontWeight: 700 }}>{q.currency === 'EUR' ? '€' : q.currency + ' '}{q.total.toLocaleString()}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: STATUS_COLOR[q.status] || muted, border: '1px solid rgba(255,255,255,0.12)' }}>{q.status}</span>
                </div>
              </div>
            ))}
            <div style={{ padding: '10px 16px' }}><a href="/host/bookings" target="_blank" rel="noopener" style={{ fontSize: 12, color: gold, textDecoration: 'none', fontWeight: 600 }}>Manage in host bookings →</a></div>
          </div>
        )}
      </div>
    </div>
  )
}
