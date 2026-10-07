'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, X } from 'lucide-react'

const gold = '#74cfe8'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const inputBg = 'rgba(255,255,255,0.05)'
const inputBorder = 'rgba(255,255,255,0.14)'

const inputStyle: React.CSSProperties = {
  width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px',
  background: inputBg, border: `1px solid ${inputBorder}`, color: text,
  fontSize: '14px', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box',
}

// Collapsible "Modify booking" control on the booking detail page. Lets the guest pick a new
// date / start time / duration for a not-yet-confirmed (pending) trip; the API re-notifies the host.
export default function ModifyBookingForm({ bookingId, currentDate, currentTime, currentHours }: {
  bookingId: string
  currentDate: string
  currentTime: string
  currentHours: number
}) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(currentDate)
  const [time, setTime] = useState(currentTime || '09:00')
  const [hours, setHours] = useState(currentHours ? String(currentHours) : '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px 24px', borderRadius: '99px', background: 'transparent', border: '1px solid rgba(116,207,232,0.30)', color: gold, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
      >
        <CalendarClock style={{ width: 16, height: 16 }} /> Modify booking
      </button>
    )
  }

  async function save() {
    if (saving || !date) return
    setSaving(true); setErr(null)
    const res = await fetch(`/api/bookings/${bookingId}/modify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, time, hours: hours ? Number(hours) : undefined }),
    }).catch(() => null)
    setSaving(false)
    if (res && res.ok) { setOpen(false); router.refresh() }
    else {
      const d = res ? await res.json().catch(() => null) : null
      setErr(d?.error || 'Could not update — please try again.')
    }
  }

  return (
    <div style={{ background: '#0c1828', border: '1px solid rgba(116,207,232,0.25)', borderRadius: '16px', padding: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: text }}>Modify booking</div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', padding: 0, display: 'flex' }} aria-label="Close">
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', color: muted, display: 'block', marginBottom: '5px' }}>New date</label>
          <input type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: muted, display: 'block', marginBottom: '5px' }}>Start time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: muted, display: 'block', marginBottom: '5px' }}>Duration (hrs)</label>
            <input type="number" min={1} max={12} value={hours} placeholder="Hours" onChange={(e) => setHours(e.target.value)} style={inputStyle} />
          </div>
        </div>
        {err && <div style={{ fontSize: '13px', color: '#f87171' }}>{err}</div>}
        <button
          onClick={save}
          disabled={saving || !date}
          style={{ width: '100%', padding: '12px', borderRadius: '99px', border: 'none', background: (saving || !date) ? 'rgba(116,207,232,0.30)' : 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '14px', fontWeight: 700, cursor: (saving || !date) ? 'default' : 'pointer', marginTop: '4px' }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <p style={{ fontSize: '11px', color: 'rgba(244,244,242,0.40)', textAlign: 'center', margin: 0 }}>The host will be notified of the new date &amp; time.</p>
      </div>
    </div>
  )
}
