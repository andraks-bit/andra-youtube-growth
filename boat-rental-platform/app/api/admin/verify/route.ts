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
  // Must be an admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, action, notes } = await req.json()
  if (!userId || !['verified', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const update: Record<string, unknown> = {
    verification_status: action,
    verification_notes: notes ?? null,
  }
  if (action === 'verified') update.verified_at = new Date().toISOString()

  await supabaseAdmin.from('profiles').update(update).eq('id', userId)

  // Get target user + profile directly by ID (avoids paginated listUsers)
  const [{ data: targetAuthData }, { data: targetProfile }] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(userId),
    supabaseAdmin.from('profiles').select('full_name').eq('id', userId).single(),
  ])

  const targetEmail = targetAuthData?.user?.email
  const firstName = (targetProfile?.full_name ?? targetEmail ?? 'there').split(' ')[0]

  let emailSent = false
  let emailError = null

  if (targetEmail) {
    try {
      const result = await resend.emails.send({
        from: `BoatHire24 <${process.env.RESEND_FROM_EMAIL}>`,
        to: targetEmail,
        subject: action === 'verified'
          ? '✅ Your BoatHire24 host account is verified'
          : 'BoatHire24 — additional documents needed',
        ...(action !== 'verified' && { replyTo: 'info@boathire24.com' }),
        html: action === 'verified'
          ? verifiedEmailHtml(firstName)
          : rejectedEmailHtml(firstName, notes),
      })
      emailSent = !!result.data?.id
      if (emailSent) {
        console.log('Email sent to', targetEmail, '— Resend ID:', result.data!.id)
      } else {
        emailError = result.error?.message ?? result.error?.name ?? 'Resend returned no ID'
        console.error('Resend error for', targetEmail, ':', JSON.stringify(result.error))
      }
    } catch (emailErr: unknown) {
      emailError = emailErr instanceof Error ? emailErr.message : String(emailErr)
      console.error('Email exception for', targetEmail, ':', emailErr)
    }
  } else {
    console.warn('No email found for userId:', userId)
  }

  return NextResponse.json({ ok: true, emailSent, emailTo: targetEmail ?? null, emailError })
}

// ─── Email templates ──────────────────────────────────────────────────────────

function emailWrapper(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BoatHire24</title></head>
<body style="margin:0;padding:0;background:#07101e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07101e;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr><td style="padding-bottom:32px;text-align:center;">
          <a href="https://boathire24.com" style="text-decoration:none;">
            <span style="font-size:24px;font-weight:800;color:#f4f4f2;">Boat<span style="color:#74cfe8;">Hire24</span></span>
          </a>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#0c1828;border-radius:16px;border:1px solid rgba(116,207,232,0.20);overflow:hidden;">
          <!-- Gold top bar -->
          <div style="height:3px;background:linear-gradient(90deg,transparent,#74cfe8,#8fdcf0,#74cfe8,transparent);"></div>
          <div style="padding:36px 40px;">
            ${content}
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:28px;text-align:center;">
          <p style="font-size:12px;color:rgba(244,244,242,0.30);margin:0;">
            © 2026 BoatHire24 Ltd · <a href="https://boathire24.com" style="color:rgba(116,207,232,0.60);text-decoration:none;">boathire24.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function verifiedEmailHtml(firstName: string) {
  return emailWrapper(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:64px;height:64px;border-radius:50%;background:rgba(34,197,94,0.12);border:2px solid rgba(34,197,94,0.35);display:inline-flex;align-items:center;justify-content:center;font-size:28px;line-height:64px;">✅</div>
    </div>
    <h1 style="font-size:24px;font-weight:800;color:#f4f4f2;text-align:center;margin:0 0 12px;">You're verified, ${firstName}!</h1>
    <p style="font-size:15px;color:rgba(244,244,242,0.65);text-align:center;line-height:1.65;margin:0 0 32px;">
      Your BoatHire24 host account has been approved. Your listings are now <strong style="color:#f4f4f2;">live and visible</strong> to guests worldwide.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      ${['Your listings are now searchable by guests', 'Accept booking requests or enable instant book', 'Receive payouts within 24h of trip completion'].map(item => `
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <span style="color:#22c55e;margin-right:10px;">✓</span>
        <span style="font-size:14px;color:rgba(244,244,242,0.70);">${item}</span>
      </td></tr>`).join('')}
    </table>

    <div style="text-align:center;">
      <a href="https://boathire24.com/host"
         style="display:inline-block;padding:14px 32px;border-radius:99px;background:linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6);color:#07101e;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 4px 18px rgba(116,207,232,0.30);">
        Go to Host Dashboard →
      </a>
    </div>

    <p style="font-size:13px;color:rgba(244,244,242,0.35);text-align:center;margin-top:24px;margin-bottom:0;">
      Questions? Reply to this email or contact <a href="mailto:info@boathire24.com" style="color:#74cfe8;text-decoration:none;">info@boathire24.com</a>
    </p>
  `)
}

function rejectedEmailHtml(firstName: string, notes?: string) {
  return emailWrapper(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:64px;height:64px;border-radius:50%;background:rgba(245,158,11,0.12);border:2px solid rgba(245,158,11,0.35);display:inline-flex;align-items:center;justify-content:center;font-size:28px;line-height:64px;">📋</div>
    </div>
    <h1 style="font-size:24px;font-weight:800;color:#f4f4f2;text-align:center;margin:0 0 12px;">Additional information needed</h1>
    <p style="font-size:15px;color:rgba(244,244,242,0.65);text-align:center;line-height:1.65;margin:0 0 28px;">
      Hi ${firstName}, we reviewed your verification documents but need a bit more information before we can approve your account.
    </p>

    ${notes ? `
    <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="font-size:12px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Note from our team</p>
      <p style="font-size:14px;color:rgba(244,244,242,0.75);line-height:1.6;margin:0;">${notes}</p>
    </div>` : ''}

    <p style="font-size:14px;color:rgba(244,244,242,0.55);line-height:1.65;margin:0 0 28px;">
      Please re-submit your documents or reply directly to this email — we're happy to help clarify what's needed.
    </p>

    <div style="text-align:center;">
      <a href="https://boathire24.com/host/verify"
         style="display:inline-block;padding:14px 32px;border-radius:99px;background:linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6);color:#07101e;font-size:15px;font-weight:700;text-decoration:none;">
        Re-submit Documents →
      </a>
    </div>

    <p style="font-size:13px;color:rgba(244,244,242,0.35);text-align:center;margin-top:24px;margin-bottom:0;">
      Reply to this email or contact <a href="mailto:info@boathire24.com" style="color:#74cfe8;text-decoration:none;">info@boathire24.com</a>
    </p>
  `)
}
