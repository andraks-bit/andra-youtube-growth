'use client'

interface FounderPhotoProps {
  /** Direct Google Drive thumbnail URL: https://drive.google.com/thumbnail?id=FILE_ID&sz=w600 */
  src: string
  alt: string
  initials?: string
}

export default function FounderPhoto({ src, alt, initials = 'MS' }: FounderPhotoProps) {
  const gold = '#74cfe8'

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {/* Decorative rings */}
      <div style={{ position: 'absolute', inset: '-8px',  borderRadius: '50%', border: '2px solid rgba(116,207,232,0.30)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: '-18px', borderRadius: '50%', border: '1px solid rgba(116,207,232,0.12)', pointerEvents: 'none' }} />

      <img
        src={src}
        alt={alt}
        style={{ width: '220px', height: '220px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top center', border: '3px solid rgba(116,207,232,0.40)', display: 'block' }}
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement
          img.style.display = 'none'
          const fallback = img.nextElementSibling as HTMLElement | null
          if (fallback) fallback.style.display = 'flex'
        }}
      />
      {/* Initials fallback */}
      <div
        aria-hidden="true"
        style={{
          display: 'none',
          width: '220px', height: '220px', borderRadius: '50%',
          background: 'linear-gradient(135deg,#0e1e35,#1a3050)',
          border: '3px solid rgba(116,207,232,0.40)',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '52px', fontWeight: 800, color: gold,
        }}
      >
        {initials}
      </div>
    </div>
  )
}
