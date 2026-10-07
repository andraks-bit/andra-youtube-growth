'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { formatPrice, calcFees } from '@/lib/utils/pricing'
import { Shield, ArrowLeft, Calendar, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PhoneInput } from '@/components/ui/PhoneInput'

const gold = '#74cfe8'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const dim = 'rgba(244,244,242,0.35)'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface BookingMeta {
  boatName: string
  boatSlug: string
  heroUrl?: string
  price: number
  currency: string
  duration: string
  date: string
  guests: number
  pricingId: string
  clientSecret?: string
  bookingId?: string
  requestToBook?: boolean
}

function CheckoutForm({ meta, onSuccess }: { meta: BookingMeta; onSuccess: (id: string) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fees = calcFees(meta.price)
  const supabase = createClient()
  const [phone, setPhone] = useState('')
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { const p = (data.user?.user_metadata as any)?.phone; if (p) setPhone(p) }) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    const { error: submitErr } = await elements.submit()
    if (submitErr) { setError(submitErr.message ?? 'Payment failed'); setLoading(false); return }

    // Save the booker's WhatsApp/phone for booking-update notifications.
    if (phone.trim()) { await supabase.auth.updateUser({ data: { phone: phone.trim() } }).catch(() => {}) }

    const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/bookings/${meta.bookingId}?confirmed=1`,
      },
      redirect: 'if_required',
    })

    if (confirmErr) {
      setError(confirmErr.message ?? 'Payment failed')
      setLoading(false)
    } else if ((paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'requires_capture') && meta.bookingId) {
      // 'requires_capture' = request-to-book hold authorized (charged only on host approval).
      if (paymentIntent?.status === 'requires_capture') {
        // Notify the host immediately (server-side, idempotent) — independent of Stripe webhook config.
        fetch(`/api/bookings/${meta.bookingId}/notify-host`, { method: 'POST' }).catch(() => {})
      }
      onSuccess(meta.bookingId)
    } else {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Total — all-inclusive */}
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px', fontWeight: 800, color: gold }}>
          <span>{meta.requestToBook ? 'Held on your card' : 'Total due today'}</span>
          <span style={{ fontSize: '22px' }}>{formatPrice(fees.total, meta.currency)}</span>
        </div>
        <p style={{ fontSize: '12px', color: dim, margin: '6px 0 0' }}>
          {meta.requestToBook
            ? "You're not charged until the host accepts your request — the hold is released automatically if they decline."
            : 'All-inclusive price · no extra fees at checkout'}
        </p>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: muted, marginBottom: '8px' }}>Mobile / WhatsApp number</label>
        <PhoneInput value={phone} onChange={setPhone} />
        <p style={{ fontSize: '11px', color: dim, marginTop: '6px' }}>Optional · we&apos;ll send booking updates here on WhatsApp.</p>
      </div>

      <PaymentElement />

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.28)', borderRadius: '10px', fontSize: '13px', color: '#f87171' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !stripe}
        style={{ width: '100%', padding: '14px', borderRadius: '99px', fontSize: '15px', fontWeight: 700, cursor: loading || !stripe ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', border: 'none', boxShadow: '0 4px 18px rgba(116,207,232,0.25)', opacity: loading || !stripe ? 0.6 : 1, transition: 'opacity 0.15s' }}
      >
        {loading
          ? (meta.requestToBook ? 'Submitting request…' : 'Processing…')
          : meta.requestToBook
            ? `Request to book — hold ${formatPrice(fees.total, meta.currency)}`
            : `Pay ${formatPrice(fees.total, meta.currency)}`}
      </button>

      <p style={{ textAlign: 'center', fontSize: '12px', color: dim, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
        <Shield style={{ width: 13, height: 13 }} /> Secured by Stripe — your card details are never stored
      </p>
    </form>
  )
}

function BookPageInner() {
  const { slug } = useParams<{ slug: string }>()
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [meta, setMeta] = useState<BookingMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push(`/login?next=/boats/${slug}/book?${params.toString()}`); return }

      const date = params.get('date') ?? ''
      const pricingId = params.get('pricing_id') ?? ''
      const guests = Number(params.get('guests') ?? 1)
      const time = params.get('time') ?? '09:00'
      const occasion = params.get('occasion') ?? ''
      const notes = params.get('notes') ?? ''

      const { data: boat } = await supabase
        .from('boats')
        .select('id, name, slug, boat_images(storage_url, is_hero), boat_pricing(*), profiles(stripe_account_id)')
        .eq('slug', slug)
        .single()

      if (!boat) { setError('Boat not found'); setLoading(false); return }

      const pricing = (boat.boat_pricing as any[]).find((p: any) => p.id === pricingId) ?? (boat.boat_pricing as any[])[0]
      if (!pricing) { setError('Pricing not found'); setLoading(false); return }

      const hero = (boat.boat_images as any[]).find((i: any) => i.is_hero) ?? (boat.boat_images as any[])[0]

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boatId: boat.id, pricingId: pricing.id, date, guests, time, occasion, notes }),
      })

      if (!res.ok) { setError('Could not create booking'); setLoading(false); return }
      const { clientSecret, bookingId, requestToBook } = await res.json()

      setMeta({
        boatName: boat.name,
        boatSlug: slug,
        heroUrl: hero?.storage_url,
        price: pricing.price,
        currency: pricing.currency ?? 'EUR',
        duration: pricing.duration_hours ? `${pricing.duration_hours}h` : `${pricing.duration_days} day(s)`,
        date,
        guests,
        pricingId: pricing.id,
        clientSecret,
        bookingId,
        requestToBook,
      })
      setLoading(false)
    }
    init()
  }, [slug, params])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#07101e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: muted }}>Loading checkout…</div>
      </div>
    )
  }

  if (error || !meta?.clientSecret) {
    return (
      <div style={{ minHeight: '100vh', background: '#07101e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f87171', marginBottom: '16px' }}>{error ?? 'Something went wrong'}</p>
          <button onClick={() => router.back()} style={{ padding: '10px 24px', borderRadius: '99px', background: card, border: `1px solid ${border}`, color: text, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07101e', color: text }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 20px 80px' }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: muted, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '24px', padding: 0 }}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back
        </button>

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '8px' }}>{meta.requestToBook ? 'Request to book' : 'Confirm your booking'}</h1>
        {meta.requestToBook && <p style={{ fontSize: '14px', color: muted, marginBottom: '24px' }}>We&apos;ll hold the amount on your card and only charge it once the host accepts (usually within 24h).</p>}

        {/* Booking summary */}
        <div style={{ display: 'flex', gap: '16px', padding: '16px', background: card, border: `1px solid ${border}`, borderRadius: '16px', marginBottom: '28px' }}>
          {meta.heroUrl && (
            <img src={meta.heroUrl} alt={meta.boatName} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontWeight: 700, color: text, fontSize: '15px' }}>{meta.boatName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '13px', color: muted }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar style={{ width: 13, height: 13 }} /> {meta.date}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users style={{ width: 13, height: 13 }} /> {meta.guests} guests</span>
            </div>
            <div style={{ fontSize: '13px', color: muted, marginTop: '4px' }}>Duration: {meta.duration}</div>
          </div>
        </div>

        {/* Stripe Elements */}
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: meta.clientSecret,
            appearance: {
              theme: 'night',
              variables: {
                colorPrimary: '#74cfe8',
                borderRadius: '8px',
                colorBackground: '#0c1828',
                colorText: '#f4f4f2',
                colorTextSecondary: 'rgba(244,244,242,0.55)',
                colorIconTab: '#f4f4f2',
              },
            },
          }}
        >
          <CheckoutForm
            meta={meta}
            onSuccess={(id) => router.push(`/bookings/${id}?${meta.requestToBook ? 'requested' : 'confirmed'}=1`)}
          />
        </Elements>
      </div>
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#07101e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(244,244,242,0.55)' }}>Loading checkout…</div>
      </div>
    }>
      <BookPageInner />
    </Suspense>
  )
}
