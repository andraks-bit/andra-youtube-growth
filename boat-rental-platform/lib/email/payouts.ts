// Payout notification emails (host confirmation + ops digest for manual bank payouts).
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const FROM = process.env.RESEND_FROM_EMAIL || 'BoatHire24 <info@boathire24.com>'
const OPS_INBOX = 'info@boathire24.com'

const money = (amount: number, currency: string) =>
  `${currency === 'EUR' ? '€' : currency + ' '}${amount.toLocaleString()}`

const shell = (heading: string, inner: string) => `
  <div style="background:#07101e;padding:32px 16px;font-family:-apple-system,Segoe UI,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#0c1828;border:1px solid rgba(116,207,232,0.25);border-radius:16px;overflow:hidden">
      <div style="padding:22px 26px;border-bottom:1px solid rgba(116,207,232,0.15)"><span style="color:#74cfe8;font-weight:800;font-size:18px">${heading}</span></div>
      <div style="padding:24px 26px;color:#cfd6df;font-size:14px;line-height:1.65">${inner}</div>
    </div>
  </div>`

async function emailOf(userId: string): Promise<string | null> {
  try { const { data } = await admin.auth.admin.getUserById(userId); return data.user?.email ?? null } catch { return null }
}

/** Host: your earnings for a completed trip are on the way / in your Stripe balance. */
export async function sendHostPayoutSent(opts: {
  hostId: string; boatName: string; amount: number; currency: string
  method: 'stripe_destination' | 'stripe_transfer' | 'manual_bank'
}) {
  const to = await emailOf(opts.hostId)
  if (!to) return
  const how = opts.method === 'manual_bank'
    ? 'has been sent to your bank account by transfer. Allow 1 to 3 business days for it to arrive'
    : opts.method === 'stripe_transfer'
    ? 'has been transferred to your Stripe account and will reach your bank on your usual payout schedule'
    : 'is in your Stripe balance and pays out to your bank on your usual payout schedule'
  await resend.emails.send({
    from: FROM, to,
    subject: `Payout ${money(opts.amount, opts.currency)} — ${opts.boatName}`,
    html: shell('Your payout is on its way 💸', `
      <p>The trip on <strong style="color:#f4f4f2">${opts.boatName}</strong> is complete.</p>
      <p>Your earnings of <strong style="color:#74cfe8;font-size:16px">${money(opts.amount, opts.currency)}</strong> (your 85% share) ${how}.</p>
      <p style="margin-top:14px">See details any time in your <a href="https://boathire24.com/host/earnings" style="color:#74cfe8">earnings dashboard</a>.</p>`),
  }).catch((e) => console.error('payout email failed:', e))
}

/** Ops: manual bank payouts that are due + any failed Stripe transfers. */
export async function sendOpsPayoutDigest(opts: {
  due: { hostName: string; hostEmail: string | null; boatName: string; amount: number; currency: string; iban: string | null; bankNote: string | null; bookingId: string }[]
  failed: { hostName: string; boatName: string; amount: number; currency: string; error: string; bookingId: string }[]
}) {
  if (opts.due.length === 0 && opts.failed.length === 0) return
  const dueRows = opts.due.map((d) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08)">${d.hostName}<br><span style="color:#8b94a3;font-size:12px">${d.hostEmail ?? ''}</span></td>
      <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08)">${d.boatName}</td>
      <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#74cfe8;font-weight:700">${money(d.amount, d.currency)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);font-size:12px">${d.iban ?? d.bankNote ?? 'No bank details on file'}</td>
    </tr>`).join('')
  const failedRows = opts.failed.map((f) => `
    <li><strong>${f.hostName}</strong> — ${f.boatName}, ${money(f.amount, f.currency)}: <span style="color:#f87171">${f.error}</span></li>`).join('')
  await resend.emails.send({
    from: FROM, to: OPS_INBOX,
    subject: `Payouts: ${opts.due.length} manual due${opts.failed.length ? `, ${opts.failed.length} failed` : ''}`,
    html: shell('Payouts needing attention', `
      ${opts.due.length ? `<p><strong style="color:#f4f4f2">${opts.due.length} manual bank payout${opts.due.length === 1 ? '' : 's'} due</strong> (host has no Stripe account):</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#f4f4f2">${dueRows}</table>` : ''}
      ${opts.failed.length ? `<p style="margin-top:14px"><strong style="color:#f87171">Failed Stripe transfers</strong> (will be retried next run):</p><ul style="font-size:13px">${failedRows}</ul>` : ''}
      <p style="margin-top:14px;color:#8b94a3;font-size:12px">Mark manual payouts as paid in the admin panel after sending the bank transfer.</p>`),
  }).catch((e) => console.error('ops payout digest failed:', e))
}
