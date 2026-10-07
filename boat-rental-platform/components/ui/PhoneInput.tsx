'use client'

import { useMemo, useState } from 'react'

// Market-relevant country dial codes (one entry per unique code), Spain first.
const COUNTRIES: { flag: string; name: string; dial: string }[] = [
  { flag: '🇪🇸', name: 'Spain', dial: '+34' },
  { flag: '🇬🇧', name: 'United Kingdom', dial: '+44' },
  { flag: '🇮🇪', name: 'Ireland', dial: '+353' },
  { flag: '🇩🇪', name: 'Germany', dial: '+49' },
  { flag: '🇫🇷', name: 'France', dial: '+33' },
  { flag: '🇳🇱', name: 'Netherlands', dial: '+31' },
  { flag: '🇧🇪', name: 'Belgium', dial: '+32' },
  { flag: '🇮🇹', name: 'Italy', dial: '+39' },
  { flag: '🇵🇹', name: 'Portugal', dial: '+351' },
  { flag: '🇨🇭', name: 'Switzerland', dial: '+41' },
  { flag: '🇦🇹', name: 'Austria', dial: '+43' },
  { flag: '🇱🇺', name: 'Luxembourg', dial: '+352' },
  { flag: '🇸🇪', name: 'Sweden', dial: '+46' },
  { flag: '🇳🇴', name: 'Norway', dial: '+47' },
  { flag: '🇩🇰', name: 'Denmark', dial: '+45' },
  { flag: '🇫🇮', name: 'Finland', dial: '+358' },
  { flag: '🇮🇸', name: 'Iceland', dial: '+354' },
  { flag: '🇪🇪', name: 'Estonia', dial: '+372' },
  { flag: '🇱🇻', name: 'Latvia', dial: '+371' },
  { flag: '🇱🇹', name: 'Lithuania', dial: '+370' },
  { flag: '🇵🇱', name: 'Poland', dial: '+48' },
  { flag: '🇨🇿', name: 'Czechia', dial: '+420' },
  { flag: '🇸🇰', name: 'Slovakia', dial: '+421' },
  { flag: '🇭🇺', name: 'Hungary', dial: '+36' },
  { flag: '🇷🇴', name: 'Romania', dial: '+40' },
  { flag: '🇧🇬', name: 'Bulgaria', dial: '+359' },
  { flag: '🇭🇷', name: 'Croatia', dial: '+385' },
  { flag: '🇸🇮', name: 'Slovenia', dial: '+386' },
  { flag: '🇷🇸', name: 'Serbia', dial: '+381' },
  { flag: '🇬🇷', name: 'Greece', dial: '+30' },
  { flag: '🇨🇾', name: 'Cyprus', dial: '+357' },
  { flag: '🇲🇹', name: 'Malta', dial: '+356' },
  { flag: '🇷🇺', name: 'Russia', dial: '+7' },
  { flag: '🇺🇦', name: 'Ukraine', dial: '+380' },
  { flag: '🇹🇷', name: 'Turkey', dial: '+90' },
  { flag: '🇺🇸', name: 'USA / Canada', dial: '+1' },
  { flag: '🇦🇪', name: 'UAE', dial: '+971' },
  { flag: '🇸🇦', name: 'Saudi Arabia', dial: '+966' },
  { flag: '🇶🇦', name: 'Qatar', dial: '+974' },
  { flag: '🇰🇼', name: 'Kuwait', dial: '+965' },
  { flag: '🇧🇭', name: 'Bahrain', dial: '+973' },
  { flag: '🇮🇱', name: 'Israel', dial: '+972' },
  { flag: '🇱🇧', name: 'Lebanon', dial: '+961' },
  { flag: '🇪🇬', name: 'Egypt', dial: '+20' },
  { flag: '🇲🇦', name: 'Morocco', dial: '+212' },
  { flag: '🇿🇦', name: 'South Africa', dial: '+27' },
  { flag: '🇳🇬', name: 'Nigeria', dial: '+234' },
  { flag: '🇧🇷', name: 'Brazil', dial: '+55' },
  { flag: '🇲🇽', name: 'Mexico', dial: '+52' },
  { flag: '🇦🇷', name: 'Argentina', dial: '+54' },
  { flag: '🇨🇴', name: 'Colombia', dial: '+57' },
  { flag: '🇨🇱', name: 'Chile', dial: '+56' },
  { flag: '🇦🇺', name: 'Australia', dial: '+61' },
  { flag: '🇳🇿', name: 'New Zealand', dial: '+64' },
  { flag: '🇨🇳', name: 'China', dial: '+86' },
  { flag: '🇮🇳', name: 'India', dial: '+91' },
  { flag: '🇯🇵', name: 'Japan', dial: '+81' },
  { flag: '🇰🇷', name: 'South Korea', dial: '+82' },
  { flag: '🇭🇰', name: 'Hong Kong', dial: '+852' },
  { flag: '🇸🇬', name: 'Singapore', dial: '+65' },
  { flag: '🇹🇭', name: 'Thailand', dial: '+66' },
  { flag: '🇲🇾', name: 'Malaysia', dial: '+60' },
  { flag: '🇮🇩', name: 'Indonesia', dial: '+62' },
  { flag: '🇵🇭', name: 'Philippines', dial: '+63' },
  { flag: '🇻🇳', name: 'Vietnam', dial: '+84' },
]

const DEFAULT_DIAL = '+34'

const text = '#f4f4f2'

export function PhoneInput({ value, onChange, id }: { value: string; onChange: (e164: string) => void; id?: string }) {
  // Parse the stored E.164 value into (dial code from value | null, local digits).
  const parsed = useMemo(() => {
    const v = (value || '').trim()
    if (v.startsWith('+')) {
      const byLongest = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
      const match = byLongest.find((c) => v.startsWith(c.dial))
      if (match) return { dial: match.dial as string | null, local: v.slice(match.dial.length).replace(/\D/g, '') }
    }
    return { dial: null as string | null, local: v.replace(/\D/g, '') }
  }, [value])

  // Remember the chosen country even before a number is typed, so selecting a code sticks
  // (previously: picking a country with an empty number emitted '' and snapped back to +34).
  const [pickedDial, setPickedDial] = useState(DEFAULT_DIAL)
  const dial = parsed.dial ?? pickedDial
  const local = parsed.local

  function setDial(nextDial: string) {
    setPickedDial(nextDial)
    const digits = local.replace(/\D/g, '')
    onChange(digits ? `${nextDial}${digits}` : '')
  }
  function setLocal(nextLocal: string) {
    const digits = nextLocal.replace(/\D/g, '')
    onChange(digits ? `${dial}${digits}` : '')
  }

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <select
        aria-label="Country code"
        value={dial}
        onChange={(e) => setDial(e.target.value)}
        style={{
          padding: '11px 8px', borderRadius: '10px', background: '#0c1828',
          border: '1px solid rgba(255,255,255,0.14)', color: text, fontSize: '14px',
          outline: 'none', cursor: 'pointer', flexShrink: 0, maxWidth: '130px',
        }}
      >
        {COUNTRIES.map((c) => (
          <option key={c.name} value={c.dial}>{c.flag} {c.dial}</option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="600 000 000"
        style={{
          flex: 1, minWidth: 0, padding: '11px 14px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)',
          color: text, fontSize: '14px', outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
