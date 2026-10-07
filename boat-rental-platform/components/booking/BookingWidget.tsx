'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Users, Zap, Shield, Clock, MessageSquare } from 'lucide-react'
import { formatPrice, calcFees } from '@/lib/utils/pricing'
import type { BoatWithDetails } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

const gold = '#74cfe8'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const goldBorder = 'rgba(116,207,232,0.22)'
const goldFaint = 'rgba(116,207,232,0.10)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const dim = 'rgba(244,244,242,0.35)'
const inputBg = 'rgba(255,255,255,0.05)'
const inputBorder = 'rgba(255,255,255,0.14)'

interface BookingWidgetProps {
  boat: BoatWithDetails
  blockedDates?: string[]
}

const TIME_SLOTS = [
  { value: '09:00', label: '9:00', sub: 'Morning' },
  { value: '11:00', label: '11:00', sub: 'Late morning' },
  { value: '13:00', label: '13:00', sub: 'Afternoon' },
  { value: '15:00', label: '15:00', sub: 'Late afternoon' },
  { value: '17:00', label: '17:00', sub: 'Sunset' },
]

const OCCASIONS = [
  { value: 'birthday',     emoji: '🎂', label: 'Birthday' },
  { value: 'bachelor',     emoji: '🥳', label: 'Bachelor/ette' },
  { value: 'anniversary',  emoji: '💞', label: 'Anniversary' },
  { value: 'proposal',     emoji: '💍', label: 'Proposal' },
  { value: 'honeymoon',    emoji: '🌅', label: 'Honeymoon' },
  { value: 'family',       emoji: '👨‍👩‍👧', label: 'Family day' },
  { value: 'corporate',    emoji: '💼', label: 'Corporate' },
  { value: 'sunset',       emoji: '🌇', label: 'Sunset cruise' },
]

