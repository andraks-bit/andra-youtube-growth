import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'BoatHire24 <info@boathire24.com>'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  const name = String(body?.name ?? '').trim().slice(0, 120)
  const email = String(body?.email ?? '').trim().slice(0, 160)
  const phone = String(body?.phone ?? '').trim().slice(0, 60) || null
  const website = String(body?.website ?? '').trim().slice(0, 300) || null
  const note = String(body?.note ?? '').trim().slice(0, 2000) || null
  const source = String(body?.source ?? '').trim().slice(0, 120) || null

  if (!name) return NextResponse.json({ error: 'Please add your name.' }, { status: 400 })
  if (!email || !/.+@.+\..+/.test(email)) return NextResponse.json({ error: 'Please add a valid email.' }, { status: 400 })
  if (!phone) return NextResponse.json({ error: 'Please add a phone number.' }, { status: 400 })
  if (!website) return NextResponse.json({ error: 'Please add your website.' }, { status: 400 })

  const { data, error } = await admin
    .from('affiliate_submissions')
    .insert({ name, email, phone, website, note, source })
    .select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify ops (non-blocking).
  resend.emails.send({
    from: FROM, to: 'info@boathire24.com',
    subject: `🤝 New affiliate application: ${name}`,
    html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;background:#07101e;color:#cfd6df;padding:24px">
      <h2 style="color:#74cfe8;margin:0 0 12px">New affiliate application</h2>
      <p><strong style="color:#f4f4f2">${esc(name)}</strong></p>
      <p>✉ ${esc(email)}<br>📞 ${esc(phone)}<br>🌐 ${esc(website)}</p>
      ${note ? `<p style="color:#8b94a3">${esc(note)}</p>` : ''}
      <p style="color:#8b94a3;font-size:12px;margin-top:16px">Offer on the table: 5% commission per completed booking they refer.</p>
    </div>`,
  }).catch(() => {})

  return NextResponse.json({ ok: true, id: data.id })
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}
