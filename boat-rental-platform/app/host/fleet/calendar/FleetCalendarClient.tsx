'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Ship, RefreshCw } from 'lucide-react'

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.10)'
const goldBorder = 'rgba(116,207,232,0.22)'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

type Boat = { id: string; name: string; status: string; type: string }
type AvailRecord = { boat_id: string; date: string; status: 'available' | 'blocked' | 'booked' }
type CellStatus = 'available' | 'blocked' | 'booked' | 'loading'

const STATUS_STYLE: Record<CellStatus, { bg: string; border: string; label: string }> = {
  available: { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)',   label: '' },
  blocked:   { bg: 'rgba(248,113,113,0.14)',  border: 'rgba(248,113,113,0.28)', label: '✕' },
  booked:    { bg: 'rgba(116,207,232,0.15)',   border: 'rgba(116,207,232,0.30)',  label: '●' },
  loading:   { bg: 'rgba(255,255,255,0.04)',  border: 'rgba(255,255,255,0.08)', label: '' },
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

interface Props { boats: Boat[] }

export default function FleetCalendarClient({ boats }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [avail, setAvail] = useState<Record<string, Record<string, CellStatus>>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const fetchAvailability = useCallback(async () => {
    if (boats.length === 0) return
    const supabase = createClient()
    const from = isoDate(year, month, 1)
    const to = isoDate(year, month, daysInMonth)

    const { data } = await supabase
      .from('availability')
      .select('boat_id, date, status')
      .in('boat_id', boats.map((b) => b.id))
      .gte('date', from)
      .lte('date', to)

    const map: Record<string, Record<string, CellStatus>> = {}
    for (const boat of boats) {
      map[boat.id] = {}
    }
    for (const row of (data ?? []) as AvailRecord[]) {
      if (map[row.boat_id]) {
        map[row.boat_id][row.date] = row.status
      }
    }
    setAvail(map)
  }, [boats, year, month, daysInMonth])

  useEffect(() => { fetchAvailability() }, [fetchAvailability])

  async function toggleCell(boatId: string, day: number) {
    const date = isoDate(year, month, day)
    const current = avail[boatId]?.[date] ?? 'available'
    if (current === 'booked') return // can't toggle booked cells

    const next: 'available' | 'blocked' = current === 'available' ? 'blocked' : 'available'
    setSaving(`${boatId}-${date}`)

    // Optimistic update
    setAvail((prev) => ({
      ...prev,
      [boatId]: { ...(prev[boatId] ?? {}), [date]: next },
    }))

    const supabase = createClient()
    const { error } = await supabase
      .from('availability')
      .upsert({ boat_id: boatId, date, status: next }, { onConflict: 'boat_id,date' })

    if (error) {
      // Revert on error
      setAvail((prev) => ({
        ...prev,
        [boatId]: { ...(prev[boatId] ?? {}), [date]: current },
      }))
    }
    setSaving(null)
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  if (boats.length === 0) {
    return (
      <div style={{ background: '#07101e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', color: text }}>
        <div style={{ textAlign: 'center' }}>
          <Ship style={{ width: 48, height: 48, color: 'rgba(116,207,232,0.18)', margin: '0 auto 16px' }} />
          <p style={{ fontWeight: 700, fontSize: '16px', color: text, marginBottom: '8px' }}>No boats yet</p>
          <p style={{ fontSize: '14px', color: muted, marginBottom: '24px' }}>Add listings first to manage their availability here.</p>
          <Link href="/host/fleet" style={{ color: gold, textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>← Fleet Manager</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Header */}
        <Link href="/host/fleet" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: muted, textDecoration: 'none', marginBottom: '28px' }}>
          <ChevronLeft style={{ width: 15, height: 15 }} /> Fleet Manager
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '6px' }}>Fleet Calendar</h1>
            <p style={{ fontSize: '14px', color: muted }}>Click any cell to block or unblock a date. Booked dates (●) are locked.</p>
          </div>

          {/* Month navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '4px' }}>
            <button onClick={prevMonth} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'none', border: 'none', color: muted, cursor: 'pointer' }}>
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>
            <span style={{ fontSize: '14px', fontWeight: 700, color: text, minWidth: '140px', textAlign: 'center', padding: '0 8px' }}>
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'none', border: 'none', color: muted, cursor: 'pointer' }}>
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
            <button onClick={fetchAvailability} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: goldFaint, border: 'none', color: gold, cursor: 'pointer', marginLeft: '4px' }}>
              <RefreshCw style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { color: 'rgba(34,197,94,0.85)', label: 'Available' },
            { color: '#f87171', label: 'Blocked' },
            { color: gold, label: 'Booked' },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: muted }}>
              <div style={{ width: 12, height: 12, borderRadius: '3px', background: l.color.includes('rgba') ? `${l.color}` : `${l.color}30`, border: `1px solid ${l.color}60` }} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: `${100 + daysInMonth * 40}px` }}>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: `180px repeat(${daysInMonth}, 40px)`, gap: '2px', marginBottom: '4px' }}>
              <div />
              {days.map((d) => {
                const dateObj = new Date(year, month, d)
                const dow = dateObj.getDay() // 0=Sun, 6=Sat
                const isWeekend = dow === 0 || dow === 6
                const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                return (
                  <div key={d} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: isWeekend ? gold : 'rgba(244,244,242,0.30)', fontWeight: 600, marginBottom: '2px' }}>
                      {DAYS_SHORT[(dow + 6) % 7]}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: isToday ? 800 : 500, color: isToday ? gold : isWeekend ? 'rgba(244,244,242,0.60)' : 'rgba(244,244,242,0.40)', background: isToday ? goldFaint : 'transparent', borderRadius: '4px', padding: '2px 0' }}>
                      {d}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Boat rows */}
            {boats.map((boat) => (
              <div key={boat.id} style={{ display: 'grid', gridTemplateColumns: `180px repeat(${daysInMonth}, 40px)`, gap: '2px', marginBottom: '2px' }}>
                {/* Boat label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '12px', overflow: 'hidden' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '8px', background: goldFaint, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Ship style={{ width: 13, height: 13, color: gold }} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{boat.name}</div>
                    <div style={{ fontSize: '10px', color: muted, textTransform: 'capitalize' }}>{boat.type.replace(/_/g, ' ')}</div>
                  </div>
                </div>

                {/* Day cells */}
                {days.map((d) => {
                  const date = isoDate(year, month, d)
                  const status: CellStatus = saving === `${boat.id}-${date}` ? 'loading' : (avail[boat.id]?.[date] ?? 'available')
                  const style = STATUS_STYLE[status]
                  const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                  return (
                    <button
                      key={d}
                      onClick={() => toggleCell(boat.id, d)}
                      disabled={status === 'booked' || status === 'loading'}
                      title={status === 'booked' ? 'Booked — cannot modify' : status === 'blocked' ? 'Blocked — click to unblock' : 'Available — click to block'}
                      style={{
                        height: '36px',
                        borderRadius: '6px',
                        background: style.bg,
                        border: `1px solid ${isToday ? gold : style.border}`,
                        cursor: status === 'booked' ? 'not-allowed' : 'pointer',
                        color: status === 'blocked' ? '#f87171' : status === 'booked' ? gold : 'transparent',
                        fontSize: '11px',
                        fontWeight: 700,
                        transition: 'all 0.1s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        outline: 'none',
                      }}
                    >
                      {style.label}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'rgba(244,244,242,0.30)', marginTop: '24px' }}>
          Changes save automatically. Blocked dates will not appear as available to guests.
        </p>
      </div>
    </div>
  )
}
