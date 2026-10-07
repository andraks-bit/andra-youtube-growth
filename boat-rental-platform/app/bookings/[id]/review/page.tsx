'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const gold = '#74cfe8'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const inputBg = 'rgba(255,255,255,0.05)'
const inputBorder = 'rgba(255,255,255,0.14)'
const goldBorder = 'rgba(116,207,232,0.28)'

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [body, setBody] = useState('')
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('bookings')
      .select('id, boat_id, boats(name, boat_images(storage_url, is_hero), profiles(id))')
      .eq('id', id)
      .single()
      .then(({ data }) => setBooking(data))
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const boat = booking?.boats as any
    const { error: err } = await supabase.from('reviews').insert({
      booking_id: id,
      reviewer_id: user.id,
      reviewee_id: boat?.profiles?.id ?? '',
      boat_id: booking?.boat_id,
      rating,
      body: body.trim() || null,
      type: 'renter_review',
    })

    if (err) { setError(err.message); setLoading(false); return }

    await supabase.from('bookings').update({ status: 'completed' }).eq('id', id)
    router.push(`/bookings/${id}`)
  }

  const boat = booking?.boats as any
  const hero = boat?.boat_images?.find((i: any) => i.is_hero) ?? boat?.boat_images?.[0]
  const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '40px 20px 80px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '8px' }}>How was your trip?</h1>
        <p style={{ fontSize: '15px', color: muted, marginBottom: '28px' }}>Your honest review helps other guests and rewards great hosts.</p>

        {boat && (
          <div style={{ display: 'flex', gap: '12px', padding: '16px', background: card, border: `1px solid ${border}`, borderRadius: '16px', marginBottom: '28px', alignItems: 'center' }}>
            {hero && <img src={hero.storage_url} alt={boat.name} style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />}
            <div style={{ fontWeight: 700, color: text, fontSize: '15px' }}>{boat.name}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Star rating */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: text, display: 'block', marginBottom: '12px' }}>
              Overall rating <span style={{ color: gold }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(star)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'transform 0.1s' }}
                >
                  <Star
                    style={{
                      width: 36, height: 36, transition: 'color 0.15s',
                      fill: star <= (hovered || rating) ? '#f59e0b' : 'transparent',
                      color: star <= (hovered || rating) ? '#f59e0b' : 'rgba(255,255,255,0.20)',
                    }}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div style={{ fontSize: '13px', color: muted, marginTop: '8px' }}>{LABELS[rating]}</div>
            )}
          </div>

          {/* Written review */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: text }}>Tell others about your experience</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What did you love? Was the boat as described? Would you recommend this host?"
              rows={5}
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: '10px', color: text, fontSize: '14px', padding: '12px 14px', outline: 'none', resize: 'vertical', transition: 'border-color 0.15s', fontFamily: 'inherit' }}
              onFocus={(e) => { e.target.style.borderColor = goldBorder }}
              onBlur={(e) => { e.target.style.borderColor = inputBorder }}
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: '#f87171', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.28)', borderRadius: '10px', padding: '12px 16px', margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !rating}
            style={{ width: '100%', padding: '14px', borderRadius: '99px', fontSize: '15px', fontWeight: 700, cursor: loading || !rating ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', border: 'none', boxShadow: '0 4px 18px rgba(116,207,232,0.25)', opacity: loading || !rating ? 0.5 : 1, transition: 'opacity 0.15s' }}
          >
            {loading ? 'Submitting…' : 'Submit review'}
          </button>
        </form>
      </div>
    </div>
  )
}
