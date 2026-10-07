'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Hero background videos. #1 = the boatrentalinmarbella cruising film.
// #2 is a placeholder until the JETCAR clip is available — swap /public/video/hero-2.mp4.
const SLIDES = [
  { video: '/video/hero-1.mp4', poster: '/video/hero-1.jpg', caption: 'Marbella · Costa del Sol' },
  { video: '/video/hero-2.mp4', poster: '/video/hero-2.jpg', caption: 'Mediterranean fleet' },
]

export default function HeroSlideshow() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  const next = useCallback(() => setCurrent((c) => (c + 1) % SLIDES.length), [])
  const prev = useCallback(() => setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length), [])

  // Auto-advance to the next video.
  useEffect(() => {
    if (paused) return
    const t = setInterval(next, 7000)
    return () => clearInterval(t)
  }, [paused, next])

  // Play only the visible video; pause the others.
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === current) { v.play().catch(() => {}) } else { v.pause() }
    })
  }, [current])

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Video slides — crossfade between them */}
      {SLIDES.map((slide, i) => (
        <video
          key={slide.video}
          ref={(el) => { videoRefs.current[i] = el }}
          src={slide.video}
          poster={slide.poster}
          autoPlay={i === 0}
          muted
          loop
          playsInline
          preload="metadata"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: i === current ? 1 : 0,
            transition: 'opacity 1s ease-in-out',
          }}
        />
      ))}

      {/* Overlays */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to right, rgba(7,16,30,0.72) 0%, rgba(7,16,30,0.28) 60%, rgba(7,16,30,0.10) 100%)' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(7,16,30,0.85) 0%, rgba(7,16,30,0.10) 50%, rgba(7,16,30,0.0) 100%)' }}
      />

      {/* Arrows — desktop only. On mobile these sit mid-screen right where the hero
          copy sits, so a thumb trying to scroll/read would land on one and trigger an
          unexpected slide change (the video crossfading felt like "the page moves
          weirdly" on touch). Dots + the 7s autoplay already cover mobile navigation. */}
      <button
        onClick={prev}
        className="hidden md:flex absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center transition-all"
        style={{ background: 'rgba(7,16,30,0.55)', border: '1px solid rgba(116,207,232,0.25)', color: '#f4f4f2', zIndex: 2 }}
        aria-label="Previous"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="hidden md:flex absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center transition-all"
        style={{ background: 'rgba(7,16,30,0.55)', border: '1px solid rgba(116,207,232,0.25)', color: '#f4f4f2', zIndex: 2 }}
        aria-label="Next"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 2 }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="transition-all rounded-full"
            style={{
              width: i === current ? '24px' : '6px',
              height: '6px',
              background: i === current ? '#74cfe8' : 'rgba(244,244,242,0.35)',
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Caption */}
      <div className="absolute bottom-10 right-6 text-xs font-medium tracking-widest uppercase" style={{ color: 'rgba(244,244,242,0.40)', zIndex: 2 }}>
        {SLIDES[current].caption}
      </div>
    </div>
  )
}
