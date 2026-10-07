import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils/pricing'
import { getPayoutSummary } from '@/lib/stripe'
import { TrendingUp, DollarSign, Calendar, Ship, Wallet, ArrowRight } from 'lucide-react'

const gold = '#74cfe8'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const dim = 'rgba(244,244,242,0.35)'

export default async function HostEarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/host/earnings')

  const { data: boats } = await supabase.from('boats').select('id').eq('host_id', user.id)
  const boatIds = (boats ?? []).map((b) => b.id)

  const { data: bookings } = boatIds.length
    ? await supabase
        .from('bookings')
        .select('id, status, total, subtotal, service_fee, currency, start_datetime, created_at, boats(name)')
        .in('boat_id', boatIds)
        .in('status', ['confirmed', 'completed'])
        .order('start_datetime', { ascending: false })
    : { data: [] }

  const { data: profile } = await supabase.from('profiles').select('stripe_account_id').eq('id', user.id).single()
  const stripeAccountId = (profile as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null
  const payout = stripeAccountId ? await getPayoutSummary(stripeAccountId) : null

  // Per-trip payout ledger (written by the daily payout cron; empty until
  // migration 007 is applied, in which case the section simply hides).
  const { data: payoutRows } = await supabase
    .from('payouts' as any)
    .select('id, booking_id, amount, currency, method, status, paid_at, created_at')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)
  const payoutHistory = (payoutRows ?? []) as {
    id: string; booking_id: string; amount: number; currency: string
    method: string; status: string; paid_at: string | null; created_at: string
  }[]

  const allBookings = bookings ?? []
  const now = new Date()

  const thisMonth = allBookings.filter((b) => {
    const d = new Date(b.start_datetime)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const lastMonth = allBookings.filter((b) => {
    const d = new Date(b.start_datetime)
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
  })

  const PLATFORM_FEE = 0.15
  const hostShare = (amount: number) => amount * (1 - PLATFORM_FEE)

  const totalGross = allBookings.reduce((s, b) => s + (b.total ?? 0), 0)
  const thisMonthGross = thisMonth.reduce((s, b) => s + (b.total ?? 0), 0)
  const lastMonthGross = lastMonth.reduce((s, b) => s + (b.total ?? 0), 0)

  const monthlyData = Object.entries(
    allBookings.reduce<Record<string, number>>((acc, b) => {
      const key = new Date(b.start_datetime).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
      acc[key] = (acc[key] ?? 0) + (b.total ?? 0)
      return acc
    }, {})
  ).slice(-6).reverse()

  const stats = [
    { label: 'Total earnings',  value: formatPrice(hostShare(totalGross)),    sub: `${allBookings.length} bookings`, Icon: DollarSign, color: '#22c55e' },
    { label: 'This month',      value: formatPrice(hostShare(thisMonthGross)), sub: `${thisMonth.length} bookings`,   Icon: Calendar,   color: gold },
    { label: 'Last month',      value: formatPrice(hostShare(lastMonthGross)), sub: `${lastMonth.length} bookings`,   Icon: TrendingUp, color: muted },
    { label: 'Gross revenue',   value: formatPrice(totalGross),               sub: 'before platform fee',            Icon: Ship,       color: muted },
  ]

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px 80px' }}>

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '32px' }}>Earnings</h1>

        {/* ── Balance & payouts ── */}
        <div style={{ background: card, borderRadius: '16px', border, padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Wallet style={{ width: 20, height: 20, color: gold }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: text }}>Balance &amp; payouts</h2>
          </div>

          {!stripeAccountId ? (
            <>
              <p style={{ fontSize: '14px', color: muted, marginBottom: '16px', lineHeight: 1.6 }}>
                Add your bank account to receive your booking payments. Setup is handled securely by Stripe — your bank details are stored with Stripe, never on BoatHire24.
              </p>
              <Link href="/host/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
                Set up payouts <ArrowRight style={{ width: 15, height: 15 }} />
              </Link>
            </>
          ) : !payout?.payoutsEnabled ? (
            <>
              <p style={{ fontSize: '14px', color: muted, marginBottom: '16px', lineHeight: 1.6 }}>
                Your payout setup isn&apos;t finished yet. Add your bank details with Stripe to start receiving payouts.
              </p>
              <Link href="/host/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
                Finish payout setup <ArrowRight style={{ width: 15, height: 15 }} />
              </Link>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: muted, marginBottom: '4px' }}>Available to pay out</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#22c55e' }}>{formatPrice(payout?.available ?? 0, payout?.currency ?? 'EUR')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: muted, marginBottom: '4px' }}>Pending (clearing)</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: muted }}>{formatPrice(payout?.pending ?? 0, payout?.currency ?? 'EUR')}</div>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: dim, marginBottom: '18px', lineHeight: 1.6 }}>
                Stripe pays your available balance to your bank automatically on a rolling schedule — no need to request it. Use the button below to see payouts or change your bank account.
              </p>
              <a href="/api/host/payouts" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
                Manage payouts &amp; bank <ArrowRight style={{ width: 15, height: 15 }} />
              </a>
            </>
          )}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '32px' }}>
          {stats.map((stat) => (
            <div key={stat.label} style={{ background: card, borderRadius: '16px', border, padding: '20px' }}>
              <stat.Icon style={{ width: 20, height: 20, color: stat.color, marginBottom: '12px' }} />
              <div style={{ fontSize: '24px', fontWeight: 800, color: text, marginBottom: '4px' }}>{stat.value}</div>
              <div style={{ fontSize: '13px', color: muted }}>{stat.label}</div>
              <div style={{ fontSize: '12px', color: dim, marginTop: '2px' }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Monthly breakdown */}
        {monthlyData.length > 0 && (
          <div style={{ background: card, borderRadius: '16px', border, padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: text, marginBottom: '20px' }}>Monthly breakdown</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {monthlyData.map(([month, gross]) => {
                const pct = totalGross > 0 ? (gross / totalGross) * 100 : 0
                return (
                  <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '80px', fontSize: '13px', color: muted, flexShrink: 0 }}>{month}</div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: gold, borderRadius: '99px', width: `${pct}%`, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ width: '80px', fontSize: '13px', fontWeight: 700, color: text, textAlign: 'right' }}>
                      {formatPrice(hostShare(gross))}
                    </div>
                  </div>
                )
              })}
            </div>
            <p style={{ fontSize: '12px', color: dim, marginTop: '16px' }}>Amounts shown after 15% platform fee. Payouts processed via Stripe.</p>
          </div>
        )}

        {/* Per-trip payouts (from the daily payout automation) */}
        {payoutHistory.length > 0 && (
          <div style={{ background: card, borderRadius: '16px', border, padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: text, marginBottom: '6px' }}>Payout history</h2>
            <p style={{ fontSize: '12.5px', color: dim, margin: '0 0 16px' }}>
              Your 85% share is released automatically after each completed trip.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {payoutHistory.map((p, i, arr) => {
                const boatName = allBookings.find((b) => b.id === p.booking_id)?.boats
                const statusColor = p.status === 'paid' ? '#22c55e' : p.status === 'failed' ? '#f87171' : '#f59e0b'
                const statusLabel = p.status === 'paid' ? 'Paid' : p.status === 'due' ? 'On its way' : p.status === 'failed' ? 'Retrying' : 'Processing'
                const methodLabel = p.method === 'manual_bank' ? 'Bank transfer' : 'Stripe'
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: text }}>{(boatName as any)?.name ?? 'Trip'}</span>
                      <span style={{ fontSize: '12px', color: muted, marginLeft: '10px' }}>
                        {new Date(p.paid_at ?? p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {methodLabel}
                      </span>
                    </div>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', color: statusColor, background: `${statusColor}1a`, border: `1px solid ${statusColor}40` }}>
                      {statusLabel}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: gold, minWidth: '80px', textAlign: 'right' }}>
                      {formatPrice(p.amount, p.currency)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Transaction history */}
        {allBookings.length > 0 ? (
          <div style={{ background: card, borderRadius: '16px', border, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: text }}>Transaction history</h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Boat', 'Date', 'Gross', 'Your earnings'].map((h, i) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: i >= 2 ? 'right' : 'left', fontWeight: 600, color: muted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allBookings.map((booking, i, arr) => {
                  const boat = booking.boats as any
                  return (
                    <tr key={booking.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <td style={{ padding: '14px 16px', color: text, fontWeight: 500 }}>{boat?.name}</td>
                      <td style={{ padding: '14px 16px', color: muted }}>
                        {new Date(booking.start_datetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: muted }}>
                        {formatPrice(booking.total, booking.currency)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: gold }}>
                        {formatPrice(hostShare(booking.total ?? 0), booking.currency)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: muted, fontSize: '15px' }}>
            No earnings yet. Your confirmed bookings will appear here.
          </div>
        )}
      </div>
    </div>
  )
}
