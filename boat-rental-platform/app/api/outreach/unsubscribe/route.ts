import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Public opt-out endpoint linked from every outreach email.
// URL: /api/outreach/unsubscribe?e=<email>&t=<token>
// token = HMAC-SHA256(email, OUTREACH_SECRET) — prevents tampering / enumeration.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function expectedToken(email: string) {
  return crypto
    .createHmac('sha256', process.env.OUTREACH_SECRET || 'change-me')
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 32)
}

function page(message: string) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <title>Unsubscribe — BoatHire24</title>
     <style>body{font-family:system-ui,sans-serif;background:#f5f9fc;color:#0b3d5c;
     display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
     .card{background:#fff;padding:2rem 2.5rem;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.08);max-width:420px;text-align:center}
     h1{font-size:1.25rem;margin:0 0 .5rem}p{color:#555;line-height:1.5}</style></head>
     <body><div class="card"><h1>BoatHire24</h1><p>${message}</p></div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )
}

export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get('e') || '').trim().toLowerCase()
  const token = req.nextUrl.searchParams.get('t') || ''

  if (!email || !token) return page('Invalid unsubscribe link.')

  // constant-time compare
  const exp = expectedToken(email)
  const ok =
    token.length === exp.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(exp))
  if (!ok) return page('This unsubscribe link is invalid or has expired.')

  const { error } = await supabaseAdmin
    .from('outreach_suppression')
    .upsert({ email, reason: 'unsubscribe' }, { onConflict: 'email' })

  if (error) return page('Something went wrong. Please email info@boathire24.com to opt out.')

  // best-effort: mark any matching lead as not interested
  await supabaseAdmin
    .from('outreach_leads')
    .update({ status: 'not_interested', updated_at: new Date().toISOString() })
    .eq('email', email)

  return page("You've been unsubscribed. We won't contact you again. Sorry for the interruption.")
}
