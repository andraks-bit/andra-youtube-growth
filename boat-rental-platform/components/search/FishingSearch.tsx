'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Users, Search, Plus, Minus } from 'lucide-react'
import LocationInput from '@/components/search/LocationInput'

const gold = '#74cfe8'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.45)'

export default function FishingSearch({ defaultLocation = '', defaultGuests = 2 }: { defaultLocation?: string; defaultGuests?: number }) {
  const [location, setLocation] = useState(defaultLocation)
  const [guests, setGuests] = useState(defaultGuests)
  const [guestsOpen, setGuestsOpen] = useState(false)
  const router = useRouter()

  function go(loc = location) {
    const p = new URLSearchParams()
    if (loc.trim()) p.set('location', loc.trim())
    if (guests > 1) p.set('guests', String(guests))
    router.push(`/fishing-trips${p.toString() ? `?${p}` : ''}`)
  }

  return (
    <div style={{ width: '100%', maxWidth: '620px' }}>
      <div className="fish-pill" style={{
        display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(116,207,232,0.28)', borderRadius: '99px', padding: '6px 6px 6px 8px',
        gap: '2px', backdropFilter: 'blur(14px)', boxShadow: '0 16px 48px rgba(0,0,0,0.40)',
      }}>
        {/* Where */}
        <div className="fish-seg" style={{ flex: 1.4, display: 'flex', alignItems: 'center', gap: '9px', padding: '10px 16px', borderRadius: '99px', minWidth: 0 }}>
          <MapPin style={{ width: 18, height: 18, color: gold, flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: muted, marginBottom: '1px' }}>Where</div>
            <LocationInput value={location} onChange={setLocation} onSelect={(v) => go(v)} onEnter={() => go()} placeholder="Destination" inputStyle={{ fontSize: '14px', fontWeight: 600, padding: 0 }} />
          </div>
        </div>

        <div className="fish-divider" style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.10)', flexShrink: 0 }} />

        {/* Who */}
        <div className="fish-seg" style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', gap: '9px', padding: '10px 16px', borderRadius: '99px', cursor: 'pointer', minWidth: 0 }}
          onClick={() => setGuestsOpen((o) => !o)}>
          <Users style={{ width: 18, height: 18, color: gold, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: muted, marginBottom: '1px' }}>Who</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: text, whiteSpace: 'nowrap' }}>{guests} guest{guests !== 1 ? 's' : ''}</div>
          </div>
          {guestsOpen && (
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 10px)', left: 0, background: '#0c1828', border: '1px solid rgba(116,207,232,0.25)', borderRadius: '14px', padding: '14px 16px', zIndex: 60, boxShadow: '0 16px 48px rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', gap: '16px', minWidth: '180px' }}>
              <span style={{ fontSize: '13px', color: text, fontWeight: 600, flex: 1 }}>Guests</span>
              <button onClick={() => setGuests((g) => Math.max(1, g - 1))} style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid rgba(116,207,232,0.30)`, background: 'transparent', color: gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus style={{ width: 14, height: 14 }} /></button>
              <span style={{ fontSize: '15px', fontWeight: 700, color: text, minWidth: '20px', textAlign: 'center' }}>{guests}</span>
              <button onClick={() => setGuests((g) => Math.min(50, g + 1))} style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid rgba(116,207,232,0.30)`, background: 'transparent', color: gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus style={{ width: 14, height: 14 }} /></button>
            </div>
          )}
        </div>

        <button onClick={() => go()} aria-label="Search fishing trips" className="fish-btn"
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '50px', padding: '0 24px', minWidth: '50px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 700 }}>
          <Search style={{ width: 20, height: 20 }} /><span className="fish-btn-text">Search</span>
        </button>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 560px) {
          .fish-pill { border-radius: 18px !important; flex-wrap: wrap; padding: 8px !important; }
          .fish-pill .fish-divider { display: none !important; }
          .fish-pill .fish-seg { flex: 1 1 100% !important; border-radius: 12px !important; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
          .fish-pill .fish-btn { flex: 1 1 100% !important; width: 100%; border-radius: 12px !important; }
        }
      ` }} />
    </div>
  )
}
