import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createExpressLoginLink } from '@/lib/stripe'

// Sends the host into their Stripe Express dashboard to view payouts and add / manage their
// bank account. If they haven't started onboarding (no connected account, or it isn't ready
// for a login link yet) we send them to onboarding to add their bank first.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login?next=/host/earnings', req.url))

  const { data: profile } = await supabase.from('profiles').select('stripe_account_id').eq('id', user.id).single()
  const acct = (profile as { stripe_account_id?: string | null } | null)?.stripe_account_id
  if (!acct) return NextResponse.redirect(new URL('/host/onboarding', req.url), 303)

  try {
    const link = await createExpressLoginLink(acct)
    return NextResponse.redirect(link.url, 303)
  } catch {
    // Account exists but isn't fully onboarded → resume onboarding to finish adding the bank.
    return NextResponse.redirect(new URL('/host/onboarding', req.url), 303)
  }
}
