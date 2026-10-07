import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils/pricing'
import { Clock, CheckCircle, XCircle, Calendar, Users } from 'lucide-react'
import CancelBookingButton from '@/components/booking/CancelBookingButton'

const gold = '#74cfe8'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const dim = 'rgba(244,244,242,0.35)'

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  bd: 'rgba(245,158,11,0.30)',  icon: Clock },
  confirmed: { label: 'Confirmed', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   bd: 'rgba(34,197,94,0.30)',   icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: '#f87171', bg: 'rgba(248,113,113,0.10)', bd: 'rgba(248,113,113,0.28)', icon: XCircle },
  completed: { label: 'Completed', color: gold,      bg: 'rgba(116,207,232,0.10)',  bd: 'rgba(116,207,232,0.28)',  icon: CheckCircle },
}

export default async function HostBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filterStatus } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/host/bookings')

  const { data: boats } = await supabase.from('boats').select('id').eq('host_id', user.id)
  const boatIds = (boats ?? []).map((b) => b.id)

  let query = supabase
    .from('bookings')
    .select(`id, status, stripe_payment_intent_id, start_datetime, end_datetime, duration_hours, guests_count, subtotal, service_fee, total, currency, special_requests, created_at, boats(name, slug), profiles!renter_id(full_name, avatar_url)`)
    .in('boat_id', boatIds.length ? boatIds : ['none'])
    .order('created_at', { ascending: false })

  if (filterStatus) query = query.eq('status', filterStatus)
  const { data: bookings } = await query.limit(50)

  const tabs = [
    { label: 'All',       href: '/host/bookings' },
    { label: 'Pending',   href: '/host/bookings?status=pending' },
    { label: 'Confirmed', href: '/host/bookings?status=confirmed' },
    { label: 'Completed', href: '/host/bookings?status=completed' },
    { label: 'Cancelled', href: '/host/bookings?status=cancelled' },
  ]

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px 80px' }}>

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '28px' }}>Bookings</h1>

        {/* ── Filter tabs ── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', overflowX: 'auto', paddingBottom: '4px' }}>
          {tabs.map((tab) => {
            const active = tab.href === `/host/bookings${filterStatus ? `?status=${filterStatus}` : ''}`
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  padding: '9px 18px', borderRadius: '99px', fontSize: '13px', fontWeight: 600,
                  whiteSpace: 'nowrap', textDecoration: 'none', transition: 'all 0.15s',
                  background: active ? gold : 'rgba(255,255,255,0.06)',
                  color: active ? '#07101e' : muted,
                  border: active ? 'none' : '1px solid rgba(255,255,255,0.10)',
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        {/* ── Booking list ── */}
        {!bookings?.length ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: muted, fontSize: '15px' }}>
            No bookings found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bookings.map((booking) => {
              const boat = booking.boats as any
              const renter = (booking as any).profiles
              const cfg = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
              return (
                <div key={booking.id} style={{ background: card, borderRadius: '16px', border, padding: '20px', transition: 'border-color 0.15s' }}>
                  <div className="bk-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <div>
                          <Link href={`/boats/${boat?.slug}`} style={{ fontWeight: 700, color: text, fontSize: '15px', textDecoration: 'none' }}>
                            {boat?.name}
                          </Link>
                          <div style={{ fontSize: '13px', color: muted, marginTop: '4px' }}>
                            Renter: {renter?.full_name ?? 'Guest'}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '99px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.bd}`, whiteSpace: 'nowrap' }}>
                          {cfg.label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: muted }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar style={{ width: 14, height: 14 }} />
                          {new Date(booking.start_datetime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          {' · '}{booking.duration_hours}h
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users style={{ width: 14, height: 14 }} />
                          {booking.guests_count} guests
                        </span>
                      </div>

                      {booking.special_requests && (
                        <p style={{ marginTop: '10px', fontSize: '13px', color: dim, fontStyle: 'italic' }}>
                          &ldquo;{booking.special_requests}&rdquo;
                        </p>
                      )}
                      <div style={{ marginTop: '10px' }}>
                        <Link href={`/api/conversations/start?booking=${booking.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: gold, textDecoration: 'none', fontWeight: 600 }}>
                          💬 Message guest
                        </Link>
                      </div>
                    </div>

                    <div className="bk-actions">
                      <div style={{ fontWeight: 800, color: gold, fontSize: '18px' }}>
                        {(booking as { special_requests?: string | null }).special_requests?.startsWith('Price on request') ? 'Price on request' : formatPrice(booking.total, booking.currency)}
                      </div>
                      <div style={{ fontSize: '12px', color: dim, marginTop: '4px' }}>
                        {new Date(booking.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                      {booking.status === 'pending' && (
                        (booking as { special_requests?: string | null }).special_requests?.startsWith('Price on request') ? (
                          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#74cfe8', padding: '6px 12px', borderRadius: '99px', background: 'rgba(116,207,232,0.10)', border: '1px solid rgba(116,207,232,0.28)' }}>💬 Quote request</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <Link href={`/host/bookings/${booking.id}/offer`} style={{ padding: '8px 16px', borderRadius: '99px', background: gold, color: '#07101e', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>Send offer →</Link>
                              <form action={`/api/host/bookings/${booking.id}/decline`} method="POST">
                                <button type="submit" style={{ padding: '7px 14px', borderRadius: '99px', background: 'transparent', color: muted, fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)' }}>Dismiss</button>
                              </form>
                            </div>
                          </div>
                        ) : (booking as { stripe_payment_intent_id?: string | null }).stripe_payment_intent_id?.startsWith('cs_') ? (
                          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e', padding: '6px 12px', borderRadius: '99px', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.28)' }}>✓ Accepted — payment link sent, awaiting guest</span>
                          </div>
                        ) : (
                          <>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                            <form action={`/api/host/bookings/${booking.id}/confirm`} method="POST">
                              <button type="submit" style={{ padding: '8px 16px', borderRadius: '99px', background: gold, color: '#07101e', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                                Accept
                              </button>
                            </form>
                            <form action={`/api/host/bookings/${booking.id}/decline`} method="POST">
                              <button type="submit" style={{ padding: '8px 16px', borderRadius: '99px', background: 'transparent', color: muted, fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)' }}>
                                Decline
                              </button>
                            </form>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <Link href={`/host/bookings/${booking.id}/offer`} style={{ fontSize: '12px', color: gold, textDecoration: 'none', fontWeight: 600 }}>Propose a different date / price →</Link>
                          </div>
                          </>
                        )
                      )}
                      {booking.status === 'confirmed' && (
                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                          <CancelBookingButton bookingId={booking.id} label="Cancel booking" confirmText="Cancel this confirmed booking? The guest will be notified and the date freed. Issue any refund in Stripe." />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
