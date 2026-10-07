import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createConnectAccount, createConnectAccountLink } from '@/lib/stripe'
import { CheckCircle, ArrowRight } from 'lucide-react'
import PayoutBadge from '@/components/ui/PayoutBadge'
import PayoutTabs from '@/components/host/PayoutTabs'
import { type PayoutMethod } from '@/components/host/BankDetailsForm'
import { headers } from 'next/headers'

const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

interface Props {
  searchParams: Promise<{ success?: string; refresh?: string }>
}

export default async function HostOnboardingPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/host/onboarding')

  const params = await searchParams
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id, full_name')
    .eq('id', user.id)
    .single()

  // Existing manual payout method (RLS lets a host read only their own row).
  // Wrapped so the page never errors if the migration hasn't been run yet.
  let payoutMethod: PayoutMethod = null
  try {
    const { data } = await supabase
      .from('payout_methods')
      .select('account_holder_name, account_holder_type, account_holder_address, bank_country, bank_name, iban, account_number, swift_bic, currency, is_sepa, notes, updated_at')
      .eq('host_id', user.id)
      .maybeSingle()
    payoutMethod = (data as PayoutMethod) ?? null
  } catch { payoutMethod = null }

  if (params.success && profile?.stripe_account_id) {
    return (
      <div style={{ minHeight: '100vh', background: '#07101e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', color: text }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <CheckCircle style={{ width: 64, height: 64, color: '#22c55e', margin: '0 auto 20px' }} />
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '10px' }}>You&apos;re all set!</h1>
          <p style={{ fontSize: '15px', color: muted, marginBottom: '32px', lineHeight: 1.6 }}>Your Stripe account is connected. You can now receive payouts from bookings.</p>
          <Link href="/host/listings/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 28px', borderRadius: '99px', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
            Create your first listing <ArrowRight style={{ width: 16, height: 16 }} />
          </Link>
        </div>
      </div>
    )
  }

  const headersList = await headers()
  const origin = headersList.get('x-forwarded-host')
    ? `https://${headersList.get('x-forwarded-host')}`
    : `http://${headersList.get('host') ?? 'localhost:3000'}`

  let stripeAccountId = profile?.stripe_account_id
  let accountLink: { url: string } | null = null
  let stripeError: string | null = null

  try {
    if (!stripeAccountId) {
      const account = await createConnectAccount(user.email!)
      stripeAccountId = account.id
      await supabase.from('profiles').update({ stripe_account_id: stripeAccountId }).eq('id', user.id)
    }
    accountLink = await createConnectAccountLink(stripeAccountId, origin)
  } catch (e: unknown) {
    // Stripe Connect may not be enabled on the platform account yet, or another Stripe error.
    stripeError = e instanceof Error ? e.message : 'Stripe is not available right now.'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07101e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', color: text }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: text, marginBottom: '10px' }}>Set up payouts</h1>
          <p style={{ fontSize: '15px', color: muted }}>Choose how you&apos;d like to receive your earnings.</p>
        </div>

        {/* Payout method tabs: Bank account (live) · Stripe (coming soon) */}
        <div style={{ marginBottom: '20px' }}>
          <PayoutTabs payoutMethod={payoutMethod} stripeUrl={accountLink?.url ?? null} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <PayoutBadge />
        </div>
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(244,244,242,0.35)' }}>
          Powered by Stripe Connect. BoatHire24 keeps 15% of each booking as a platform fee.
        </p>
      </div>
    </div>
  )
}
