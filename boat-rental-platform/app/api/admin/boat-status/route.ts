import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { boatId, status, adminNote } = await req.json()
  if (!boatId) return NextResponse.json({ error: 'Missing boatId' }, { status: 400 })
  if (status && !['active', 'paused', 'draft'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Fetch boat + host
  const { data: boat } = await supabaseAdmin
    .from('boats').select('id, name, slug, host_id').eq('id', boatId).single()
  if (!boat) return NextResponse.json({ error: 'Boat not found' }, { status: 404 })

  // Update
  const update: Record<string, unknown> = {}
  if (status) update.status = status
  if (adminNote !== undefined) update.admin_note = adminNote || null
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  let { error } = await supabaseAdmin.from('boats').update(update).eq('id', boatId)
  // If the admin_note column doesn't exist yet (SQL migration not run), retry without it.
  if (error && error.message?.includes('admin_note')) {
    const { admin_note: _drop, ...withoutNote } = update as { admin_note?: unknown } & Record<string, unknown>
    void _drop
    if (Object.keys(withoutNote).length > 0) {
      const retry = await supabaseAdmin.from('boats').update(withoutNote).eq('id', boatId)
      error = retry.error
    } else {
      error = null
    }
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Email host on EVERY status change — active (approved), paused, or moved to drafts.
  let emailSent = false
  let emailError = null
  if (status === 'active' || status === 'paused' || status === 'draft') {
    try {
      const { data: { user: host } } = await supabaseAdmin.auth.admin.getUserById(boat.host_id)
      const { data: hostProfile } = await supabaseAdmin
        .from('profiles').select('full_name').eq('id', boat.host_id).single()
      const firstName = (hostProfile?.full_name ?? host?.email ?? 'there').split(' ')[0]

      if (host?.email) {
        let subject: string
        let html: string

        if (status === 'active') {
          subject = `✅ Your listing "${boat.name}" is now live`
          html = approvedEmailHtml({ firstName, boatName: boat.name, slug: boat.slug, boatId })
        } else {
          subject = adminNote
            ? `⚠️ Action needed: ${boat.name}`
            : `🔔 Your listing "${boat.name}" was ${status === 'draft' ? 'moved to drafts' : 'paused'}`
          html = revisionEmailHtml({ firstName, boatName: boat.name, boatId, status, note: adminNote || '' })
        }

        const result = await resend.emails.send({
          from: `BoatHire24 <${process.env.RESEND_FROM_EMAIL}>`,
          to: host.email,
          replyTo: 'info@boathire24.com',
          subject,
          html,
        })
        emailSent = !!result.data?.id
        if (!emailSent) emailError = result.error?.message ?? 'unknown'
      } else {
        emailError = 'host has no email on file'
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e)
    }
  }

  return NextResponse.json({ ok: true, emailSent, emailError })
}

function approvedEmailHtml({ firstName, boatName, slug, boatId }: {
  firstName: string; boatName: string; slug: string; boatId: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#07101e;font-family:-apple-system,sans-serif;color:#f4f4f2;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding-bottom:24px;text-align:center;"><span style="font-size:24px;font-weight:800;">Boat<span style="color:#74cfe8;">Hire24</span></span></td></tr>
<tr><td style="background:#0c1828;border:1px solid rgba(116,207,232,0.20);border-radius:16px;overflow:hidden;">
<div style="height:3px;background:linear-gradient(90deg,transparent,#22c55e,#4ade80,#22c55e,transparent);"></div>
<div style="padding:36px 40px;">
<div style="text-align:center;font-size:52px;margin-bottom:14px;">🎉</div>
<h1 style="font-size:23px;font-weight:800;text-align:center;margin:0 0 12px;">Your listing is live, ${firstName}!</h1>
<p style="text-align:center;color:rgba(244,244,242,0.65);font-size:15px;line-height:1.65;margin:0 0 28px;">
  Great news — <strong style="color:#f4f4f2;">${boatName}</strong> has been approved and is now visible to guests on BoatHire24. You can start receiving booking requests right away.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
${['Your listing appears in search and on its own page','Guests can request to book or instant-book','You receive payouts within 24h of trip completion'].map(item => `
<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);"><span style="color:#22c55e;margin-right:10px;">✓</span><span style="font-size:14px;color:rgba(244,244,242,0.78);">${item}</span></td></tr>`).join('')}
</table>
<div style="text-align:center;">
  <a href="https://boathire24.com/boats/${slug}" style="display:inline-block;padding:14px 30px;border-radius:99px;background:linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6);color:#07101e;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 4px 18px rgba(116,207,232,0.30);">View your live listing →</a>
</div>
<p style="font-size:13px;color:rgba(244,244,242,0.40);text-align:center;margin-top:20px;margin-bottom:0;">
  Manage it anytime in your <a href="https://boathire24.com/host/listings/${boatId}" style="color:#74cfe8;text-decoration:none;">host dashboard</a> · Questions? Reply to this email.
</p>
</div></td></tr>
<tr><td style="padding-top:20px;text-align:center;"><p style="font-size:11px;color:rgba(244,244,242,0.30);margin:0;">© BoatHire24 — host notification</p></td></tr>
</table></td></tr></table>
</body></html>`
}

function revisionEmailHtml({ firstName, boatName, boatId, status, note }: {
  firstName: string; boatName: string; boatId: string; status: string; note: string;
}) {
  const statusLabel = status === 'draft' ? 'moved to drafts' : 'paused'
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#07101e;font-family:-apple-system,sans-serif;color:#f4f4f2;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding-bottom:24px;text-align:center;"><span style="font-size:24px;font-weight:800;">Boat<span style="color:#74cfe8;">Hire24</span></span></td></tr>
<tr><td style="background:#0c1828;border:1px solid rgba(116,207,232,0.20);border-radius:16px;overflow:hidden;">
<div style="height:3px;background:linear-gradient(90deg,transparent,#f59e0b,#fbbf24,#f59e0b,transparent);"></div>
<div style="padding:36px 40px;">
<div style="text-align:center;font-size:48px;margin-bottom:14px;">${note ? '⚠️' : '🔔'}</div>
<h1 style="font-size:22px;font-weight:800;text-align:center;margin:0 0 12px;">${note ? 'Action needed on your listing' : 'Your listing was ' + statusLabel}</h1>
<p style="text-align:center;color:rgba(244,244,242,0.65);font-size:14px;line-height:1.65;margin:0 0 24px;">
  Hi ${firstName}, our team reviewed <strong style="color:#f4f4f2;">${boatName}</strong> and your listing has been <strong style="color:#f59e0b;">${statusLabel}</strong>${note ? ' until a few details are sorted.' : '.'}
</p>
${note ? `<div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.28);border-radius:12px;padding:18px 22px;margin-bottom:24px;">
  <p style="font-size:11px;font-weight:800;color:#fbbf24;text-transform:uppercase;letter-spacing:0.10em;margin:0 0 10px;">Note from our team</p>
  <p style="font-size:14px;color:rgba(244,244,242,0.85);line-height:1.65;margin:0;white-space:pre-line;">${note}</p>
</div>` : `<div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.28);border-radius:12px;padding:18px 22px;margin-bottom:24px;">
  <p style="font-size:14px;color:rgba(244,244,242,0.85);line-height:1.65;margin:0;">Open the listing editor to review the details and reply directly to this email if anything is unclear. We'll re-activate the listing as soon as everything's in order.</p>
</div>`}
<p style="font-size:14px;color:rgba(244,244,242,0.65);line-height:1.6;margin:0 0 24px;">
  Open the listing editor, make the changes above, then save. Once everything looks good we'll re-activate the listing — usually within a few hours.
</p>
<div style="text-align:center;">
  <a href="https://boathire24.com/host/listings/${boatId}" style="display:inline-block;padding:13px 28px;border-radius:99px;background:linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6);color:#07101e;font-size:14px;font-weight:700;text-decoration:none;">Open listing editor →</a>
</div>
<p style="font-size:12px;color:rgba(244,244,242,0.35);text-align:center;margin-top:22px;margin-bottom:0;">Reply to this email for help — info@boathire24.com</p>
</div></td></tr>
<tr><td style="padding-top:20px;text-align:center;"><p style="font-size:11px;color:rgba(244,244,242,0.30);margin:0;">© BoatHire24 — host notification</p></td></tr>
</table></td></tr></table>
</body></html>`
}
