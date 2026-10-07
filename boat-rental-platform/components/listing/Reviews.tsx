import { Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Review, Profile } from '@/types/database'

interface ReviewWithReviewer extends Review {
  profiles: Pick<Profile, 'full_name' | 'avatar_url'>
}

interface ReviewsProps {
  reviews: ReviewWithReviewer[]
  avgRating: number
}

// Dark palette — matches app/boats/[slug]/page.tsx so the reviews block (which sits
// right beside the booking CTA) is legible and on-brand instead of light-on-dark.
const gold = '#74cfe8'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const dim = 'rgba(244,244,242,0.35)'
const border = 'rgba(116,207,232,0.15)'
const amber = '#fbbf24'
const trackBg = 'rgba(255,255,255,0.10)'

function RatingStars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const px = size === 'lg' ? 20 : 14
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: px, height: px, fill: i <= rating ? amber : 'transparent', color: i <= rating ? amber : 'rgba(244,244,242,0.22)' }}
        />
      ))}
    </div>
  )
}

export default function Reviews({ reviews, avgRating }: ReviewsProps) {
  if (reviews.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: muted }}>
        <Star style={{ width: 32, height: 32, margin: '0 auto 8px', color: 'rgba(244,244,242,0.25)' }} />
        <p style={{ margin: 0 }}>No reviews yet — be the first to book!</p>
      </div>
    )
  }

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', padding: '18px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}`, borderRadius: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '38px', fontWeight: 800, color: text, lineHeight: 1 }}>{avgRating.toFixed(1)}</div>
          <div style={{ margin: '6px 0 4px' }}><RatingStars rating={Math.round(avgRating)} size="lg" /></div>
          <div style={{ fontSize: '12px', color: muted }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter((r) => r.rating === star).length
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
            return (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ color: muted, width: '10px' }}>{star}</span>
                <Star style={{ width: 12, height: 12, fill: amber, color: amber }} />
                <div style={{ flex: 1, height: '6px', background: trackBg, borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: amber, borderRadius: '99px' }} />
                </div>
                <span style={{ color: dim, width: '10px' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Individual reviews */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {reviews.map((review) => (
          <div key={review.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '99px', background: gold, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#07101e', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                {review.profiles.full_name?.[0]?.toUpperCase() ?? 'G'}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: text }}>
                  {review.profiles.full_name ?? 'Guest'}
                </div>
                <div style={{ fontSize: '12px', color: muted }}>
                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                </div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <RatingStars rating={review.rating} />
              </div>
            </div>
            {review.body && (
              <p style={{ fontSize: '14px', color: 'rgba(244,244,242,0.72)', lineHeight: 1.6, margin: 0 }}>{review.body}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
