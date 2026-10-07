import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils/pricing'
import { Plus, Settings, Calendar, BarChart3, Ship, Clock, CheckCircle, Layers, Upload, Building2, ShieldCheck, ShieldAlert, MessageSquare } from 'lucide-react'
import PayoutBadge from '@/components/ui/PayoutBadge'
import DeleteListingButton from '@/components/host/DeleteListingButton'
import AutoReplyToggle from '@/components/host/AutoReplyToggle'

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.10)'
const goldBorder = 'rgba(116,207,232,0.22)'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const dim = 'rgba(244,244,242,0.35)'

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.30)' },
  confirmed: { label: 'Confirmed', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.30)' },
  cancelled: { label: 'Cancelled', color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.28)' },
  completed: { label: 'Completed', color: gold,      bg: 'rgba(116,207,232,0.10)',  border: 'rgba(116,207,232,0.28)' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  )
}

export default async function HostDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/host')

  const { data: profile } = await supabase.from('profiles').select('full_name, stripe_account_id, verification_status').eq('id', user.id).single()

  const { data: boats } = await supabase
    .from('boats')
    .select('id, name, slug, status, capacity_pax, type, admin_note, boat_images(storage_url, is_hero)')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })

  const boatIds = (boats ?? []).map((b) => b.id)
  const { data: bookings } = boatIds.length > 0
    ? await supabase.from('bookings').select('id, status, start_datetime, guests_count, total, currency, boats(name, slug)').in('boat_id', boatIds).order('created_at', { ascending: false }).limit(10)
    : { data: [] }

  const totalRevenue = (bookings ?? []).filter((b) => b.status === 'confirmed' || b.status === 'completed').reduce((sum, b) => sum + (b.total ?? 0), 0)
  const pendingBookings = (bookings ?? []).filter((b) => b.status === 'pending').length

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '6px' }}>Host Dashboard</h1>
            <p style={{ fontSize: '15px', color: muted }}>Manage your fleet and bookings</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/dashboard/messages" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '99px', background: 'rgba(116,207,232,0.10)', border: '1px solid rgba(116,207,232,0.30)', color: gold, fontSize: '14px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              <MessageSquare style={{ width: 16, height: 16 }} /> Messages
            </Link>
            <Link href="/host/listings/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 18px rgba(116,207,232,0.22)', whiteSpace: 'nowrap' }}>
              <Plus style={{ width: 16, height: 16 }} /> Add listing
            </Link>
          </div>
        </div>

        {/* ── Admin revision required ── */}
        {(boats ?? []).filter((b) => (b as { admin_note?: string }).admin_note).length > 0 && (
          <div style={{ marginBottom: '16px', padding: '20px 24px', background: 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(248,113,113,0.06) 100%)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '16px', boxShadow: '0 8px 24px rgba(245,158,11,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(245,158,11,0.30)' }}>
                <ShieldAlert style={{ width: 22, height: 22, color: '#1a1208' }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '15px', marginBottom: '3px' }}>
                  Action required on {(boats ?? []).filter((b) => (b as { admin_note?: string }).admin_note).length} listing{(boats ?? []).filter((b) => (b as { admin_note?: string }).admin_note).length !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '13px', color: muted }}>
                  Our team left notes on the following listings. Make the changes and we&apos;ll re-activate them.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(boats ?? []).filter((b) => (b as { admin_note?: string }).admin_note).map((b) => (
                <Link
                  key={b.id}
                  href={`/host/listings/${b.id}`}
                  style={{ display: 'block', padding: '14px 18px', background: 'rgba(7,16,30,0.40)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: '12px', textDecoration: 'none', transition: 'border-color 0.15s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: text, fontSize: '14px' }}>{b.name}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Open editor →
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(244,244,242,0.75)', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-line' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.10em', marginRight: '8px' }}>Note from team:</span>
                    {(b as { admin_note?: string }).admin_note}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Drafts to review (concierge-listed) ── */}
        {(boats ?? []).filter((b) => b.status === 'draft').length > 0 && (() => {
          const draftCount = (boats ?? []).filter((b) => b.status === 'draft').length
          return (
            <div style={{ marginBottom: '16px', padding: '20px 24px', background: 'linear-gradient(135deg, rgba(116,207,232,0.10) 0%, rgba(251,191,36,0.06) 100%)', border: `1px solid ${goldBorder}`, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', boxShadow: '0 8px 24px rgba(116,207,232,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg,#fbbf24,#74cfe8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(251,191,36,0.30)' }}>
                  <span style={{ fontSize: '22px' }}>📋</span>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: gold, fontSize: '15px', marginBottom: '3px' }}>
                    {draftCount} draft listing{draftCount !== 1 ? 's' : ''} ready for your review
                  </div>
                  <div style={{ fontSize: '13px', color: muted, lineHeight: 1.5 }}>
                    Our team prepared {draftCount === 1 ? 'this listing' : 'these listings'} for you (concierge setup). Review the details, edit anything you'd like, then activate when ready to receive bookings.
                  </div>
                </div>
              </div>
              <Link href="/host/listings" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 22px', borderRadius: '99px', background: 'linear-gradient(135deg,#fbbf24,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(116,207,232,0.30)' }}>
                Review drafts →
              </Link>
            </div>
          )
        })()}

        {/* ── Verification alert ── */}
        {profile?.verification_status === 'unverified' && (
          <div style={{ marginBottom: '16px', padding: '18px 20px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldAlert style={{ width: 20, height: 20, color: '#f87171', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#f87171', fontSize: '14px', marginBottom: '3px' }}>Verify your account</div>
                <div style={{ fontSize: '13px', color: muted }}>Upload your documents so your listings can go live to guests.</div>
              </div>
            </div>
            <Link href="/host/verify" style={{ display: 'inline-flex', padding: '10px 20px', borderRadius: '99px', background: '#f87171', color: '#fff', fontSize: '13px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Verify now
            </Link>
          </div>
        )}
        {profile?.verification_status === 'pending' && (
          <div style={{ marginBottom: '16px', padding: '18px 20px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <ShieldCheck style={{ width: 20, height: 20, color: '#f59e0b', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '14px', marginBottom: '3px' }}>Verification under review</div>
              <div style={{ fontSize: '13px', color: muted }}>We received your documents. You'll get an email once approved (1–2 business days).</div>
            </div>
          </div>
        )}
        {profile?.verification_status === 'verified' && (
          <div style={{ marginBottom: '16px', padding: '14px 20px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.22)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck style={{ width: 18, height: 18, color: '#22c55e' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>Verified host</span>
            <span style={{ fontSize: '13px', color: muted }}>· Your listings are visible to guests</span>
          </div>
        )}
        {profile?.verification_status === 'rejected' && (
          <div style={{ marginBottom: '16px', padding: '18px 20px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#f87171', fontSize: '14px', marginBottom: '3px' }}>Verification needs attention</div>
              <div style={{ fontSize: '13px', color: muted }}>Check your email for details, then re-submit your documents.</div>
            </div>
            <Link href="/host/verify" style={{ display: 'inline-flex', padding: '10px 20px', borderRadius: '99px', background: '#f87171', color: '#fff', fontSize: '13px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Re-submit
            </Link>
          </div>
        )}

        {/* ── Payouts ── */}
        {!profile?.stripe_account_id ? (
          <div style={{ marginBottom: '28px', padding: '18px 20px', background: 'rgba(116,207,232,0.08)', border: '1px solid rgba(116,207,232,0.25)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, color: gold, fontSize: '14px', marginBottom: '4px' }}>Set up payouts</div>
              <div style={{ fontSize: '13px', color: muted }}>Connect your bank account via Stripe to receive booking payments.</div>
            </div>
            <Link href="/host/onboarding" style={{ display: 'inline-flex', padding: '10px 20px', borderRadius: '99px', background: gold, color: '#07101e', fontSize: '13px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Set up now
            </Link>
          </div>
        ) : (
          <div style={{ marginBottom: '28px', padding: '18px 20px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.22)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '14px', marginBottom: '4px' }}>Payouts active</div>
              <div style={{ fontSize: '13px', color: muted }}>Your earnings are paid to your bank automatically by Stripe.</div>
            </div>
            <Link href="/host/earnings" style={{ display: 'inline-flex', padding: '10px 20px', borderRadius: '99px', background: gold, color: '#07101e', fontSize: '13px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              View balance &amp; payouts →
            </Link>
          </div>
        )}

        {/* ── Payout SLA badge ── */}
        <div style={{ marginBottom: '24px' }}>
          <PayoutBadge />
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '36px' }}>
          {[
            { label: 'Total listings',   value: boats?.length ?? 0,                                               icon: Ship },
            { label: 'Active listings',  value: (boats ?? []).filter((b) => b.status === 'active').length,        icon: CheckCircle },
            { label: 'Pending bookings', value: pendingBookings,                                                   icon: Clock },
            { label: 'Total revenue',    value: formatPrice(totalRevenue),                                         icon: BarChart3 },
          ].map((stat) => (
            <div key={stat.label} style={{ background: card, borderRadius: '16px', border, padding: '20px' }}>
              <stat.icon style={{ width: 20, height: 20, color: gold, marginBottom: '12px' }} />
              <div style={{ fontSize: '24px', fontWeight: 800, color: text, marginBottom: '4px' }}>{stat.value}</div>
              <div style={{ fontSize: '13px', color: muted }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Fleet Manager promo ── */}
        <div style={{ marginBottom: '36px', padding: '20px 24px', borderRadius: '16px', background: 'rgba(116,207,232,0.05)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Layers style={{ width: 20, height: 20, color: gold, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: text, fontSize: '14px', marginBottom: '3px' }}>Fleet Manager</div>
              <div style={{ fontSize: '12px', color: muted }}>Bulk import · multi-boat calendar · corporate events</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link href="/host/fleet/import" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: goldFaint, border: `1px solid ${goldBorder}`, color: gold, fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
              <Upload style={{ width: 12, height: 12 }} /> Bulk import
            </Link>
            <Link href="/host/fleet/corporate" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: goldFaint, border: `1px solid ${goldBorder}`, color: gold, fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
              <Building2 style={{ width: 12, height: 12 }} /> Corporate
            </Link>
            <Link href="/host/fleet" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: goldFaint, border: `1px solid ${goldBorder}`, color: gold, fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
              Open Fleet →
            </Link>
          </div>
        </div>

        {/* ── Auto-reply setting ── */}
        <AutoReplyToggle />

        {/* ── Listings ── */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: text }}>Your listings</h2>
            <Link href="/host/listings" style={{ fontSize: '13px', color: gold, fontWeight: 600, textDecoration: 'none' }}>View all</Link>
          </div>

          {!boats?.length ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: card, borderRadius: '16px', border: `2px dashed ${border}` }}>
              <Ship style={{ width: 40, height: 40, color: 'rgba(116,207,232,0.20)', margin: '0 auto 14px' }} />
              <p style={{ color: muted, fontSize: '15px', marginBottom: '20px' }}>No listings yet</p>
              <Link href="/host/listings/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', background: gold, color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
                <Plus style={{ width: 16, height: 16 }} /> Create your first listing
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {boats.slice(0, 6).map((boat) => {
                const hero = (boat.boat_images as any[])?.find((i: any) => i.is_hero) ?? (boat.boat_images as any[])?.[0]
                const statusColors: Record<string, string> = { active: '#22c55e', paused: '#f59e0b', draft: muted }
                return (
                  <div key={boat.id} style={{ background: card, borderRadius: '16px', border, overflow: 'hidden' }}>
                    <div style={{ position: 'relative', aspectRatio: '16/9', background: 'rgba(255,255,255,0.04)' }}>
                      {hero && <img src={hero.storage_url} alt={boat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: 'rgba(7,16,30,0.80)', color: statusColors[boat.status] ?? muted, border: `1px solid ${statusColors[boat.status] ?? 'rgba(255,255,255,0.15)'}30` }}>
                          {boat.status}
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 700, color: text, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{boat.name}</div>
                      <div style={{ fontSize: '12px', color: muted, marginBottom: '14px' }}>{boat.capacity_pax} guests · {boat.type.replace('_', ' ')}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link href={`/host/listings/${boat.id}`} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${goldBorder}`, color: gold, fontSize: '12px', fontWeight: 600, textDecoration: 'none', background: goldFaint }}>
                          <Settings style={{ width: 13, height: 13 }} /> Edit
                        </Link>
                        <Link href={`/host/calendar?boat=${boat.id}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '9px 14px', borderRadius: '8px', border: `1px solid rgba(255,255,255,0.12)`, color: muted, textDecoration: 'none' }}>
                          <Calendar style={{ width: 14, height: 14 }} />
                        </Link>
                        <DeleteListingButton boatId={boat.id} boatName={boat.name} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Recent bookings ── */}
        {(bookings ?? []).length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: text }}>Recent bookings</h2>
              <Link href="/host/bookings" style={{ fontSize: '13px', color: gold, fontWeight: 600, textDecoration: 'none' }}>View all</Link>
            </div>
            <div style={{ background: card, borderRadius: '16px', border, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Boat', 'Date', 'Guests', 'Status', 'Amount'].map((h, i) => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: i === 4 ? 'right' : 'left', fontWeight: 600, color: muted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(bookings ?? []).slice(0, 8).map((booking, i, arr) => {
                    const boat = booking.boats as any
                    return (
                      <tr key={booking.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <td style={{ padding: '14px 16px', color: text, fontWeight: 500 }}>{boat?.name}</td>
                        <td style={{ padding: '14px 16px', color: muted }}>{new Date(booking.start_datetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                        <td style={{ padding: '14px 16px', color: muted }}>{booking.guests_count}</td>
                        <td style={{ padding: '14px 16px' }}><StatusBadge status={booking.status} /></td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: gold }}>{formatPrice(booking.total, booking.currency)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
