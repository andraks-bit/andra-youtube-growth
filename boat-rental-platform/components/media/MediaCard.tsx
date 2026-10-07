'use client'

import Link from 'next/link'
import Image from 'next/image'

export interface MediaCardProps {
  slug: string
  storageUrl: string
  title: string
  tags: string[]
  boatName: string
  boatSlug: string
  alt?: string
}

export default function MediaCard({
  slug,
  storageUrl,
  title,
  tags,
  boatName,
  boatSlug,
  alt,
}: MediaCardProps) {
  const visibleTags = tags.slice(0, 3)

  return (
    <Link href={`/gallery/${slug}`} className="group block">
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          background: '#0c1828',
          border: '1px solid rgba(116,207,232,0.18)',
          borderRadius: '14px',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'rgba(116,207,232,0.55)'
          el.style.boxShadow = '0 0 0 1px rgba(116,207,232,0.30), 0 20px 48px rgba(0,0,0,0.55)'
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
            src={storageUrl}
            alt={alt ?? title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Bottom gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(7,16,30,0.85) 0%, rgba(7,16,30,0.30) 45%, transparent 70%)',
            }}
          />
          {/* Title + tags overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p
              className="text-sm font-semibold truncate mb-1.5"
              style={{ color: '#f4f4f2' }}
              title={title}
            >
              {title}
            </p>
            {visibleTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {visibleTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(7,16,30,0.75)',
                      border: '1px solid rgba(116,207,232,0.35)',
                      color: '#74cfe8',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