export default function BookingWidget({ boat, blockedDates = [] }: BookingWidgetProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [customTime, setCustomTime] = useState(false)
  const [selectedPricingId, setSelectedPricingId] = useState<string>('')
  const [guests, setGuests] = useState(1)
  const [occasion, setOccasion] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const sortedPricing = [...boat.boat_pricing].sort((a, b) => (a.duration_hours ?? 0) - (b.duration_hours ?? 0))
  const selectedPricing = sortedPricing.find((p) => p.id === selectedPricingId) ?? sortedPricing[0]
  const fees = selectedPricing ? calcFees(selectedPricing.price) : null

  // Restore the booking selection when returning from login (or a shared link),
  // so a guest who filled the widget while logged out never loses their inputs.
  // Reads from window.location (client-only) to avoid a useSearchParams Suspense boundary.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const d = sp.get('date'); if (d) setDate(d)
    const pid = sp.get('pricing_id'); if (pid && sortedPricing.some((p) => p.id === pid)) setSelectedPricingId(pid)
    const g = sp.get('guests'); if (g && Number(g) > 0) setGuests(Number(g))
    const t = sp.get('time'); if (t) { setTime(t); if (!TIME_SLOTS.some((s) => s.value === t)) setCustomTime(true) }
    const oc = sp.get('occasion'); if (oc) setOccasion(oc)
    const nt = sp.get('notes'); if (nt) setNotes(nt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleBook() {
    // Build the selection params once — carried through login and reused for the
    // instant-book checkout redirect.
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    if (selectedPricing) params.set('pricing_id', selectedPricing.id)
    params.set('guests', String(guests))
    if (time) params.set('time', time)
    if (occasion) params.set('occasion', occasion)
    if (notes.trim()) params.set('notes', notes.trim())

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Preserve every selection through login: instant boats resume at checkout,
      // request-first boats resume on the listing with the widget pre-filled.
      const dest = boat.instant_book
        ? `/boats/${boat.slug}/book?${params.toString()}`
        : `/boats/${boat.slug}?${params.toString()}`
      router.push(`/login?next=${encodeURIComponent(dest)}`)
      return
    }
    if (!date || !selectedPricing) return
    setLoading(true)
    setError(null)

    // Request-first (non-instant boats): notify the owner now — no card. They confirm + send a pay link.
    if (!boat.instant_book) {
      const res = await fetch('/api/booking-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boatId: boat.id, pricingId: selectedPricing.id, date, time, guests }),
      })
      setLoading(false)
      if (res.ok) {
        setRequestSent(true)
        router.refresh() // clear the App Router cache so the request shows in My Trips immediately
      } else {
        setError("Couldn't send your request — please try again.")
      }
      return
    }

    // Instant book: straight to card checkout.
    router.push(`/boats/${boat.slug}/book?${params.toString()}`)
  }

  if (requestSent) {
    return (
      <div style={{ position: 'sticky', top: '96px', background: card, border: '1px solid rgba(34,197,94,0.30)', borderRadius: '20px', padding: '28px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#22c55e', marginBottom: '6px' }}>Request sent!</div>
        <p style={{ fontSize: '14px', color: muted, lineHeight: 1.6, marginBottom: '18px' }}>The owner has been notified of your {selectedPricing?.duration_hours ? `${selectedPricing.duration_hours}h ` : ''}request{date ? ` for ${date}` : ''}. They&apos;ll confirm availability and send you a payment link.</p>
        <a href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
          View it in My Trips →
        </a>
      </div>
    )
  }

  return (
    <div style={{ position: 'sticky', top: '96px', background: card, border: `1px solid ${border}`, borderRadius: '20px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.40)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          {selectedPricing && (
            <>
              <span style={{ fontSize: '24px', fontWeight: 800, color: text }}>{formatPrice(selectedPricing.price, selectedPricing.currency)}</span>
              <span style={{ fontSize: '13px', color: muted }}> / {selectedPricing.duration_hours ? `${selectedPricing.duration_hours}h` : 'day'}</span>
            </>
          )}
        </div>
        {boat.instant_book && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.30)' }}>
            <Zap style={{ width: 11, height: 11 }} /> Instant book
          </span>
        )}
      </div>

      {/* Duration selector */}
      <div style={{ marginBottom: '18px' }}>
        <label style={{ fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>Duration</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {sortedPricing.map((p) => {
            const isSelected = selectedPricing?.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPricingId(p.id)}
                style={{ padding: '9px 8px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, border: `1px solid ${isSelected ? goldBorder : inputBorder}`, background: isSelected ? goldFaint : inputBg, color: isSelected ? gold : muted, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}
              >
                {p.duration_hours ? `${p.duration_hours}h` : `${(p as any).duration_days}d`}
                <div style={{ fontSize: '11px', color: isSelected ? gold : dim, marginTop: '2px' }}>{formatPrice(p.price, p.currency)}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Date */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
          <Calendar style={{ width: 12, height: 12 }} />Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          style={{ width: '100%', height: '42px', borderRadius: '10px', border: `1px solid ${inputBorder}`, background: inputBg, padding: '0 12px', fontSize: '14px', color: text, outline: 'none', transition: 'border-color 0.15s', colorScheme: 'dark', boxSizing: 'border-box' }}
          onFocus={(e) => { e.target.style.borderColor = goldBorder }}
          onBlur={(e) => { e.target.style.borderColor = inputBorder }}
        />
      </div>

      {/* Preferred start time */}
      <div style={{ marginBottom: '18px' }}>
        <label style={{ fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
          <Clock style={{ width: 12, height: 12 }} />Preferred start time
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {TIME_SLOTS.map((slot) => {
            const active = !customTime && time === slot.value
            return (
              <button
                key={slot.value}
                onClick={() => { setTime(slot.value); setCustomTime(false) }}
                style={{ padding: '8px 6px', borderRadius: '10px', cursor: 'pointer', background: active ? goldFaint : inputBg, border: `1px solid ${active ? gold : inputBorder}`, color: active ? gold : text, transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
              >
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{slot.label}</span>
                <span style={{ fontSize: '10px', color: active ? gold : muted, opacity: 0.8 }}>{slot.sub}</span>
              </button>
            )
          })}
          <button
            onClick={() => setCustomTime(true)}
            style={{ padding: '8px 6px', borderRadius: '10px', cursor: 'pointer', background: customTime ? goldFaint : inputBg, border: `1px solid ${customTime ? gold : inputBorder}`, color: customTime ? gold : text, fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            <Clock style={{ width: 12, height: 12 }} /> Other
          </button>
        </div>
        {customTime && (
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{ marginTop: '8px', width: '100%', height: '42px', borderRadius: '10px', border: `1px solid ${goldBorder}`, background: inputBg, padding: '0 12px', fontSize: '14px', color: text, outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }}
          />
        )}
      </div>

      {/* Guests */}
      <div style={{ marginBottom: '18px' }}>
        <label style={{ fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
          <Users style={{ width: 12, height: 12 }} />Guests (max {boat.capacity_pax})
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${inputBorder}`, borderRadius: '10px', padding: '0 14px', height: '42px', background: inputBg }}>
          <button
            onClick={() => setGuests(Math.max(1, guests - 1))}
            style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 500, padding: 0, lineHeight: 1 }}
          >
            −
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: '14px', fontWeight: 600, color: text }}>{guests}</span>
          <button
            onClick={() => setGuests(Math.min(boat.capacity_pax, guests + 1))}
            style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 500, padding: 0, lineHeight: 1 }}
          >
            +
          </button>
        </div>
      </div>

      {/* Occasion (optional quick-tags) */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
          🎉 Occasion <span style={{ fontSize: '10px', fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: dim, marginLeft: '4px' }}>(optional)</span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {OCCASIONS.map((opt) => {
            const active = occasion === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setOccasion(active ? '' : opt.value)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 11px', borderRadius: '50px', cursor: 'pointer', background: active ? goldFaint : inputBg, border: `1px solid ${active ? gold : inputBorder}`, color: active ? gold : text, fontSize: '11px', fontWeight: 600, transition: 'all 0.15s' }}
              >
                <span style={{ fontSize: '13px' }}>{opt.emoji}</span>
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Special requests / Notes */}
      <div style={{ marginBottom: '18px' }}>
        {!showNotes ? (
          <button
            onClick={() => setShowNotes(true)}
            style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'transparent', border: `1px dashed ${inputBorder}`, color: muted, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' }}
          >
            <MessageSquare style={{ width: 13, height: 13 }} />
            <span>Add a note to the host</span>
            <span style={{ fontSize: '11px', color: dim }}>(optional)</span>
          </button>
        ) : (
          <>
            <label style={{ fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
              <MessageSquare style={{ width: 12, height: 12 }} /> Anything we should know?
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              autoFocus
              placeholder="E.g. We're celebrating a 40th birthday — would love a chilled bottle of cava on arrival. Bringing 2 kids (ages 5, 8). Vegetarian lunch please. Music: chill house. Pickup from Marbella Marina if possible."
              style={{ width: '100%', minHeight: '90px', padding: '12px 14px', borderRadius: '10px', background: inputBg, border: `1px solid ${inputBorder}`, color: text, fontSize: '13px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.55, fontFamily: 'inherit', transition: 'border-color 0.15s' }}
              onFocus={(e) => { e.target.style.borderColor = goldBorder }}
              onBlur={(e) => { e.target.style.borderColor = inputBorder }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <p style={{ fontSize: '11px', color: dim, margin: 0 }}>
                Dietary needs · music · pickup time · special celebrations
              </p>
              <span style={{ fontSize: '10px', color: notes.length > 450 ? '#f59e0b' : dim }}>
                {notes.length}/500
              </span>
            </div>
          </>
        )}
      </div>

      {/* Total — all-inclusive price (commission already included) */}
      {fees && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: 800, color: gold }}>
            <span>Total</span>
            <span style={{ fontSize: '18px' }}>{formatPrice(fees.total, selectedPricing?.currency)}</span>
          </div>
          <div style={{ fontSize: '11px', color: dim, marginTop: '4px' }}>
            All-inclusive · no extra fees at checkout
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: '12px', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.28)', borderRadius: '10px', fontSize: '13px', color: '#f87171' }}>{error}</div>
      )}

      <button
        onClick={handleBook}
        disabled={loading || !date}
        style={{ width: '100%', padding: '14px', borderRadius: '99px', fontSize: '15px', fontWeight: 700, cursor: loading || !date ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', border: 'none', boxShadow: '0 4px 18px rgba(116,207,232,0.25)', opacity: loading || !date ? 0.6 : 1, transition: 'opacity 0.15s' }}
      >
        {loading ? 'Loading...' : boat.instant_book ? 'Book now' : 'Request to book'}
      </button>

      <p style={{ textAlign: 'center', fontSize: '12px', color: dim, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '10px' }}>
        <Shield style={{ width: 12, height: 12 }} />
        {boat.instant_book ? "You won't be charged yet" : 'No charge until confirmed'}
      </p>

      {/* Inclusions */}
      {(boat.includes_skipper || boat.includes_fuel || boat.includes_drinks || boat.boat_features.length > 0) && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {boat.includes_skipper && <div style={{ fontSize: '12px', color: muted, display: 'flex', alignItems: 'center', gap: '6px' }}>✓ Licensed skipper included</div>}
          {boat.includes_fuel && <div style={{ fontSize: '12px', color: muted, display: 'flex', alignItems: 'center', gap: '6px' }}>✓ Fuel included</div>}
          {boat.includes_drinks && <div style={{ fontSize: '12px', color: muted, display: 'flex', alignItems: 'center', gap: '6px' }}>✓ Drinks & snacks included</div>}
          {boat.boat_features.slice(0, 2).map((f) => (
            <div key={f.id} style={{ fontSize: '12px', color: muted, display: 'flex', alignItems: 'center', gap: '6px' }}>✓ {f.feature}</div>
          ))}
        </div>
      )}
    </div>
  )
}
