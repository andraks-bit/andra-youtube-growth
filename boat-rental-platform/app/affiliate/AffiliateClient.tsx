'use client'

import { useState } from 'react'

const gold = '#74cfe8', text = '#f4f4f2', muted = 'rgba(244,244,242,0.62)'
const border = 'rgba(116,207,232,0.22)'
const bg = '#07101e'

const inp: React.CSSProperties = {
  width: '100%', padding: '13px 15px', borderRadius: 12, background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.12)', color: text, fontSize: 15, outline: 'none',
}
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: muted, marginBottom: 6, display: 'block' }
const req = <span style={{ color: gold }}> *</span>

export default function AffiliateClient({ source }: { source?: string }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    setErr(null)
    if (!name.trim()) return setErr('Please add your name.')
    if (!phone.trim()) return setErr('Please add your phone number.')
    if (!email.trim() || !/.+@.+\..+/.test(email)) return setErr('Please add a valid email.')
    if (!website.trim()) return setErr('Please add your website.')
    setBusy(true)
    try {
      const r = await fetch('/api/affiliate-submissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, website, note, source }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Something went wrong')
      setDone(true)
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  if (done) {
    return (
      <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system,Segoe UI,sans-serif' }}>
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🤝</div>
          <h1 style={{ color: text, fontSize: 26, fontWeight: 800, margin: '0 0 10px' }}>Thanks — we&apos;ve got your application.</h1>
          <p style={{ color: muted, fontSize: 15, lineHeight: 1.6 }}>
            Our team will review it and reach out at <strong style={{ color: text }}>{email}</strong> within 1–2 business days with your affiliate link and next steps.
          </p>
          <a href="mailto:info@boathire24.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 22, padding: '12px 22px', borderRadius: 99, background: 'transparent', border: `1px solid ${border}`, color: gold, fontWeight: 700, textDecoration: 'none' }}>✉ Email us</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', color: text, fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 20px 90px' }}>
        <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: gold, background: 'rgba(116,207,232,0.10)', border: `1px solid ${border}`, padding: '5px 14px', borderRadius: 99, marginBottom: 18 }}>Affiliate program</span>
        <h1 style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
          Send us bookings, earn <span style={{ color: gold }}>5% commission</span> on every one.
        </h1>
        <p style={{ fontSize: 17, color: muted, lineHeight: 1.6, margin: '0 0 28px', maxWidth: 600 }}>
          If your site, blog, or channel already reaches people looking for boat rentals, refer them to BoatHire24 and earn <strong style={{ color: text }}>5% of every completed booking</strong> you send our way. Free to join, no minimum traffic required.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 38 }}>
          {[
            ['💸', '5% per booking', 'Paid on every completed trip you refer — no cap.'],
            ['🆓', 'Free to join', 'No setup fee, no monthly cost, no minimum traffic.'],
            ['⚡', 'Fast approval', 'We review applications within 1–2 business days.'],
          ].map(([icon, t, d]) => (
            <div key={t} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}`, borderRadius: 14, padding: '16px 16px' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t}</div>
              <div style={{ color: muted, fontSize: 12.5, lineHeight: 1.45 }}>{d}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${border}`, borderRadius: 18, padding: '26px 22px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 18px' }}>Apply now</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div><label style={label}>Your name{req}</label><input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" /></div>
            <div><label style={label}>Phone number{req}</label><input style={inp} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+34 600 000 000" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
            <div><label style={label}>Email{req}</label><input style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yoursite.com" /></div>
            <div><label style={label}>Your website{req}</label><input style={inp} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yoursite.com" /></div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={label}>Anything else? (optional)</label>
            <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tell us about your audience, traffic, or how you'd promote us…" />
          </div>

          {err && <p style={{ color: '#f87171', fontSize: 13, margin: '0 0 12px' }}>{err}</p>}

          <button onClick={submit} disabled={busy} style={{ width: '100%', padding: '15px', borderRadius: 12, background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', border: 'none', fontSize: 16, fontWeight: 800, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Sending…' : 'Apply as an affiliate →'}
          </button>
          <p style={{ color: 'rgba(244,244,242,0.4)', fontSize: 12, textAlign: 'center', margin: '12px 0 0' }}>
            No commitment. We review applications and get back to you within 1–2 business days.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>Have more questions?</h3>
          <p style={{ color: muted, fontSize: 14, margin: '0 0 18px' }}>Talk to us directly — we&apos;re happy to walk you through how it works.</p>
          <a href="mailto:info@boathire24.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 99, background: 'transparent', border: `1px solid ${border}`, color: gold, fontWeight: 700, textDecoration: 'none' }}>✉ Email us</a>
        </div>
      </div>
    </div>
  )
}
