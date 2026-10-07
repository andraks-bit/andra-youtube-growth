import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'

const gold = '#74cfe8'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

const field: CSSProperties = {
  display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '6px',
  padding: '12px 14px', borderRadius: '12px', background: '#07101e',
  border: '1px solid rgba(255,255,255,0.12)', color: text, fontSize: '15px',
}

export default async function SendOfferPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/host/bookings/${id}/offer`)

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, start_datetime, duration_hours, guests_count, special_requests, boats(name, host_id, min_hours), profiles!renter_id(full_name)')
    .eq('id', id)
    .single()
  if (!booking) notFound()
  const boat = booking.boats as unknown as { name: string; host_id: string; min_hours: number | null } | null
  if (boat?.host_id !== user.id) redirect('/host/bookings')

  const renter = (booking as unknown as { profiles?: { full_name?: string } | null }).profiles
  const d = new Date(booking.start_datetime)
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateVal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const timeVal = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const dur = booking.duration_hours || boat?.min_hours || 4
  const note = (booking.special_requests || '').replace(/^Price on request — quote\s*·?\s*/, '').trim()

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '40px 20px 80px' }}>
        <Link href="/host/bookings" style={{ fontSize: '13px', color: gold, textDecoration: 'none', fontWeight: 600 }}>← Back to bookings</Link>
        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '18px 0 6px' }}>Send an offer</h1>
        <p style={{ color: muted, fontSize: '14px', marginBottom: note ? '8px' : '24px' }}>
          {boat?.name} · for {renter?.full_name || 'the guest'} · {booking.guests_count} guest{booking.guests_count === 1 ? '' : 's'}
        </p>
        {note && <p style={{ color: muted, fontSize: '13px', fontStyle: 'italic', marginBottom: '24px' }}>Guest note: &ldquo;{note}&rdquo;</p>}

        {sp.error && (
          <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', padding: '10px 14px', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.28)', borderRadius: '12px' }}>
            Please enter a valid date and a price above €0.
          </p>
        )}

        <form action={`/api/host/bookings/${id}/offer`} method="POST" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <label style={{ fontSize: '13px', color: muted, fontWeight: 600 }}>Date
            <input type="date" name="date" defaultValue={dateVal} required style={field} />
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ fontSize: '13px', color: muted, fontWeight: 600, flex: 1 }}>Start time
              <input type="time" name="time" defaultValue={timeVal} required style={field} />
            </label>
            <label style={{ fontSize: '13px', color: muted, fontWeight: 600, flex: 1 }}>Duration (hours)
              <input type="number" name="duration" defaultValue={dur} min={1} max={48} required style={field} />
            </label>
          </div>
          <label style={{ fontSize: '13px', color: muted, fontWeight: 600 }}>Your price (€)
            <input type="number" name="price" min={1} step={1} required placeholder="e.g. 1200" style={{ ...field, fontSize: '20px', fontWeight: 800, color: gold }} />
          </label>
          <label style={{ fontSize: '13px', color: muted, fontWeight: 600 }}>Message to guest (optional)
            <textarea name="message" rows={3} placeholder="e.g. Price includes skipper and fuel. Looking forward to hosting you!" style={{ ...field, resize: 'vertical', fontFamily: 'inherit' }} />
          </label>
          <button type="submit" style={{ marginTop: '6px', padding: '15px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer' }}>
            Send offer to guest →
          </button>
          <p style={{ color: muted, fontSize: '12px', textAlign: 'center', margin: 0 }}>
            The guest gets an email + WhatsApp with a secure payment link. The date is held the moment they pay.
          </p>
        </form>
      </div>
    </div>
  )
}
