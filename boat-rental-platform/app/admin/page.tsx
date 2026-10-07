import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import AdminApiKeyButton from '@/components/admin/AdminApiKeyButton'
import ManagedListings from '@/components/admin/ManagedListings'
import AdminVerifyButton from './AdminVerifyButton'
import AdminDocsButton from './AdminDocsButton'
import AdminBoatsButton from './AdminBoatsButton'
import AdminPayoutButton from './AdminPayoutButton'
import AdminLinkButton from './AdminLinkButton'
import MarkPayoutPaidButton from './MarkPayoutPaidButton'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin Panel' }

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.10)'
const goldBorder = 'rgba(116,207,232,0.22)'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

const STATUS_STYLE: Record<string, { color: string; bg: string; bd: string; label: string }> = {
  unverified: { color: muted,      bg: 'rgba(255,255,255,0.05)', bd: 'rgba(255,255,255,0.12)', label: 'Unverified' },
  pending:    { color: '#f59e0b',  bg: 'rgba(245,158,11,0.10)',  bd: 'rgba(245,158,11,0.28)',  label: 'Pending review' },
  verified:   { color: '#22c55e',  bg: 'rgba(34,197,94,0.10)',   bd: 'rgba(34,197,94,0.28)',   label: 'Verified ✓' },
  rejected:   { color: '#f87171',  bg: 'rgba(248,113,113,0.10)', bd: 'rgba(248,113,113,0.28)', label: 'Rejected' },
}

const BOOKING_STATUS: Record<string, { color: string; bg: string; bd: string; label: string }> = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  bd: 'rgba(245,158,11,0.28)', label: 'Pending' },
  confirmed: { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   bd: 'rgba(34,197,94,0.28)', label: 'Confirmed' },
  completed: { color: '#74cfe8', bg: 'rgba(116,207,232,0.10)',  bd: 'rgba(116,207,232,0.28)', label: 'Completed' },
  cancelled: { color: '#f87171', bg: 'rgba(248,113,113,0.10)', bd: 'rgba(248,113,113,0.28)', label: 'Cancelled' },
}

