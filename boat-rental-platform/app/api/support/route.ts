import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'BoatHire24 <info@boathire24.com>'
const SUPPORT_INBOX = 'info@boathire24.com'

// Contact form on /contact → emails the support inbox, with the visitor's address as reply-to
// so the team can answer them directly.
export async function POST(req: NextRequest) {
  const data = (await req.json().catch(() => null)) as { name?: string; email?: string; message?: string } | null
  const email = (data?.email ?? '').trim()
  const message = (data?.message ?? '').trim()
  const name = ((data?.name ?? '').trim() || 'Website visitor').slice(0, 200)

  if (!email || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Please provide a valid email and a message.' }, { status: 400 })
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const nm = esc(name)
  const em = esc(email)
  const msg = esc(message.slice(0, 5000))

  try {
    await resend.emails.send({
      from: FROM,
      to: SUPPORT_INBOX,
      replyTo: email,
      subject: `Support request — ${nm}`,
      html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.65;color:#0c1828">
        <p style="margin:0 0 12px"><strong>From:</strong> ${nm} &lt;${em}&gt;</p>
        <p style="margin:0 0 6px"><strong>Message:</strong></p>
        <p style="white-space:pre-wrap;margin:0;padding:12px 14px;background:#f5f5f3;border-radius:8px">${msg}</p>
      </div>`,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Could not send right now. Please email info@boathire24.com directly.' }, { status: 500 })
  }
}
