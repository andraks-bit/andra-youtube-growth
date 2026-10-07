import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

// SEPA zone — EUR bank transfers settle on the IBAN; no SWIFT/BIC required.
const SEPA = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT',
  'LV','LI','LT','LU','MT','MC','NL','NO','PL','PT','RO','SK','SI','ES','SE','CH','GB','SM','AD','VA','GI',
])

function mask(s?: string | null): string | null {
  if (!s) return null
  const t = s.replace(/\s+/g, '')
  return t.length <= 4 ? t : '••••' + t.slice(-4)
}

const SELECT =
  'account_holder_name, account_holder_type, account_holder_address, bank_country, bank_name, iban, account_number, swift_bic, currency, is_sepa, notes, updated_at'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await admin
    .from('payout_methods')
    .select(SELECT)
    .eq('host_id', user.id)
    .maybeSingle()

  // Table may not exist yet (migration not run) → behave as "no method on file".
  if (error) return NextResponse.json({ method: null })
  return NextResponse.json({ method: data ?? null })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json().catch(() => null)
  if (!b) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const name = String(b.account_holder_name ?? '').trim()
  const country = String(b.bank_country ?? '').trim().toUpperCase()
  if (!name) return NextResponse.json({ error: 'Account holder name is required.' }, { status: 400 })
  if (!country || country === 'OTHER') return NextResponse.json({ error: 'Please select the bank country.' }, { status: 400 })

  const isSepa = SEPA.has(country)
  const iban = String(b.iban ?? '').replace(/\s+/g, '').toUpperCase()
  const accountNumber = String(b.account_number ?? '').trim()
  const swift = String(b.swift_bic ?? '').replace(/\s+/g, '').toUpperCase()

  // Lenient: accept whatever account identifier the host enters (any IBAN / account
  // number). We only require *some* identifier so we don't store a blank account.
  if (!iban && !accountNumber) {
    return NextResponse.json(
      { error: isSepa ? 'Please enter your IBAN.' : 'Please enter your account number or IBAN.' },
      { status: 400 },
    )
  }

  const row = {
    host_id: user.id,
    method_type: 'bank_transfer',
    account_holder_name: name,
    account_holder_type: b.account_holder_type === 'company' ? 'company' : 'individual',
    account_holder_address: String(b.account_holder_address ?? '').trim() || null,
    bank_country: country,
    bank_name: String(b.bank_name ?? '').trim() || null,
    iban: iban || null,
    account_number: accountNumber || null,
    swift_bic: swift || null,
    currency: (String(b.currency ?? 'EUR').trim().toUpperCase() || 'EUR').slice(0, 3),
    is_sepa: isSepa,
    notes: String(b.notes ?? '').trim() || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin.from('payout_methods').upsert(row, { onConflict: 'host_id' })
  if (error) {
    const missing = /does not exist|schema cache|relation/i.test(error.message)
    return NextResponse.json(
      { error: missing ? 'Payout storage is not set up yet. Please contact info@boathire24.com.' : error.message },
      { status: 500 },
    )
  }

  // Notify admin — masked only; full numbers never travel by email.
  try {
    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).single()
    const who = profile?.full_name || user.email || user.id
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: 'info@boathire24.com',
      subject: `[Payout] ${who} added bank details`,
      html: `
        <h2>New / updated payout method</h2>
        <p><strong>Host:</strong> ${who} (${user.email})</p>
        <p><strong>Account holder:</strong> ${name} &middot; ${row.account_holder_type}</p>
        <p><strong>Bank country:</strong> ${country} ${isSepa ? '(SEPA)' : '(International / SWIFT)'}</p>
        <p><strong>${isSepa ? 'IBAN' : 'Account'}:</strong> ${mask(isSepa ? iban : accountNumber)}${swift ? ` &middot; <strong>SWIFT:</strong> ${swift}` : ''}</p>
        <p><strong>Currency:</strong> ${row.currency}</p>
        <p>Full details are in the Admin Panel → Payout column.</p>
        <p><a href="https://boathire24.com/admin" style="background:#74cfe8;color:#07101e;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:700;">Open Admin Panel →</a></p>
      `,
    })
  } catch {}

  return NextResponse.json({ ok: true })
}
