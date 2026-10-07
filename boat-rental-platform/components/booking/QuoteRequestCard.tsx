'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const card = '#0c1828'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const dim = 'rgba(244,244,242,0.35)'
const gold = 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '10px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)',
  color: text, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}

export default function QuoteRequestCard({ boatId, boatName }: { boatId: string; boatName: string }) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [hours, setHours] = useState('')
  const [guests, setGuests] = useState('')
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setLoggedIn(!!data.user); setAuthReady(true) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isGuest = authReady && !loggedIn
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (isGuest && (!name.trim() || !emailOk)) { setErr('Please add your name and a valid email so the owner can reply.'); return }
    setSending(true); setErr(null)
    const res = await fetch('/api/quote-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boatId, date, time, hours, guests, message: message.trim(), name: name.trim(), email: email.trim(), phone: phone.trim() }),
    })
    setSending(false)
    if (!res.ok) { setErr('Could not send — please try again.'); return }
    setSent(true)
    router.refresh()
  }

  if (sent) {
    return (
      <div style={{ background: card, border: '1px solid rgba(34,197,94,0.30)', borderRadius: '20px', padding: '28px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#22c55e', marginBottom: '6px' }}>Request sent!</div>
        <p style={{ fontSize: '14px', color: muted, lineHeight: 1.6, marginBottom: '18px' }}>We&apos;ve emailed you a confirmation and notified the owner of the {boatName} — they&apos;ll reply with a price and availability.{isGuest ? ' Sign in with that email any time to track your request.' : ''}</p>
        <a href={isGuest ? '/search' : '/dashboard'} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', background: gold, color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>{isGuest ? 'Browse more boats →' : 'View it in My Trips →'}</a>
      </div>
    )
  }

  return (
    <div style={{ background: card, border: '1px solid rgba(116,207,232,0.18)', borderRadius: '20px', padding: '24px' }}>
      <div style={{ fontSize: '20px', fontWeight: 800, color: text, marginBottom: '4px' }}>Price on request</div>
      <p style={{ fontSize: '13px', color: muted, lineHeight: 1.55, marginBottom: '16px' }}>Tell the owner your plans and they&apos;ll send you a quote — no payment now.</p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {isGuest && (
          <>
            <input style={inputStyle} type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <div style={{ display: 'flex', gap: '10px' }}>
              <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <input style={{ ...inputStyle, maxWidth: '130px' }} type="tel" placeholder="Phone (opt)" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            </div>
          </>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={(e) => setDate(e.target.value)} />
          <input style={{ ...inputStyle, colorScheme: 'dark' }} type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Preferred start time" />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input style={inputStyle} type="number" min={1} max={12} placeholder="Duration (hrs)" value={hours} onChange={(e) => setHours(e.target.value)} />
          <input style={{ ...inputStyle, maxWidth: '110px' }} type="number" min={1} placeholder="Guests" value={guests} onChange={(e) => setGuests(e.target.value)} />
        </div>
        <textarea style={{ ...inputStyle, minHeight: '58px', resize: 'vertical' }} placeholder="Anything else? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
        {err && <div style={{ fontSize: '12px', color: '#f87171' }}>{err}</div>}
        <button type="submit" disabled={sending || !authReady} style={{ width: '100%', padding: '13px', borderRadius: '99px', background: gold, color: '#07101e', fontSize: '15px', fontWeight: 700, border: 'none', cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.7 : 1 }}>
          {sending ? 'Sending…' : 'Request a quote'}
        </button>
        <p style={{ fontSize: '11px', color: dim, textAlign: 'center', margin: 0 }}>{isGuest ? 'No account needed · we’ll email you a confirmation' : 'We’ll email you a confirmation · the owner replies with a price'}</p>
      </form>
    </div>
  )
}
