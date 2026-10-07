'use client'

import Link from 'next/link'
import Image from 'next/image'

export interface RecommendationItem {
  type: 'boat' | 'image'
  slug: string
  name: string
  imageUrl: string
  tags: string[]
  price?: number
  currency?: string
  location?: string
}

export interface RecommendationRailProps {
  items: RecommendationItem[]
  title?: string
}

function formatCompactPrice(price: number, currency = 'EUR') {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price)
}

export default function RecommendationRail({
  items,
  title = 'You may also like',
}: RecommendationRailProps) {
  if (!items || items.length === 0) return null

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold mb-5" style={{ color: '#f4f4f2' }}>
        {title}
      </h2>

      {/* Mobile: horizontal scroll; md+: CSS grid */}
      <div className="sm:hidden flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory">
        {items.map((item) => (
          <RailCard key={`${item.type}-${item.slug}`} item={item} compact />
        ))}
      </div>

      <div className="hidden sm:grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <RailCard key={`${item.type}-${item.slug}`} item={item} />
        ))}
      </div>
    </section>
  )
}

function RailCard({ item, compact }: { item: RecommendationItem; compact?: boolean }) {
  const href = item.type === 'boat' ? `/boats/${item.slug}` : `/gallery/${item.slug}`

  return (
    <Link
      href={href}
      className="group block shrink-0 snap-start"
      style={{ width: compact ? '160px' : undefined }}
    >
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          background: '#0c1828',
          border: '1px solid rgba(116,207,232,0.18)',
          borderRadius: '12px',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'rgba(116,207,232,0.45)'
          el.style.boxShadow = '0 16px 40px rgba(0,0,0,0.50)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'rgba(116,207,232,0.18)'
          el.style.boxShadow = 'none'
        }}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden" style={{ background: '#0a1420' }}>
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 160px, (max-width: 1024px) 33vw, 20vw"
          />
          {/* Gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(7,16,30,0.80) 0%, transparent 55%)',
            }}
          />
          {/* Type badge */}
          <div className="absolute top-2 left-2">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#74cfe8', color: '#07101e' }}
            >
              {item.type === 'boat' ? 'Boat' : 'Photo'}
            </span>
          </div>
          {/* Name overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-2.5">
            <p
              className="text-xs font-semibold truncate"
              style={{ color: '#f4f4f2' }}
              title={item.name}
            >
              {item.name}
            </p>
            {item.type === 'boat' && item.price != null && (
              <p className="text-[10px] mt-0.5" style={{ color: '#74cfe8' }}>
                From {formatCompactPrice(item.price, item.currency)}
              </p>
            )}
            {item.location && (
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(244,244,242,0.50)' }}>
                {item.location}
              </p>
            )}
          </div>
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="px-2.5 py-2 flex flex-wrap gap-1">
            {item.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: 'rgba(116,207,232,0.10)',
                  border: '1px solid rgba(116,207,232,0.25)',
                  color: '#74cfe8',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
