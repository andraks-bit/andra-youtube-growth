'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Globe } from 'lucide-react'

const gold = '#74cfe8'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

type Loc = { city: string; country: string }

// Module-level cache so we only fetch the location list once per session.
let CACHE: Loc[] | null = null
let INFLIGHT: Promise<Loc[]> | null = null

async function loadLocations(): Promise<Loc[]> {
  if (CACHE) return CACHE
  if (INFLIGHT) return INFLIGHT
  INFLIGHT = (async () => {
    const supabase = createClient()
    const { data } = await supabase.from('locations').select('city, country').order('city')
    const seen = new Set<string>()
    const list: Loc[] = []
    for (const row of (data ?? []) as Loc[]) {
      const key = `${row.city}|${row.country}`
      if (!seen.has(key)) { seen.add(key); list.push(row) }
    }
    CACHE = list
    return list
  })()
  return INFLIGHT
}

interface Props {
  value: string
  onChange: (v: string) => void
  onSelect?: (v: string) => void
  onEnter?: () => void
  placeholder?: string
  inputStyle?: React.CSSProperties
  autoFocus?: boolean
}

// A dropdown row is either a whole country (searches every boat in it) or a
// single city. Country rows are surfaced first so "spain" → all Spanish boats.
type Suggestion =
  | { kind: 'country'; country: string; cities: number }
  | { kind: 'city'; city: string; country: string }

export default function LocationInput({ value, onChange, onSelect, onEnter, placeholder = 'Destination', inputStyle, autoFocus }: Props) {
  const [all, setAll] = useState<Loc[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadLocations().then(setAll) }, [])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Distinct countries with their city counts, derived once from the location list.
  const countries = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of all) m.set(l.country, (m.get(l.country) ?? 0) + 1)
    return [...m.entries()].map(([country, cities]) => ({ country, cities }))
  }, [all])

  const q = value.trim().toLowerCase()
  const matches: Suggestion[] = useMemo(() => {
    if (q.length === 0) return []
    const starts = (s: string) => (s.toLowerCase().startsWith(q) ? 0 : 1)

    // Country matches first — selecting one searches every boat in that country.
    const countryMatches: Suggestion[] = countries
      .filter((c) => c.country.toLowerCase().includes(q))
      .sort((a, b) => starts(a.country) - starts(b.country) || b.cities - a.cities)
      .map((c) => ({ kind: 'country', country: c.country, cities: c.cities }))

    const cityMatches: Suggestion[] = all
      .filter((l) => l.city.toLowerCase().includes(q) || l.country.toLowerCase().includes(q))
      .sort((a, b) => starts(a.city) - starts(b.city))
      .map((l) => ({ kind: 'city', city: l.city, country: l.country }))

    return [...countryMatches, ...cityMatches].slice(0, 8)
  }, [q, all, countries])

  const choose = useCallback((s: Suggestion) => {
    const v = s.kind === 'country' ? s.country : s.city
    onChange(v)
    setOpen(false)
    onSelect?.(v)
  }, [onChange, onSelect])

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0) }}
        onFocus={() => { if (value.trim()) setOpen(true) }}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) {
            if (e.key === 'Enter') onEnter?.()
            return
          }
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          else if (e.key === 'Enter') { e.preventDefault(); choose(matches[active]) }
          else if (e.key === 'Escape') setOpen(false)
        }}
        style={{ width: '100%', fontSize: '14px', color: text, background: 'transparent', border: 'none', outline: 'none', ...inputStyle }}
      />

      {open && matches.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 12px)', left: '-12px', right: '-12px', background: '#0c1828', border: '1px solid rgba(116,207,232,0.25)', borderRadius: '14px', padding: '6px', zIndex: 100, boxShadow: '0 16px 48px rgba(0,0,0,0.55)', maxHeight: '320px', overflowY: 'auto' }}>
          {matches.map((s, i) => {
            const title = s.kind === 'country' ? s.country : s.city
            const sub = s.kind === 'country'
              ? `All boats · ${s.cities} ${s.cities === 1 ? 'city' : 'cities'}`
              : s.country
            const Icon = s.kind === 'country' ? Globe : MapPin
            return (
              <button
                key={s.kind === 'country' ? `country-${s.country}` : `city-${s.city}-${s.country}`}
                onMouseDown={(e) => { e.preventDefault(); choose(s) }}
                onMouseEnter={() => setActive(i)}
                style={{ display: 'flex', alignItems: 'center', gap: '11px', width: '100%', padding: '10px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer', background: i === active ? 'rgba(116,207,232,0.12)' : 'transparent', textAlign: 'left' }}
              >
                <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(116,207,232,0.10)', border: '1px solid rgba(116,207,232,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: 14, height: 14, color: gold }} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
                  <span style={{ display: 'block', fontSize: '12px', color: muted }}>{sub}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
