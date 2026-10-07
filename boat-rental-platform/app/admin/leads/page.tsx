import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import LeadContactEdit from '@/components/admin/LeadContactEdit'
import AddCustomerButton from '@/components/admin/AddCustomerButton'
import LeadBoats from '@/components/admin/LeadBoats'
import DeleteLeadButton from '@/components/admin/DeleteLeadButton'
import LeadComment from '@/components/admin/LeadComment'
import LeadVerified2x from '@/components/admin/LeadVerified2x'

export const metadata: Metadata = { title: 'Listing leads' }
export const dynamic = 'force-dynamic'

const text = '#f4f4f2', muted = 'rgba(244,244,242,0.55)', gold = '#74cfe8'
const card = 'rgba(255,255,255,0.03)', border = 'rgba(116,207,232,0.18)'

type Boat = { name?: string; url?: string; price?: string; prices?: Record<string, string>; cancellation?: string; cancellationCustom?: string; currency?: string }
const DUR_ORDER = ['2h', '4h', '6h', 'day']
const POLICY_LABEL: Record<string, string> = { flexible: 'Flexible (24h)', moderate: 'Moderate (5 days)', strict: 'Strict (14 days)', custom: 'Custom' }
const CUR_SYM: Record<string, string> = { EUR: '€', GBP: '£', USD: '$', CHF: 'CHF', AED: 'AED', AUD: 'A$', CAD: 'C$', SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'zł', TRY: '₺', ZAR: 'R', SAR: 'SAR', QAR: 'QAR', HRK: 'kn' }
const symOf = (c?: string) => CUR_SYM[c || 'EUR'] || c || '€'
function num(s: string): number | null {
  const m = s.replace(/[ ,.](?=\d{3}\b)/g, '').match(/\d+(?:[.,]\d+)?/)
  return m ? Math.round(parseFloat(m[0].replace(',', '.'))) : null
}
type Sub = {
  id: string; contact_name: string | null; company: string | null; website: string | null
  email: string | null; phone: string | null; boats: Boat[]; note: string | null
  source: string | null; status: string; created_at: string; country: string | null; port: string | null
}

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/leads')
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: me } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/')

  const { data } = await admin
    .from('listing_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)
  const subs = (data ?? []) as Sub[]

  const { data: managed } = await admin.from('profiles').select('id').eq('is_managed_account', true).maybeSingle()
  const importHref = managed?.id ? `/host/fleet/website?host=${managed.id}` : '/host/fleet/website'
  const manualHref = managed?.id ? `/host/listings/new?host=${managed.id}` : '/host/listings/new'

  // Boats imported/added per lead (grouped by submission_id).
  const byLead = new Map<string, { id: string; name: string; status: string; slug: string }[]>()
  const subIds = subs.map((s) => s.id)
  if (subIds.length) {
    const { data: leadBoats } = await admin.from('boats')
      .select('id, name, status, slug, submission_id')
      .in('submission_id', subIds)
    for (const bt of (leadBoats ?? []) as { id: string; name: string; status: string; slug: string; submission_id: string }[]) {
      const arr = byLead.get(bt.submission_id) ?? []
      arr.push({ id: bt.id, name: bt.name, status: bt.status, slug: bt.slug })
      byLead.set(bt.submission_id, arr)
    }
  }

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text, fontFamily: '-apple-system,Segoe UI,sans-serif' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '48px 20px 80px' }}>
        <a href="/admin" style={{ color: muted, fontSize: 13, textDecoration: 'none' }}>← Admin</a>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', margin: '12px 0 4px' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>🚤 Listing leads <span style={{ color: gold }}>({subs.length})</span></h1>
          <AddCustomerButton />
        </div>
        <p style={{ color: muted, fontSize: 14, margin: '0 0 26px' }}>Operators who submitted their fleet via <a href="/get-listed" style={{ color: gold }}>/get-listed</a>, or added manually. Import their boats under the BoatHire24 managed account and add 15% on top of each price.</p>

        {subs.length === 0 ? (
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: 40, textAlign: 'center', color: muted }}>No submissions yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {subs.map((s) => (
              <div key={s.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{s.company || s.contact_name || '—'}</span>
                    {s.company && s.contact_name && <span style={{ color: muted, fontSize: 13 }}> · {s.contact_name}</span>}
                    {(() => {
                      const manual = s.source === 'admin-manual'
                      return (
                        <span title={manual ? 'Added manually by an admin' : 'Came in via the get-listed form'} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 99, color: manual ? gold : '#7fe3aa', background: manual ? 'rgba(116,207,232,0.12)' : 'rgba(94,214,140,0.12)', border: `1px solid ${manual ? 'rgba(116,207,232,0.28)' : 'rgba(94,214,140,0.28)'}` }}>{manual ? '✍ Manual' : '✉ Email'}</span>
                      )
                    })()}
                    <LeadVerified2x id={s.id} verified={(s as any).verified_2x} />
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, color: muted }}>{new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                    <DeleteLeadButton id={s.id} name={s.company || s.contact_name || 'this lead'} />
                  </span>
                </div>
                <LeadContactEdit id={s.id} website={s.website} email={s.email} phone={s.phone} contactName={s.contact_name} company={s.company} location={[s.port, s.country].filter(Boolean).join(', ')} />
                <LeadComment id={s.id} note={s.note} />
                {Array.isArray(s.boats) && s.boats.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                    {s.boats.map((b, i) => {
                      const pr = b.prices && Object.keys(b.prices).length
                        ? Object.entries(b.prices).sort((a, c) => DUR_ORDER.indexOf(a[0]) - DUR_ORDER.indexOf(c[0]))
                        : []
                      return (
                        <div key={i} style={{ padding: '5px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <span style={{ color: text, fontSize: 13 }}>{b.name || '—'} {b.url && <a href={b.url.startsWith('http') ? b.url : `https://${b.url}`} target="_blank" rel="noopener" style={{ color: gold, fontSize: 12 }}>↗</a>}</span>
                          {pr.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 3 }}>
                              {pr.map(([k, v]) => {
                                const p = num(v)
                                return <span key={k} style={{ fontSize: 12, color: muted }}>{k === 'day' ? 'Full day' : k}: {v}{p ? <span style={{ color: gold }}> → {symOf(b.currency)}{Math.round(p * 1.15).toLocaleString()}</span> : null}</span>
                              })}
                            </div>
                          ) : b.price ? <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{b.price}</div> : null}
                          {b.cancellation && (
                            <div style={{ fontSize: 11.5, color: muted, marginTop: 3 }}>
                              ↩ {POLICY_LABEL[b.cancellation] || b.cancellation}{b.cancellation === 'custom' && b.cancellationCustom ? `: ${b.cancellationCustom}` : ''}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                <LeadBoats boats={byLead.get(s.id) ?? []} />
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a href={`${importHref}${importHref.includes('?') ? '&' : '?'}submission=${s.id}${s.website ? `&url=${encodeURIComponent(s.website)}` : ''}`} style={{ fontSize: 12, fontWeight: 700, color: '#07101e', background: gold, textDecoration: 'none', borderRadius: 8, padding: '7px 14px' }}>🔗 Import their site →</a>
                  <a href={`${manualHref}${manualHref.includes('?') ? '&' : '?'}submission=${s.id}`} style={{ fontSize: 12, fontWeight: 700, color: gold, textDecoration: 'none', border: `1px solid ${border}`, borderRadius: 8, padding: '7px 14px' }}>+ Add listing manually</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
