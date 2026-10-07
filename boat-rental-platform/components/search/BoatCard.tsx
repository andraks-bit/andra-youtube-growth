'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Star, Users, Ruler, Anchor, Zap } from 'lucide-react'
import { formatPrice } from '@/lib/utils/pricing'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import type { BoatWithDetails } from '@/types/database'

interface BoatCardProps { boat: BoatWithDetails }

const TYPE_LABELS: Record<string, string> = {
  motor_yacht: 'Motor yacht',
  catamaran:   'Catamaran',
  sailing:     'Sailing boat',
  speedboat:   'Speedboat',
  fishing:     'Fishing boat',
  rib:         'RIB',
  luxury:      'Luxury yacht',
  jet_ski:     'Jet ski',
  jet_car:     'Jet car',
  gulet:       'Gulet',
}

export default function BoatCard({ boat }: BoatCardProps) {
  const hero        = boat.boat_images.find((i) => i.is_hero) ?? boat.boat_images[0]
  const lowestPrice = boat.boat_pricing.sort((a, b) => a.price - b.price)[0]
  const avgRating   = boat.avg_rating ?? 0
  const reviewCount = boat.review_count ?? 0

  return (
    <Link
      href={`/boats/${boat.slug}`}
      style={{ display: 'block', textDecoration: 'none' }}
    >
      <div
        style={{
          background: '#0c1828',
          border: '1px solid rgba(116,207,232,0.18)',
          borderRadius: '16px',
          overflow: 'hidden',
          transition: 'border-color 0.20s, box-shadow 0.20s, transform 0.20s',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'rgba(116,207,232,0.50)'
          el.style.boxShadow   = '0 20px 50px rgba(0,0,0,0.55)'
          el.style.transform   = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'rgba(116,207,232,0.18)'
          el.style.boxShadow   = 'none'
          el.style.transform   = 'translateY(0)'
        }}
      >
        {/* ── Image ── */}
        <div style={{ position: 'relative', aspectRatio: '4/3', background: '#0a1420', overflow: 'hidden' }}>
          {hero ? (
            <Image
              src={hero.storage_url}
              alt={hero.alt ?? boat.name}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Anchor style={{ width: 48, height: 48, color: 'rgba(116,207,232,0.20)' }} />
            </div>
          )}

          {/* Gradient overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,16,30,0.65) 0%, transparent 55%)' }} />

          {/* Type badge — top left */}
          <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
            <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: '#74cfe8', color: '#07101e' }}>
              {TYPE_LABELS[boat.type] ?? boat.type}
            </span>
          </div>

          {/* Instant book — top right */}
          {boat.instant_book && (
            <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: 'rgba(7,16,30,0.80)', border: '1px solid rgba(116,207,232,0.40)', color: '#74cfe8', backdropFilter: 'blur(6px)' }}>
                <Zap style={{ width: 11, height: 11 }} /> Instant
              </span>
            </div>
          )}

          {/* Rating — bottom left over gradient */}
          {reviewCount > 0 && (
            <div style={{ position: 'absolute', bottom: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star style={{ width: 12, height: 12, fill: '#74cfe8', color: '#74cfe8' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f4f4f2' }}>{avgRating.toFixed(1)}</span>
              <span style={{ fontSize: '11px', color: 'rgba(244,244,242,0.60)' }}>({reviewCount})</span>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div style={{ padding: '18px 18px 16px' }}>
          {/* Name + location */}
          <h3 style={{ fontWeight: 700, color: '#f4f4f2', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>
            {boat.name}
          </h3>
          <p style={{ fontSize: '12px', color: 'rgba(244,244,242,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {boat.locations.city}, {boat.locations.country}
          </p>

          {/* Verified Owner badge */}
          {(boat.profiles as { verification_status?: string } | null)?.verification_status === 'verified' && (
            <div style={{ marginTop: '10px' }}>
              <VerifiedBadge variant="pill" size="sm" />
            </div>
          )}

          {/* Specs row */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '12px', fontSize: '12px', color: 'rgba(244,244,242,0.50)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users style={{ width: 12, height: 12 }} />{boat.capacity_pax} guests
            </span>
            {boat.length_m && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Ruler style={{ width: 12, height: 12 }} />{boat.length_m}m
              </span>
            )}
            {boat.includes_skipper && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#74cfe8' }}>
                <Anchor style={{ width: 12, height: 12 }} />Skipper incl.
              </span>
            )}
          </div>

          {/* Price */}
          {lowestPrice && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(116,207,232,0.12)' }}>
              <span style={{ fontWeight: 800, fontSize: '20px', color: '#74cfe8' }}>
                {formatPrice(lowestPrice.price, lowestPrice.currency)}
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(244,244,242,0.40)' }}>
                / {lowestPrice.duration_hours ? `${lowestPrice.duration_hours}h` : `${(lowestPrice as any).duration_days} day`}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
