import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils/pricing'
import { Calendar, Clock, CheckCircle, XCircle, Ship, MessageSquare, Search } from 'lucide-react'

// Always render fresh so a brand-new request shows the instant the guest lands here.
export const dynamic = 'force-dynamic'

const gold = '#74cfe8'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const dim = 'rgba(244,244,242,0.35)'

const STATUS_CONFIG = {
  pending:   { label: 'Requested', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.30)' },
  confirmed: { label: 'Confirmed', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',    border: 'rgba(34,197,94,0.30)' },
  cancelled: { label: 'Cancelled', color: '#f87171', bg: 'rgba(248,113,113,0.10)',  border: 'rgba(248,113,113,0.28)' },
  completed: { label: 'Completed', color: gold,      bg: 'rgba(116,207,232,0.10)',   border: 'rgba(116,207,232,0.28)' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/dashboard')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`id, status, stripe_payment_intent_id, start_datetime, end_datetime, duration_hours, guests_count, total, currency, special_requests, boats(name, slug, boat_images(storage_url, is_hero), locations(city, country))`)
    .eq('renter_id', user.id)
    .order('start_datetime', { ascending: false })
    .limit(20)

  const all = bookings ?? []
  // Pending bookings show in their own "My requests" section AND still appear under Upcoming trips.
  // Cancelled bookings always land in "Past & cancelled" — otherwise a cancelled future trip
  // matched none of the sections and silently disappeared (looking like the cancel failed).
  const requests = all.filter((b) => b.status === 'pending')
  const upcoming = all.filter((b) => new Date(b.start_datetime) >= new Date() && b.status !== 'cancelled')
  const past = all.filter((b) => b.status === 'cancelled' || b.status === 'completed' || new Date(b.start_datetime) < new Date())

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '36px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '6px' }}>
              Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
            </h1>
            <p style={{ fontSize: '15px', color: muted }}>Manage your trips and messages</p>
          </div>
          <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 18px rgba(116,207,232,0.22)', whiteSpace: 'nowrap' }}>
            <Search style={{ width: 15, height: 15 }} /> Find a boat
          </Link>
        </div>

        {/* ── Quick links ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '40px' }}>
          {[
            { href: '/dashboard', label: 'My Trips', icon: Ship, count: bookings?.length ?? 0 },
            { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, count: 0 },
            { href: '/host', label: 'Host dashboard', icon: Calendar, count: null },
            { href: '/become-a-host', label: 'List a boat', icon: Ship, count: null },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px 16px', background: card, borderRadius: '16px', border, textDecoration: 'none', textAlign: 'center', transition: 'border-color 0.15s' }}>
              <item.icon style={{ width: 24, height: 24, color: gold }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: text }}>{item.label}</span>
              {item.count !== null && item.count !== undefined && (
                <span style={{ fontSize: '12px', color: muted }}>{item.count}</span>
              )}
            </Link>
          ))}
        </div>

        {/* ── Pending requests ── */}
        {requests.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: text, marginBottom: '4px' }}>My requests</h2>
            <p style={{ fontSize: '13px', color: muted, marginBottom: '16px' }}>We&apos;ve notified the owner — once they confirm, your payment link appears right here.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {requests.map((booking) => {
                const boat = booking.boats as any
                const hero = boat?.boat_images?.find((i: any) => i.is_hero) ?? boat?.boat_images?.[0]
                const accepted = (booking as { stripe_payment_intent_id?: string | null }).stripe_payment_intent_id?.startsWith('cs_')
                const offered = (booking as { special_requests?: string | null }).special_requests?.startsWith('Offer sent')
                return (
                  <div key={booking.id} style={{ padding: '18px', background: card, borderRadius: '16px', border: `1px solid ${accepted ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.30)'}` }}>
                  <Link href={`/bookings/${booking.id}`} style={{ display: 'flex', gap: '16px', textDecoration: 'none', alignItems: 'flex-start' }}>
                    {hero && (
                      <img src={hero.storage_url} alt={boat?.name} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                        <div style={{ fontWeight: 700, color: text, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{boat?.name}</div>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', whiteSpace: 'nowrap', background: accepted ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: accepted ? '#22c55e' : '#f59e0b', border: `1px solid ${accepted ? 'rgba(34,197,94,0.30)' : 'rgba(245,158,11,0.30)'}` }}>
                          {offered ? 'Offer received' : accepted ? 'Accepted' : 'Requested'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: muted, marginBottom: '6px' }}>
                        {new Date(booking.start_datetime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                        {booking.duration_hours ? ` · ${booking.duration_hours}h` : ''}
                        {boat?.locations?.city ? ` · ${boat.locations.city}` : ''}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: gold }}>{(booking as { special_requests?: string | null }).special_requests?.startsWith('Price on request') ? 'Price on request' : formatPrice(booking.total, booking.currency)}</div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: accepted ? '#22c55e' : '#f59e0b' }}>
                          {accepted ? 'Pay now →' : 'Awaiting owner confirmation'}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <Link href={`/api/conversations/start?booking=${booking.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: gold, textDecoration: 'none', fontWeight: 600 }}>💬 Message host</Link>
                    <form action={`/api/bookings/${booking.id}/cancel`} method="POST">
                      <button type="submit" style={{ padding: '7px 16px', borderRadius: '99px', background: 'transparent', color: 'rgba(248,113,113,0.85)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(248,113,113,0.30)' }}>
                        Cancel request
                      </button>
                    </form>
                  </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Upcoming trips ── */}
        {upcoming.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: text, marginBottom: '16px' }}>Upcoming trips</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {upcoming.map((booking) => {
                const boat = booking.boats as any
                const hero = boat?.boat_images?.find((i: any) => i.is_hero) ?? boat?.boat_images?.[0]
                return (
                  <Link key={booking.id} href={`/bookings/${booking.id}`} style={{ display: 'flex', gap: '16px', padding: '18px', background: card, borderRadius: '16px', border, textDecoration: 'none', transition: 'border-color 0.15s', alignItems: 'flex-start' }}>
                    {hero && (
                      <img src={hero.storage_url} alt={boat?.name} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                        <div style={{ fontWeight: 700, color: text, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{boat?.name}</div>
                        <StatusBadge status={booking.status} />
                      </div>
                      <div style={{ fontSize: '13px', color: muted, marginBottom: '4px' }}>
                        {new Date(booking.start_datetime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
                        {' · '}{booking.guests_count} guests
                        {' · '}{boat?.locations?.city}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: gold }}>
                        {(booking as { special_requests?: string | null }).special_requests?.startsWith('Price on request') ? 'Price on request' : formatPrice(booking.total, booking.currency)}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Past trips ── */}
        {past.length > 0 && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: text, marginBottom: '16px' }}>Past &amp; cancelled trips</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {past.map((booking) => {
                const boat = booking.boats as any
                const hero = boat?.boat_images?.find((i: any) => i.is_hero) ?? boat?.boat_images?.[0]
                return (
                  <Link key={booking.id} href={`/bookings/${booking.id}`} style={{ display: 'flex', gap: '16px', padding: '18px', background: card, borderRadius: '16px', border: 'rgba(255,255,255,0.07)', textDecoration: 'none', opacity: 0.75, transition: 'opacity 0.15s', alignItems: 'flex-start' }}>
                    {hero && (
                      <img src={hero.storage_url} alt={boat?.name} style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0, filter: 'grayscale(0.4)' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ fontWeight: 600, color: text, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{boat?.name}</div>
                        <StatusBadge status={booking.status} />
                      </div>
                      <div style={{ fontSize: '13px', color: dim, marginTop: '4px' }}>
                        {new Date(booking.start_datetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!bookings?.length && (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <Ship style={{ width: 48, height: 48, color: 'rgba(116,207,232,0.25)', margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: text, marginBottom: '10px' }}>No trips yet</h2>
            <p style={{ fontSize: '15px', color: muted, marginBottom: '28px' }}>Find the perfect boat for your next adventure.</p>
            <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 32px', borderRadius: '99px', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
              Explore boats
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