const fmtD = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
const fmtT = (d: string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sort?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin')

  // Check admin status
  const { data: me } = await supabaseAdmin
    .from('profiles')
    .select('is_admin, full_name')
    .eq('id', user.id)
    .single()

  if (!me?.is_admin) {
    return (
      <div style={{ background: '#07101e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: text }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</p>
          <p style={{ fontWeight: 700, fontSize: '18px', color: text, marginBottom: '8px' }}>Access denied</p>
          <p style={{ fontSize: '14px', color: muted }}>This page is for BoatHire24 admins only.</p>
        </div>
      </div>
    )
  }

  const params = await searchParams
  const filter = params.filter ?? 'all'
  const sort = params.sort === 'oldest' ? 'oldest' : 'newest'

  // Manual bank payouts waiting on us + failed Stripe transfers (cron retries those).
  // Empty until migration 007 is applied — the section hides itself.
  const { data: payoutsDueRaw } = await supabaseAdmin
    .from('payouts')
    .select('id, booking_id, host_id, amount, currency, method, status, error, created_at')
    .in('status', ['due', 'failed'])
    .order('created_at', { ascending: true })
    .limit(50)
  const payoutsDue = (payoutsDueRaw ?? []) as {
    id: string; booking_id: string; host_id: string; amount: number; currency: string
    method: string; status: string; error: string | null; created_at: string
  }[]
  const payoutBank = new Map<string, string>()
  if (payoutsDue.length) {
    const { data: banks } = await supabaseAdmin
      .from('payout_methods')
      .select('host_id, iban, account_number, bank_name, account_holder_name')
      .in('host_id', [...new Set(payoutsDue.map((p) => p.host_id))])
    for (const b of (banks ?? []) as any[]) {
      payoutBank.set(b.host_id, [b.account_holder_name, b.iban ?? b.account_number, b.bank_name].filter(Boolean).join(' · '))
    }
  }

  // Fetch all profiles with boat counts
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, verification_status, is_admin, is_managed_account, host_since, verification_notes, verified_at')
    .order('host_since', { ascending: false })

  const managedHostId = (profiles ?? []).find((p) => (p as { is_managed_account?: boolean }).is_managed_account)?.id ?? null

  // Fetch all auth users for emails
  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = Object.fromEntries(authUsers.map((u) => [u.id, { email: u.email, created_at: u.created_at }]))

  // Fetch boats — counts per host + an id→name/slug lookup for the bookings table
  const { data: boatCounts } = await supabaseAdmin
    .from('boats')
    .select('id, host_id, name, slug')
  const boatMap: Record<string, number> = {}
  const boatById: Record<string, { name: string; slug: string }> = {}
  for (const b of boatCounts ?? []) {
    boatMap[b.host_id] = (boatMap[b.host_id] ?? 0) + 1
    boatById[b.id] = { name: b.name, slug: b.slug }
  }

  // Fetch doc counts per user
  const { data: docCounts } = await supabaseAdmin
    .from('verification_documents')
    .select('user_id')
  const docMap: Record<string, number> = {}
  for (const d of docCounts ?? []) {
    docMap[d.user_id] = (docMap[d.user_id] ?? 0) + 1
  }

  // Which hosts have saved bank/payout details (table may not exist yet → empty set)
  const payoutSet = new Set<string>()
  const { data: payoutRows } = await supabaseAdmin.from('payout_methods').select('host_id')
  for (const p of payoutRows ?? []) payoutSet.add(p.host_id)

  // Accounts users have deleted (audit trail; table may not exist yet → empty)
  type DeletedAccount = { id: string; email: string | null; full_name: string | null; verification_status: string | null; boats_count: number | null; deleted_at: string }
  let deletedAccounts: DeletedAccount[] = []
  try {
    const { data } = await supabaseAdmin
      .from('deleted_accounts')
      .select('id, email, full_name, verification_status, boats_count, deleted_at')
      .order('deleted_at', { ascending: false })
    deletedAccounts = (data as DeletedAccount[] | null) ?? []
  } catch { deletedAccounts = [] }

  // Host website/feed links the admin has added (stored on auth user_metadata — no migration)
  const websiteMap: Record<string, string> = {}
  for (const u of authUsers ?? []) {
    const w = (u.user_metadata as { website_url?: string } | undefined)?.website_url
    if (w) websiteMap[u.id] = w
  }

  // Fetch bookings — who booked which boat
  const { data: bookingRows } = await supabaseAdmin
    .from('bookings')
    .select('id, boat_id, renter_id, start_datetime, end_datetime, guests_count, total, currency, status, created_at, special_requests')
    .order('created_at', { ascending: false })
    .limit(100)
  const profileNameById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]))
  const bookings = (bookingRows ?? []).map((b) => ({
    ...b,
    renterName: profileNameById[b.renter_id] || emailMap[b.renter_id]?.email || '—',
    renterEmail: emailMap[b.renter_id]?.email ?? '',
    boat: boatById[b.boat_id] ?? null,
  }))
  const bookingStats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').length,
    revenue: bookings.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + (b.total ?? 0), 0),
  }

  const all = (profiles ?? [])
    .filter((p) => !(p as { is_managed_account?: boolean }).is_managed_account)
    .map((p) => ({
    ...p,
    email: emailMap[p.id]?.email ?? '',
    joined: emailMap[p.id]?.created_at ?? '',
    boats: boatMap[p.id] ?? 0,
    docs: docMap[p.id] ?? 0,
    hasPayout: payoutSet.has(p.id),
    website_url: websiteMap[p.id] ?? null,
  }))

  const managedCount = managedHostId ? (boatMap[managedHostId] ?? 0) : 0

  const filtered = (filter === 'all' ? all : all.filter((p) => p.verification_status === filter))
    .slice()
    .sort((a, b) => {
      // Admins always at the top, then by joining date.
      const adminDiff = (b.is_admin ? 1 : 0) - (a.is_admin ? 1 : 0)
      if (adminDiff) return adminDiff
      const ta = a.joined ? new Date(a.joined).getTime() : 0
      const tb = b.joined ? new Date(b.joined).getTime() : 0
      return sort === 'oldest' ? ta - tb : tb - ta
    })

  const counts = {
    all: all.length,
    pending: all.filter((p) => p.verification_status === 'pending').length,
    verified: all.filter((p) => p.verification_status === 'verified').length,
    unverified: all.filter((p) => p.verification_status === 'unverified').length,
    rejected: all.filter((p) => p.verification_status === 'rejected').length,
    deleted: deletedAccounts.length,
  }

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '5px 14px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, marginBottom: '16px' }}>
            🔒 Admin Panel
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: text, margin: 0 }}>Admin Panel</h1>
            <a href="/admin/boathire24" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: '99px', background: gold, color: '#07101e', fontSize: '13px', fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 16px rgba(116,207,232,0.28)' }}>🚤 BoatHire24</a>
          </div>
          <p style={{ fontSize: '14px', color: muted, marginTop: '6px' }}>Bookings, hosts, verification &amp; payouts — all in one place.</p>
        </div>

        {/* ── Bookings ── */}
        <div style={{ marginBottom: '44px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: text, marginBottom: '4px' }}>📅 Bookings</h2>
          <p style={{ fontSize: '13px', color: muted, marginBottom: '16px' }}>Every booking on the platform — who booked, which boat, and how much.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Total bookings', value: String(bookingStats.total),                  color: gold },
              { label: 'Pending',        value: String(bookingStats.pending),                color: '#f59e0b' },
              { label: 'Confirmed/done', value: String(bookingStats.confirmed),              color: '#22c55e' },
              { label: 'Gross value',    value: `€${bookingStats.revenue.toLocaleString()}`, color: text },
            ].map((s) => (
              <div key={s.label} style={{ background: card, borderRadius: '14px', border: `1px solid ${border}`, padding: '18px' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: s.color, marginBottom: '4px' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: muted }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: card, borderRadius: '16px', border: `1px solid ${border}`, overflow: 'hidden' }}>
            {bookings.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: muted, fontSize: '14px' }}>No bookings yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '760px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['Guest', 'Boat', 'Trip', 'Guests', 'Total', 'Status', 'Booked'].map((h, i) => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: i === 3 || i === 4 ? 'right' : 'left', fontWeight: 600, color: muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b, i) => {
                      const bs = BOOKING_STATUS[b.status] ?? BOOKING_STATUS.pending
                      return (
                        <tr key={b.id} style={{ borderBottom: i < bookings.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, color: text }}>{b.renterName}</div>
                            {b.renterEmail && <div style={{ fontSize: '11px', color: muted }}>{b.renterEmail}</div>}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {b.boat
                              ? <a href={`/boats/${b.boat.slug}`} target="_blank" style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>{b.boat.name}</a>
                              : <span style={{ color: muted }}>—</span>}
                          </td>
                          <td style={{ padding: '14px 16px', color: muted, whiteSpace: 'nowrap' }}>
                            {fmtD(b.start_datetime)} · {fmtT(b.start_datetime)}–{fmtT(b.end_datetime)}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: text }}>{b.guests_count}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: text, whiteSpace: 'nowrap' }}>
                            {b.currency === 'EUR' ? '€' : b.currency + ' '}{(b.total ?? 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: bs.bg, color: bs.color, border: `1px solid ${bs.bd}`, whiteSpace: 'nowrap' }}>{bs.label}</span>
                          </td>
                          <td style={{ padding: '14px 16px', color: muted, whiteSpace: 'nowrap' }}>{fmtD(b.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Payouts needing attention ── */}
        {payoutsDue.length > 0 && (
          <div style={{ marginBottom: '44px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: text, marginBottom: '4px' }}>💸 Payouts due</h2>
            <p style={{ fontSize: '13px', color: muted, marginBottom: '16px' }}>
              Manual bank payouts (host has no Stripe) — send the transfer, then mark paid. Failed Stripe transfers retry automatically.
            </p>
            <div style={{ background: card, borderRadius: '16px', border: `1px solid ${border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Host', 'Amount', 'Bank details', 'Status', ''].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: muted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payoutsDue.map((p, i, arr) => (
                    <tr key={p.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <td style={{ padding: '12px 16px', color: text, fontWeight: 600 }}>
                        {(profiles ?? []).find((pr) => pr.id === p.host_id)?.full_name ?? '—'}
                        <div style={{ color: muted, fontSize: '11.5px', fontWeight: 400 }}>since {fmtD(p.created_at)}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: gold, fontWeight: 800 }}>
                        {p.currency === 'EUR' ? '€' : p.currency + ' '}{p.amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', color: muted, fontSize: '12px', maxWidth: '280px' }}>
                        {payoutBank.get(p.host_id) ?? 'No bank details on file — ask the host'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {p.status === 'failed' ? (
                          <span style={{ color: '#f87171', fontSize: '12px' }} title={p.error ?? ''}>Stripe failed — retrying</span>
                        ) : (
                          <span style={{ color: '#f59e0b', fontSize: '12px' }}>Awaiting bank transfer</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {p.status === 'due' && <MarkPayoutPaidButton payoutId={p.id} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Hosts & users ── */}
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: text, marginBottom: '14px' }}>👥 Hosts &amp; users</h2>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Total users',  value: counts.all,        color: gold },
            { label: 'Pending',      value: counts.pending,    color: '#f59e0b' },
            { label: 'Verified',     value: counts.verified,   color: '#22c55e' },
            { label: 'Unverified',   value: counts.unverified, color: muted },
          ].map((s) => (
            <div key={s.label} style={{ background: card, borderRadius: '14px', border: `1px solid ${border}`, padding: '18px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: s.color, marginBottom: '4px' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: muted }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { key: 'all',        label: `All (${counts.all})` },
            { key: 'pending',    label: `Pending (${counts.pending})` },
            { key: 'verified',   label: `Verified (${counts.verified})` },
            { key: 'unverified', label: `Unverified (${counts.unverified})` },
            { key: 'rejected',   label: `Rejected (${counts.rejected})` },
            { key: 'deleted',    label: `🗑 Deleted (${counts.deleted})` },
            { key: 'managed',    label: `🛥 BoatHire24 managed (${managedCount})` },
          ].map((tab) => (
            <a
              key={tab.key}
              href={`/admin?filter=${tab.key}&sort=${sort}`}
              style={{ padding: '7px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', background: filter === tab.key ? goldFaint : 'transparent', color: filter === tab.key ? gold : muted, border: `1px solid ${filter === tab.key ? goldBorder : 'rgba(255,255,255,0.10)'}` }}
            >
              {tab.label}
            </a>
          ))}
        </div>

        {/* Sort by joining date */}
        {filter !== 'deleted' && filter !== 'managed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: muted, fontWeight: 600 }}>Joined:</span>
            {[
              { key: 'newest', label: 'Newest first' },
              { key: 'oldest', label: 'Oldest first' },
            ].map((opt) => (
              <a
                key={opt.key}
                href={`/admin?filter=${filter}&sort=${opt.key}`}
                style={{ padding: '6px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', background: sort === opt.key ? goldFaint : 'transparent', color: sort === opt.key ? gold : muted, border: `1px solid ${sort === opt.key ? goldBorder : 'rgba(255,255,255,0.10)'}` }}
              >
                {opt.label}
              </a>
            ))}
          </div>
        )}

        {/* Deleted accounts table */}
        {filter === 'deleted' && (
          <div style={{ background: card, borderRadius: '16px', border: `1px solid ${border}`, overflow: 'hidden' }}>
            {deletedAccounts.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: muted, fontSize: '14px' }}>No deleted accounts yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '640px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['User', 'Email', 'Was', 'Boats had', 'Deleted on'].map((h, i, arr) => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: i === arr.length - 1 ? 'right' : 'left', fontWeight: 600, color: muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deletedAccounts.map((u, i) => {
                      const s = STATUS_STYLE[u.verification_status ?? 'unverified'] ?? STATUS_STYLE.unverified
                      return (
                        <tr key={u.id} style={{ borderBottom: i < deletedAccounts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 600, color: text }}>{u.full_name || '—'}</td>
                          <td style={{ padding: '14px 16px', color: muted }}>{u.email || '—'}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: s.bg, color: s.color, border: `1px solid ${s.bd}`, whiteSpace: 'nowrap' }}>{s.label}</span>
                          </td>
                          <td style={{ padding: '14px 16px', color: muted }}>{u.boats_count ?? 0}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: muted, whiteSpace: 'nowrap' }}>
                            {u.deleted_at ? new Date(u.deleted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* BoatHire24 managed listings */}
        {filter === 'managed' && (
          <ManagedListings hostId={managedHostId} />
        )}

        {/* Users table */}
        {filter !== 'deleted' && filter !== 'managed' && (
        <div style={{ background: card, borderRadius: '16px', border: `1px solid ${border}`, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: muted, fontSize: '14px' }}>No users in this filter.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['User', 'Email', 'Joined', 'Boats', 'Documents', 'Payout', 'Status', 'Actions'].map((h, i, arr) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: i === arr.length - 1 ? 'right' : 'left', fontWeight: 600, color: muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => {
                    const s = STATUS_STYLE[u.verification_status] ?? STATUS_STYLE.unverified
                    return (
                      <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: text }}>{u.full_name || '—'}</div>
                          {u.is_admin && <span style={{ fontSize: '10px', color: gold, fontWeight: 700 }}>ADMIN</span>}
                        </td>
                        <td style={{ padding: '14px 16px', color: muted }}>{u.email}</td>
                        <td style={{ padding: '14px 16px', color: muted, whiteSpace: 'nowrap' }}>
                          {u.joined ? new Date(u.joined).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                        </td>
                        <td style={{ padding: '14px 16px', position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <AdminBoatsButton userId={u.id} boatCount={u.boats} />
                            <a
                              href={`/host/listings/new?host=${u.id}`}
                              target="_blank"
                              title={`Add a listing for ${u.full_name ?? u.email}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '8px', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.28)', color: '#22c55e', fontSize: '11px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                            >
                              + Add
                            </a>
                            <AdminLinkButton userId={u.id} currentUrl={u.website_url} />
                            <AdminApiKeyButton userId={u.id} userName={u.full_name ?? u.email} />
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', position: 'relative' }}>
                          <AdminDocsButton userId={u.id} docCount={u.docs} />
                        </td>
                        <td style={{ padding: '14px 16px', position: 'relative' }}>
                          <AdminPayoutButton userId={u.id} hasMethod={u.hasPayout} />
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: s.bg, color: s.color, border: `1px solid ${s.bd}`, whiteSpace: 'nowrap' }}>
                            {s.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <AdminVerifyButton
                            userId={u.id}
                            currentStatus={u.verification_status}
                            isAdmin={u.is_admin}
                            userName={u.full_name ?? u.email}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
