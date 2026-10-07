'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Grid } from 'lucide-react'
import type { Database } from '@/types/database'

type BoatImage = Database['public']['Tables']['boat_images']['Row']

interface GalleryProps {
  images: BoatImage[]
  boatName: string
}

const cell: React.CSSProperties = {
  position: 'relative', overflow: 'hidden', border: 'none', padding: 0,
  cursor: 'pointer', background: 'rgba(255,255,255,0.04)',
}

export default function Gallery({ images, boatName }: GalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  // A boat's video lives as a row in boat_images (media_type='video'), so it
  // sits alongside photos in sort_order. Pull it out and always show it in
  // the hero position first, with the remaining photos filling the grid.
  const videoImage = images.find((i) => i.media_type === 'video' && i.video_url)
  const photos = images.filter((i) => i.id !== videoImage?.id)
  const hero = videoImage ?? photos.find((i) => i.is_hero) ?? photos[0]
  const rest = photos.filter((i) => i.id !== hero?.id).slice(0, 4)

  if (!hero) return null

  return (
    <>
      {/* Responsive grid: 4-col mosaic on desktop, full-width hero + thumb row on mobile */}
      <div className="bh-gal">
        <button
          className="bh-gal-hero"
          style={cell}
          onClick={videoImage ? undefined : () => setLightboxIndex(photos.indexOf(hero))}
        >
          {videoImage ? (
            <video
              src={videoImage.video_url!}
              controls
              playsInline
              preload="metadata"
              style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
              poster={videoImage.storage_url || photos.find(i => i.is_hero)?.storage_url}
              aria-label={boatName}
            />
          ) : (
            <Image
              src={hero.storage_url}
              alt={hero.alt ?? boatName}
              fill
              style={{ objectFit: 'cover' }}
              priority
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          )}
        </button>

        {rest.map((img, idx) => (
          <button key={img.id} className="bh-gal-thumb" style={cell} onClick={() => setLightboxIndex(photos.indexOf(img))}>
            <Image
              src={img.storage_url}
              alt={img.alt ?? `${boatName} photo ${idx + 2}`}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 640px) 25vw, 25vw"
            />
            {idx === 3 && photos.length > 5 && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#fff', fontSize: 13, fontWeight: 600 }}>
                <Grid style={{ width: 15, height: 15 }} /> +{photos.length - 5} more
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div onClick={() => setLightboxIndex(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setLightboxIndex(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 10, padding: 4 }}>
            <X style={{ width: 30, height: 30 }} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(Math.max(0, lightboxIndex - 1)) }} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 10, padding: 8 }}>
            <ChevronLeft style={{ width: 30, height: 30 }} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(Math.min(photos.length - 1, lightboxIndex + 1)) }} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 10, padding: 8 }}>
            <ChevronRight style={{ width: 30, height: 30 }} />
          </button>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: '64rem', maxHeight: '85vh', margin: '0 28px', display: 'flex', justifyContent: 'center' }}>
            <Image
              src={photos[lightboxIndex].storage_url}
              alt={photos[lightboxIndex].alt ?? boatName}
              width={1200}
              height={800}
              style={{ objectFit: 'contain', width: '100%', height: 'auto', maxHeight: '85vh', borderRadius: 12 }}
            />
          </div>
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            {lightboxIndex + 1} / {photos.length}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .bh-gal {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(2, 1fr);
          gap: 8px;
          height: 420px;
          border-radius: 16px;
          overflow: hidden;
        }
        .bh-gal-hero { grid-column: span 2; grid-row: span 2; }
        @media (max-width: 640px) {
          .bh-gal {
            grid-template-rows: 240px;
            grid-auto-rows: 76px;
            height: auto;
            gap: 6px;
            border-radius: 14px;
          }
          .bh-gal-hero { grid-column: 1 / -1; grid-row: 1; }
        }
      ` }} />
    </>
  )
}
