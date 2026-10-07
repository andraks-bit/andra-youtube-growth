import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

async function sendSignupNotification(user: {
  id: string; email?: string; created_at: string;
  user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown>;
}) {
  const ageMinutes = (Date.now() - new Date(user.created_at).getTime()) / 1000 / 60
  if (ageMinutes > 5) return // not a fresh signup

  const fullName = (user.user_metadata?.full_name as string) ?? 'New user'
  const provider = (user.app_metadata?.provider as string) ?? 'email'
  const joinedAt = new Date(user.created_at).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  try {
    await resend.emails.send({
      from: `BoatHire24 <${process.env.RESEND_FROM_EMAIL}>`,
      to: 'info@boathire24.com',
      subject: `🎉 New signup: ${fullName}`,
      html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#07101e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f4f4f2;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;"><tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;">
<tr><td style="padding-bottom:24px;text-align:center;"><span style="font-size:22px;font-weight:800;color:#f4f4f2;">Boat<span style="color:#74cfe8;">Hire24</span></span></td></tr>
<tr><td style="background:#0c1828;border:1px solid rgba(116,207,232,0.20);border-radius:14px;overflow:hidden;">
<div style="height:3px;background:linear-gradient(90deg,transparent,#74cfe8,#8fdcf0,#74cfe8,transparent);"></div>
<div style="padding:32px;">
<div style="text-align:center;font-size:36px;margin-bottom:12px;">🎉</div>
<h1 style="font-size:22px;font-weight:800;color:#f4f4f2;text-align:center;margin:0 0 8px;">New user signed up</h1>
<p style="text-align:center;color:rgba(244,244,242,0.55);font-size:14px;margin:0 0 24px;">Review them in the admin panel</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border-radius:10px;padding:16px;margin-bottom:24px;">
${[
  ['Name',     fullName],
  ['Email',    user.email ?? '—'],
  ['Provider', provider === 'email' ? 'Email + Password' : provider.charAt(0).toUpperCase() + provider.slice(1)],
  ['Joined',   joinedAt],
  ['User ID',  `<code style="font-size:11px;color:rgba(244,244,242,0.50);">${user.id}</code>`],
].map(([label, value]) => `
<tr><td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="font-size:11px;color:#74cfe8;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">${label}</span></td>
<td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;"><span style="font-size:13px;color:#f4f4f2;font-weight:600;">${value}</span></td></tr>`).join('')}
</table>
<div style="text-align:center;"><a href="https://boathire24.com/admin" style="display:inline-block;padding:12px 28px;border-radius:99px;background:linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6);color:#07101e;font-size:14px;font-weight:700;text-decoration:none;">Open Admin Panel →</a></div>
</div></td></tr>
<tr><td style="padding-top:20px;text-align:center;"><p style="font-size:11px;color:rgba(244,244,242,0.30);margin:0;">© BoatHire24 — automatic signup notification</p></td></tr>
</table></td></tr></table></body></html>`,
    })
  } catch (err) {
    console.error('Signup notification failed:', err)
  }
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // Send signup notification inline (no fetch — has session data directly)
      await sendSignupNotification(data.user)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
