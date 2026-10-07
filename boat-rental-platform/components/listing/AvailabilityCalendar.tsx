'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface AvailabilityCalendarProps {
  bookedDates?: string[]
  blockedDates?: string[]
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  mode?: 'view' | 'select'
}

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.12)'
const goldBorder = 'rgba(116,207,232,0.30)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const card = '#0c1828'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function keyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 32, height: 32, borderRadius: '50%',
    background: disabled ? 'rgba(255,255,255,0.03)' : goldFaint,
    border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : goldBorder}`,
    color: disabled ? 'rgba(244,244,242,0.25)' : gold,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }
}

export default function AvailabilityCalendar({
  bookedDates = [], blockedDates = [], selected, onSelect, mode = 'view',
}: AvailabilityCalendarProps) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayKey = keyOf(today)
  const unavailable = new Set([...bookedDates, ...blockedDates].map((d) => keyOf(new Date(d))))
  const selectedKey = selected ? keyOf(selected) : null

  const [offset, setOffset] = useState(0)
  const base = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const months = [0, 1].map((i) => new Date(base.getFullYear(), base.getMonth() + i, 1))

  const renderDay = (date: Date | null, i: number) => {
    if (!date) return <div key={i} />
    const k = keyOf(date)
    const isPast = date < today
    const isUnavail = unavailable.has(k)
    const isToday = k === todayKey
    const isSelected = k === selectedKey
    const blocked = isPast || isUnavail
    const clickable = mode === 'select' && !blocked

    let bg = 'rgba(255,255,255,0.03)'
    let bd = 'rgba(255,255,255,0.06)'
    let col = text
    let deco: 'none' | 'line-through' = 'none'
    if (isSelected) { bg = 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)'; col = '#07101e'; bd = gold }
    else if (isPast) { bg = 'transparent'; bd = 'transparent'; col = 'rgba(244,244,242,0.18)' }
    else if (isUnavail) { bg = 'rgba(248,113,113,0.07)'; bd = 'rgba(248,113,113,0.20)'; col = 'rgba(248,113,113,0.6)'; deco = 'line-through' }
    else if (isToday) { bg = goldFaint; bd = goldBorder; col = gold }

    return (
      <button
        key={i}
        type="button"
        disabled={!clickable}
        onClick={clickable ? () => onSelect?.(date) : undefined}
        className="bh-cal-day"
        style={{ background: bg, border: `1px solid ${bd}`, color: col, textDecoration: deco, cursor: clickable ? 'pointer' : 'default', fontWeight: isToday || isSelected ? 800 : 600 }}
      >
        {date.getDate()}
      </button>
    )
  }

  const renderMonth = (m: Date, idx: number) => {
    const year = m.getFullYear()
    const month = m.getMonth()
    const startWd = new Date(year, month, 1).getDay()
    const days = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = []
    for (let i = 0; i < startWd; i++) cells.push(null)
    for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d))
    return (
      <div key={idx} className="bh-cal-month">
        <div style={{ textAlign: 'center', fontSize: '15px', fontWeight: 800, color: text, marginBottom: '12px', letterSpacing: '-0.01em' }}>
          {MONTH_NAMES[month]} {year}
        </div>
        <div className="bh-cal-grid">
          {WEEKDAYS.map((w, i) => (
            <div key={`w${i}`} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 800, color: gold, textTransform: 'uppercase', letterSpacing: '0.06em', paddingBottom: '8px', opacity: 0.85 }}>{w}</div>
          ))}
          {cells.map(renderDay)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: card, border: `1px solid ${goldBorder}`, borderRadius: '16px', padding: '18px' }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '6px' }}>
        <button type="button" aria-label="Previous month" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - 1))} style={navBtnStyle(offset === 0)}>
          <ChevronLeft style={{ width: 16, height: 16 }} />
        </button>
        <button type="button" aria-label="Next month" onClick={() => setOffset((o) => o + 1)} style={navBtnStyle(false)}>
          <ChevronRight style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <div className="bh-cal-months">
        {months.map(renderMonth)}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: muted }}>
          <span style={{ width: 16, height: 16, borderRadius: '5px', border: `1px solid ${goldBorder}`, background: 'rgba(255,255,255,0.03)' }} /> Available
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: muted, textDecoration: 'line-through' }}>
          <span style={{ width: 16, height: 16, borderRadius: '5px', border: '1px solid rgba(248,113,113,0.30)', background: 'rgba(248,113,113,0.10)' }} /> Unavailable
        </span>
        {mode === 'select' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: text, fontWeight: 600 }}>
            <span style={{ width: 16, height: 16, borderRadius: '5px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)' }} /> Selected
          </span>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .bh-cal-months { display: flex; gap: 28px; flex-wrap: wrap; justify-content: center; }
        .bh-cal-month { flex: 1 1 250px; min-width: 0; max-width: 330px; }
        .bh-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
        .bh-cal-day { aspect-ratio: 1 / 1; min-height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 9px; font-size: 14px; font-family: inherit; padding: 0; transition: background 0.12s, border-color 0.12s, color 0.12s; }
        .bh-cal-day:enabled:hover { background: ${goldFaint} !important; border-color: ${goldBorder} !important; color: ${gold} !important; }
        @media (max-width: 600px) {
          .bh-cal-months { gap: 22px; }
          .bh-cal-month { flex-basis: 100%; max-width: none; }
          .bh-cal-day { min-height: 42px; font-size: 15px; }
        }
      ` }} />
    </div>
  )
}
