'use client'

import { useEffect, useRef } from 'react'

const BASE = 'https://boatrentalinmarbella.com'

type Card = {
  type: 'image' | 'video'
  file: string
  caption: string
  wildlife?: boolean
}

// Same guest media as boatrentalinmarbella.com's homepage marquee, hosted from
// that domain's CDN (CORS-open) rather than duplicated into this repo.
const CARDS: Card[] = [
  { type: 'image', file: 'birthday', caption: 'Birthday girls, best day ever 🎂' },
  { type: 'image', file: 'hen-party', caption: 'Hen party onboard 💍' },
  { type: 'video', file: 'confetti', caption: 'Confetti at sea 🎉' },
  { type: 'image', file: 'welcome-to-marbs', caption: 'Welcome to Marbs! 🔥' },
  { type: 'video', file: 'saturday-boat-day', caption: 'Saturday Boat Day' },
  { type: 'image', file: 'cocktails', caption: "Cava o'clock 🥂" },
  { type: 'image', file: 'big-group-cheer', caption: 'The whole crew' },
  { type: 'video', file: 'thank-you', caption: 'Thank you for choosing us 💛' },
  { type: 'image', file: 'enjoy-marbs', caption: 'Enjoy Marbs to the fullest' },
  { type: 'image', file: 'dolphins-jumping', caption: 'Dolphins escorted us home 🐬', wildlife: true },
  { type: 'video', file: 'dolphin-sighting', caption: 'Dolphin pod off Puerto Banús 🐬', wildlife: true },
  { type: 'image', file: 'group-cheer', caption: 'Squad on the water' },
  { type: 'image', file: 'colorful-group', caption: 'Golden hour, good company' },
  { type: 'image', file: 'seal', caption: 'Even the locals stopped by', wildlife: true },
]

function HCCard({ card }: { card: Card }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Cap concurrent decoders: only play videos actually visible in the
    // viewport. Safari has a hard limit on simultaneous video decoders and
    // silently freezes clips once it's exceeded — the marquee duplicates
    // every card for its infinite-scroll loop, so without this every video
    // (on- and off-screen) would try to autoplay at once.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.25 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="hc-card">
      {card.type === 'video' ? (
        <video ref={videoRef} muted loop playsInline preload="metadata" poster={`${BASE}/video/happy-customers/${card.file}.jpg`} aria-label={card.caption}>
          <source src={`${BASE}/video/happy-customers/${card.file}.mp4`} type="video/mp4" />
        </video>
      ) : (
        <img src={`${BASE}/img/happy-customers/${card.file}.jpg`} alt={card.caption} loading="lazy" width={220} height={391} />
      )}
      {card.wildlife && <span className="hc-badge">🐬 Wildlife</span>}
      <div className="hc-caption">{card.caption}</div>
    </div>
  )
}

export default function HappyCustomersMarquee() {
  return (
    <section aria-label="Happy customers gallery" style={{ padding: '64px 0', background: 'linear-gradient(180deg, #07101e 0%, #0a1524 100%)' }}>
      <div className="container">
        <p className="eyebrow mb-3">Real guests · real moments</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#f4f4f2' }}>
          Happy Customers <span style={{ color: '#74cfe8' }}>on the Water</span>
        </h2>
        <p style={{ color: 'rgba(244,244,242,0.60)', maxWidth: '520px' }}>
          Straight from our guests&apos; own cameras — birthdays, hen parties, and the dolphins that turn up uninvited.
        </p>
      </div>
      <div className="hc-track-wrap">
        <div className="hc-track">
          {CARDS.map((c) => <HCCard key={`a-${c.file}`} card={c} />)}
          {CARDS.map((c) => <HCCard key={`b-${c.file}`} card={c} />)}
        </div>
      </div>
      <style>{`
        .hc-track-wrap{position:relative;margin-top:32px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 60px,#000 calc(100% - 60px),transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 60px,#000 calc(100% - 60px),transparent 100%)}
        .hc-track{display:flex;gap:16px;width:max-content;animation:hc-scroll 55s linear infinite}
        .hc-track-wrap:hover .hc-track{animation-play-state:paused}
        .hc-card{position:relative;flex:0 0 auto;width:220px;aspect-ratio:9/16;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,0.45);background:#000;isolation:isolate}
        .hc-card img,.hc-card video{width:100%;height:100%;object-fit:cover;display:block}
        .hc-card::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(0,0,0,0.78) 100%);pointer-events:none}
        .hc-caption{position:absolute;left:0;right:0;bottom:0;padding:14px 14px 12px;z-index:1;color:#f4f4f2;font-size:0.86rem;font-weight:700;line-height:1.3;text-shadow:0 1px 3px rgba(0,0,0,0.5)}
        .hc-badge{position:absolute;top:10px;left:10px;z-index:1;display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:50px;background:rgba(7,16,30,0.55);backdrop-filter:blur(6px);border:1px solid rgba(116,207,232,0.35);color:#9fe0f0;font-size:0.66rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em}
        @keyframes hc-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @media (prefers-reduced-motion:reduce){.hc-track{animation:none;overflow-x:auto;scroll-snap-type:x mandatory}.hc-card{scroll-snap-align:start}}
        @media (max-width:680px){.hc-card{width:168px}}
      `}</style>
    </section>
  )
}
