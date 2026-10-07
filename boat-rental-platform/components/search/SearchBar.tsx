'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, Calendar, Users } from 'lucide-react'
import LocationInput from '@/components/search/LocationInput'

const gold = '#74cfe8'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const inputBg = 'rgba(255,255,255,0.05)'
const inputBorder = 'rgba(255,255,255,0.12)'
const goldBorder = 'rgba(116,207,232,0.28)'

interface SearchBarProps {
  defaultLocation?: string
  defaultDate?: string
  defaultGuests?: number
  compact?: boolean
}

export default function SearchBar({
  defaultLocation = '',
  defaultDate = '',
  defaultGuests = 2,
  compact = false,
}: SearchBarProps) {
  const [location, setLocation] = useState(defaultLocation)
  const [date, setDate] = useState(defaultDate)
  const [guests, setGuests] = useState(defaultGuests)
  const router = useRouter()

  function handleSearch(locationOverride?: string) {
    const loc = typeof locationOverride === 'string' ? locationOverride : location
    const params = new URLSearchParams()
    if (loc) params.set('location', loc)
    if (date) params.set('date', date)
    if (guests > 1) params.set('guests', String(guests))
    router.push(`/search?${params.toString()}`)
  }

  /* ── Compact (used on /search page) ── */
  if (compact) {
    return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', border: '1px solid rgba(116,207,232,0.22)', padding: '8px 8px 8px 18px', backdropFilter: 'blur(8px)' }}>
        <MapPin style={{ width: 15, height: 15, color: gold, flexShrink: 0 }} />
        <LocationInput
          value={location}
          onChange={setLocation}
          onSelect={(v) => { setLocation(v); handleSearch(v) }}
          onEnter={() => handleSearch()}
          placeholder="Where to?"
        />
        <button
          onClick={() => handleSearch()}
          style={{ width: '36px', height: '36px', borderRadius: '99px', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(116,207,232,0.30)' }}
        >
          <Search style={{ width: 14, height: 14, color: '#07101e' }} />
        </button>
      </div>
    )
  }

  /* ── Full (used on homepage) ── */
  return (
    <div style={{ background: '#0c1828', borderRadius: '20px', border: '1px solid rgba(116,207,232,0.20)', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 8px 40px rgba(0,0,0,0.45)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {/* Location */}
        <div style={{ flex: '1 1 180px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: inputBg, border: `1px solid ${inputBorder}` }}>
          <MapPin style={{ width: 18, height: 18, color: gold, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>Where</div>
            <LocationInput
              value={location}
              onChange={setLocation}
              onSelect={(v) => { setLocation(v); handleSearch(v) }}
              onEnter={() => handleSearch()}
              placeholder="Destination, marina…"
            />
          </div>
        </div>

        {/* Date */}
        <div style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: inputBg, border: `1px solid ${inputBorder}` }}>
          <Calendar style={{ width: 18, height: 18, color: gold, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>When</div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{ fontSize: '14px', color: text, background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Guests */}
        <div style={{ flex: '1 1 120px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: inputBg, border: `1px solid ${inputBorder}` }}>
          <Users style={{ width: 18, height: 18, color: gold, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>Guests</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setGuests(Math.max(1, guests - 1))}
                style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
              >−</button>
              <span style={{ fontSize: '14px', fontWeight: 600, color: text, minWidth: '16px', textAlign: 'center' }}>{guests}</span>
              <button
                onClick={() => setGuests(guests + 1)}
                style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
              >+</button>
            </div>
          </div>
        </div>

        {/* Search button */}
        <button
          onClick={() => handleSearch()}
          style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(116,207,232,0.30)', whiteSpace: 'nowrap' }}
        >
          <Search style={{ width: 16, height: 16 }} />
          Search
        </button>
      </div>
    </div>
  )
}
