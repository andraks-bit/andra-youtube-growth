import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/payout-method?userId=xxx  → full bank details (admins only)
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('payout_methods')
    .select('account_holder_name, account_holder_type, account_holder_address, bank_country, bank_name, iban, account_number, swift_bic, routing_number, currency, is_sepa, notes, updated_at')
    .eq('host_id', userId)
    .maybeSingle()

  if (error) return NextResponse.json({ method: null })
  return NextResponse.json({ method: data ?? null })
}
