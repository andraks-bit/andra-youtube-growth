'use client'

import { useState, type CSSProperties, type FormEvent } from 'react'
import { Send, Loader2, CheckCircle } from 'lucide-react'

const gold = '#74cfe8'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.14)',
  background: '#07101e',
  color: text,
  fontSize: '14px',
  padding: '12px 14px',
  outline: 'none',
  fontFamily: 'inherit',
}

const labelStyle: CSSProperties = { fontSize: '13px', fontWeight: 600, color: muted, marginBottom: '6px', display: 'block' }

export default function ContactForm({ supportEmail }: { supportEmail: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (status === 'sending' || !email.trim() || !message.trim()) return
    setStatus('sending')
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    }).catch(() => null)
    setStatus(res && res.ok ? 'sent' : 'error')
  }

  if (status === 'sent') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', padding: '40px 24px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '16px' }}>
        <CheckCircle style={{ width: 40, height: 40, color: '#22c55e' }} />
        <div style={{ fontSize: '17px', fontWeight: 700, color: text }}>Message sent</div>
        <div style={{ fontSize: '14px', color: muted, maxWidth: '380px' }}>
          Thanks for reaching out — we&apos;ll reply to <strong style={{ color: text }}>{email}</strong> shortly, usually within a few hours.
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle} htmlFor="cf-name">Name</label>
        <input id="cf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle} htmlFor="cf-email">Email *</label>
        <input id="cf-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle} htmlFor="cf-message">How can we help? *</label>
        <textarea id="cf-message" required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us about your booking, listing, or question…" rows={5} style={{ ...inputStyle, resize: 'vertical', minHeight: '120px' }} />
      </div>

      {status === 'error' && (
        <p style={{ fontSize: '13px', color: '#f87171', margin: 0 }}>
          Couldn&apos;t send your message. Please email <a href={`mailto:${supportEmail}`} style={{ color: gold }}>{supportEmail}</a> directly.
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending' || !email.trim() || !message.trim()}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: '14px 24px', borderRadius: '99px', border: 'none',
          background: (status === 'sending' || !email.trim() || !message.trim()) ? 'rgba(116,207,232,0.30)' : 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)',
          color: '#07101e', fontSize: '15px', fontWeight: 700,
          cursor: (status === 'sending' || !email.trim() || !message.trim()) ? 'default' : 'pointer',
        }}
      >
        {status === 'sending'
          ? <><Loader2 style={{ width: 17, height: 17 }} className="animate-spin" /> Sending…</>
          : <><Send style={{ width: 17, height: 17 }} /> Send message</>}
      </button>
    </form>
  )
}
