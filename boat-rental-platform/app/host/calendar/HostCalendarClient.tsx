'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, Lock, Unlock, Loader2 } from 'lucide-react'

const gold = '#74cfe8'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const dim = 'rgba(244,244,242,0.35)'
const inputBg = 'rgba(255,255,255,0.05)'
const inputBorder = 'rgba(255,255,255,0.14)'

// Calendar dates are day-level and must stay in the host's LOCAL day. Using
// toISOString() would shift to UTC, so a host at a positive offset (Europe/Med/
// Gulf/Asia) would block the day BEFORE the one they clicked.
const ymdLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parseLocalDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }

interface Boat { id: string; name: string; slug: string }
interface AvailabilityRow { date: string; status: string }
interface BookingRow { start: string; end: string; status: string }

export default function HostCalendarClient({
  boats,
  selectedBoat,
  availability,
  bookings,
}: {
  boats: Boat[]
  selectedBoat: Boat | null
  availability: AvailabilityRow[]
  bookings: BookingRow[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Date[]>([])
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const blockedDates = availability
    .filter((a) => a.status === 'blocked')
    .map((a) => parseLocalDate(a.date))

  const bookedDates: Date[] = []
  for (const b of bookings) {
    const start = new Date(b.start)
    const end = new Date(b.end)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      bookedDates.push(new Date(d))
    }
  }

  function switchBoat(boatId: string) {
    startTransition(() => {
      router.push(`/host/calendar?boat=${boatId}`)
    })
  }

  async function blockDates() {
    if (!selectedBoat || selected.length === 0) return
    setSaving(true)
    setMessage(null)
    const supabase = createClient()
    const rows = selected.map((d) => ({
      boat_id: selectedBoat.id,
      date: ymdLocal(d),
      status: 'blocked' as const,
    }))
    const { error } = await supabase.from('availability').upsert(rows, { onConflict: 'boat_id,date' })
    setSaving(false)
    if (error) {
      setMessage('Failed to block dates. Please try again.')
    } else {
      setMessage(`Blocked ${selected.length} date${selected.length > 1 ? 's' : ''}.`)
      setSelected([])
      router.refresh()
    }
  }

  async function unblockDates() {
    if (!selectedBoat || selected.length === 0) return
    setSaving(true)
    setMessage(null)
    const supabase = createClient()
    const dateStrings = selected.map(ymdLocal)
    const { error } = await supabase
      .from('availability')
      .delete()
      .eq('boat_id', selectedBoat.id)
      .in('date', dateStrings)
      .eq('status', 'blocked')
    setSaving(false)
    if (error) {
      setMessage('Failed to unblock dates. Please try again.')
    } else {
      setMessage(`Unblocked ${selected.length} date${selected.length > 1 ? 's' : ''}.`)
      setSelected([])
      router.refresh()
    }
  }

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px 80px' }}>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '6px' }}>Calendar</h1>
          <p style={{ fontSize: '15px', color: muted }}>Block or unblock dates for your listings</p>
        </div>

        {/* Boat selector */}
        {boats.length > 1 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                value={selectedBoat?.id ?? ''}
                onChange={(e) => switchBoat(e.target.value)}
                style={{ appearance: 'none', WebkitAppearance: 'none', paddingLeft: '14px', paddingRight: '36px', paddingTop: '10px', paddingBottom: '10px', background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: '10px', fontSize: '14px', fontWeight: 500, color: text, outline: 'none', cursor: 'pointer' }}
              >
                {boats.map((b) => (
                  <option key={b.id} value={b.id} style={{ background: '#0c1828', color: text }}>{b.name}</option>
                ))}
              </select>
              <ChevronDown style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: muted, pointerEvents: 'none' }} />
            </div>
          </div>
        )}

        {!selectedBoat ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: muted, fontSize: '15px' }}>
            You need to create a listing first to manage its calendar.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Calendar */}
            <div style={{ flex: '1 1 400px', minWidth: 0, background: card, border, borderRadius: '16px', padding: '16px' }}>
              <style>{`
                .rdp { --rdp-accent-color: ${gold}; --rdp-background-color: rgba(116,207,232,0.12); color: ${text}; }
                .rdp-day { color: ${text}; }
                .rdp-day_disabled { color: ${dim} !important; }
                .rdp-day-blocked button { background: rgba(245,158,11,0.20) !important; color: #f59e0b !important; border-radius: 50%; }
                .rdp-day-booked button { background: rgba(248,113,113,0.18) !important; color: #f87171 !important; border-radius: 50%; pointer-events: none; }
                .rdp-caption_label { color: ${text}; font-weight: 700; }
                .rdp-head_cell { color: ${muted}; font-weight: 600; }
                .rdp-nav_button { color: ${muted}; }
                .rdp-nav_button:hover { background: rgba(255,255,255,0.08); }
              `}</style>
              <DayPicker
                mode="multiple"
                selected={selected}
                onSelect={(dates) => setSelected(dates ?? [])}
                disabled={[{ before: new Date() }, ...bookedDates]}
                modifiers={{ blocked: blockedDates, booked: bookedDates }}
                modifiersClassNames={{ blocked: 'rdp-day-blocked', booked: 'rdp-day-booked' }}
                numberOfMonths={2}
              />

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: '12px', color: muted }}>
                {[
                  { color: gold,                    label: 'Selected' },
                  { color: '#f59e0b',               label: 'Blocked' },
                  { color: '#f87171',               label: 'Booked' },
                  { color: 'rgba(255,255,255,0.20)', label: 'Available' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions panel */}
            <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: card, border, borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ fontWeight: 700, color: text, fontSize: '14px', marginBottom: '6px' }}>Selected dates</h3>
                <p style={{ fontSize: '13px', color: muted, marginBottom: '16px' }}>
                  {selected.length === 0
                    ? 'Click dates on the calendar to select them'
                    : `${selected.length} date${selected.length > 1 ? 's' : ''} selected`}
                </p>

                {selected.length > 0 && (
                  <div style={{ marginBottom: '16px', maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selected
                      .sort((a, b) => a.getTime() - b.getTime())
                      .map((d) => (
                        <div key={d.toISOString()} style={{ fontSize: '12px', color: muted }}>
                          {d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                      ))}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={blockDates}
                    disabled={selected.length === 0 || saving}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', borderRadius: '99px', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', fontSize: '13px', fontWeight: 700, cursor: selected.length === 0 || saving ? 'not-allowed' : 'pointer', border: 'none', opacity: selected.length === 0 || saving ? 0.5 : 1 }}
                  >
                    {saving ? <Loader2 style={{ width: 14, height: 14 }} /> : <Lock style={{ width: 14, height: 14 }} />}
                    Block dates
                  </button>
                  <button
                    onClick={unblockDates}
                    disabled={selected.length === 0 || saving}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', borderRadius: '99px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: muted, fontSize: '13px', fontWeight: 600, cursor: selected.length === 0 || saving ? 'not-allowed' : 'pointer', opacity: selected.length === 0 || saving ? 0.5 : 1 }}
                  >
                    {saving ? <Loader2 style={{ width: 14, height: 14 }} /> : <Unlock style={{ width: 14, height: 14 }} />}
                    Unblock dates
                  </button>
                </div>

                {message && (
                  <p style={{ marginTop: '12px', fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>{message}</p>
                )}
              </div>

              <div style={{ background: card, border, borderRadius: '16px', padding: '16px' }}>
                <p style={{ fontWeight: 700, color: text, fontSize: '13px', marginBottom: '8px' }}>Tips</p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: muted, lineHeight: 1.5, listStyle: 'none', margin: 0, padding: 0 }}>
                  <li>• Select multiple dates then block or unblock them at once.</li>
                  <li>• Red dates are booked — you cannot change those.</li>
                  <li>• Yellow dates are blocked by you.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
