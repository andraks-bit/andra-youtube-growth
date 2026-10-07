// Reminder to a host who has boats sitting in draft — nudges them to publish.
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const FROM = process.env.RESEND_FROM_EMAIL || 'BoatHire24 <info@boathire24.com>'

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

/** Host: you have N unpublished boats still in draft — publish them to go live. */
export async function sendDraftPublishReminder(opts: {
  hostId: string; hostName: string | null; boats: { name: string; slug: string }[]
}): Promise<boolean> {
  const to = await emailOf(opts.hostId)
  if (!to) return false
  const n = opts.boats.length
  const list = opts.boats.slice(0, 12).map((b) =>
    `<li style="margin:4px 0"><strong style="color:#f4f4f2">${b.name}</strong></li>`).join('')
  const more = n > 12 ? `<li style="margin:4px 0;color:#8b95a3">…and ${n - 12} more</li>` : ''

  await resend.emails.send({
    from: FROM, to,
    subject: n === 1
      ? 'Your boat is still a draft — publish it to start getting bookings'
      : `You have ${n} boats still in draft on BoatHire24`,
    html: shell(n === 1 ? 'One step left 🚤' : `${n} boats waiting to go live 🚤`, `
      <p>Hi${opts.hostName ? ` ${opts.hostName}` : ''},</p>
      <p>You added ${n === 1 ? 'a boat' : `${n} boats`} to BoatHire24, but ${n === 1 ? "it's" : "they're"} still saved as a <strong style="color:#f4f4f2">draft</strong> and not visible to renters yet:</p>
      <ul style="padding-left:18px;margin:12px 0">${list}${more}</ul>
      <p>Publishing takes one click — review the details and hit <strong style="color:#74cfe8">Publish</strong> so travellers can find and book ${n === 1 ? 'it' : 'them'}.</p>
      <p style="margin-top:18px">
        <a href="https://boathire24.com/host/listings" style="display:inline-block;background:#74cfe8;color:#07101e;font-weight:700;text-decoration:none;padding:11px 22px;border-radius:99px">Review & publish →</a>
      </p>
      <p style="margin-top:16px;color:#8b95a3;font-size:12.5px">Need a hand? Just reply to this email.</p>`),
  }).catch((e) => { console.error('draft reminder email failed:', e); throw e })
  return true
}
