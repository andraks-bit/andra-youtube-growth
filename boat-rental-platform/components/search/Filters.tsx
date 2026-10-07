'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Zap } from 'lucide-react'

const BOAT_TYPES = [
  { value: 'all',         label: 'All types' },
  { value: 'motor_yacht', label: 'Motor yacht' },
  { value: 'catamaran',   label: 'Catamaran' },
  { value: 'sailing',     label: 'Sailing' },
  { value: 'gulet',       label: 'Gulet' },
  { value: 'speedboat',   label: 'Speedboat' },
  { value: 'luxury',      label: 'Luxury' },
  { value: 'fishing',     label: 'Fishing' },
  { value: 'rib',         label: 'RIB' },
  { value: 'jet_ski',     label: 'Jet ski' },
  { value: 'jet_car',     label: 'Jet car' },
]

const CAPACITIES = [
  { value: 'any',  label: 'Any size' },
  { value: '1',    label: '1–4' },
  { value: '5',    label: '5–8' },
  { value: '9',    label: '9–12' },
  { value: '13',   label: '13+' },
]

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc',   label: 'Price ↑' },
  { value: 'price_desc',  label: 'Price ↓' },
  { value: 'rating',      label: 'Top rated' },
]

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.12)'
const goldBorder = 'rgba(116,207,232,0.28)'

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '7px 16px',
        borderRadius: '99px',
        fontSize: '13px',
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        border: active ? `1px solid ${goldBorder}` : '1px solid rgba(255,255,255,0.10)',
        background: active ? goldFaint : 'rgba(255,255,255,0.04)',
        color: active ? gold : 'rgba(244,244,242,0.60)',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {children}
    </button>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(244,244,242,0.30)', minWidth: '56px' }}>
        {label}
      </span>
      {children}
    </div>
  )
}

export default function Filters() {
  const router = useRouter()
  const params = useSearchParams()

  function set(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    if (value === 'all' || value === 'any' || value === 'recommended') {
      p.delete(key)
    } else {
      p.set(key, value)
    }
    router.push(`/search?${p.toString()}`)
  }

  const currentType     = params.get('type')     ?? 'all'
  const currentCapacity = params.get('capacity') ?? 'any'
  const currentSort     = params.get('sort')     ?? 'recommended'
  const instantOnly     = params.get('instant')  === '1'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px 18px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Boat type */}
      <FilterGroup label="Type">
        {BOAT_TYPES.map((t) => (
          <Pill key={t.value} active={currentType === t.value} onClick={() => set('type', t.value)}>
            {t.label}
          </Pill>
        ))}
      </FilterGroup>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

      {/* Second row: capacity + sort + instant */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>

        <FilterGroup label="Guests">
          {CAPACITIES.map((c) => (
            <Pill key={c.value} active={currentCapacity === c.value} onClick={() => set('capacity', c.value)}>
              {c.label}
            </Pill>
          ))}
        </FilterGroup>

        <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

        <FilterGroup label="Sort">
          {SORT_OPTIONS.map((s) => (
            <Pill key={s.value} active={currentSort === s.value} onClick={() => set('sort', s.value)}>
              {s.label}
            </Pill>
          ))}
        </FilterGroup>

        <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

        {/* Instant book toggle */}
        <button
          onClick={() => {
            const p = new URLSearchParams(params.toString())
            if (instantOnly) p.delete('instant')
            else p.set('instant', '1')
            router.push(`/search?${p.toString()}`)
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '7px 18px',
            borderRadius: '99px',
            fontSize: '13px',
            fontWeight: instantOnly ? 700 : 500,
            cursor: 'pointer',
            border: instantOnly ? '1px solid rgba(94,219,138,0.40)' : '1px solid rgba(255,255,255,0.10)',
            background: instantOnly ? 'rgba(37,211,102,0.12)' : 'rgba(255,255,255,0.04)',
            color: instantOnly ? '#5edb8a' : 'rgba(244,244,242,0.60)',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap' as const,
          }}
        >
          <Zap style={{ width: '13px', height: '13px' }} />
          Instant book
        </button>
      </div>

    </div>
  )
}
