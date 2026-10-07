'use client'

import { useState } from 'react'
import { DURATIONS, CURRENCIES, symbolOf, COUNTRIES, POLICIES, num, newBoat, type BoatRow } from '@/lib/listing-options'

const gold = '#74cfe8', text = '#f4f4f2', muted = 'rgba(244,244,242,0.6)'
const border = 'rgba(116,207,232,0.22)'

const inp: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: text, fontSize: 14, outline: 'none' }
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: muted, marginBottom: 5, display: 'block' }

export default function AddCustomerButton() {
  const [open, setOpen] = useState(false)
  const [contact_name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [website, setWebsite] = useState('')
  const [country, setCountry] = useState('Spain')
  const [port, setPort] = useState('')
  const [email, setEmail] = useState('')
  const [waNumber, setWaNumber] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [note, setNote] = useState('')
  const [boats, setBoats] = useState<BoatRow[]>([newBoat()])
  const [samePolicy, setSamePolicy] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const sym = symbolOf(currency)

  function setBoat(i: number, patch: Partial<BoatRow>) { setBoats((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x))) }
  function setBoatPrice(i: number, k: string, v: string) { setBoats((b) => b.map((x, j) => (j === i ? { ...x, prices: { ...x.prices, [k]: v } } : x))) }

  async function submit() {
    setErr(null)
    if (!contact_name.trim() && !company.trim()) return setErr('Add a name or company.')
    if (!website.trim() && boats.every((b) => !b.name.trim())) return setErr('Add a website or at least one boat.')
    setBusy(true)
    const policed = samePolicy && boats.length > 1
      ? boats.map((b) => ({ ...b, cancellation: boats[0].cancellation, cancellationCustom: boats[0].cancellationCustom }))
      : boats
    const outBoats = policed.map((b) => ({ ...b, currency }))
    try {
      const r = await fetch('/api/list-submissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_name, company, website, email, phone: waNumber.trim(), note, currency, country, port, source: 'admin-manual', boats: outBoats }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Failed to add')
      window.location.reload()
    } catch (e) { setErr((e as Error).message); setBusy(false) }
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} style={{ padding: '9px 18px', borderRadius: 99, background: gold, color: '#07101e', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add customer</button>
  }

  return (
    <div style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: `1px solid ${border}`, borderRadius: 16, padding: 20, margin: '0 0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Add a customer manually</h2>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: muted, fontSize: 20, cursor: 'pointer' }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div><label style={label}>Contact name</label><input style={inp} value={contact_name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" /></div>
        <div><label style={label}>Company</label><input style={inp} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Marbella Charters SL" /></div>
      </div>
      <div style={{ marginBottom: 12 }}><label style={label}>Website</label><input style={inp} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://theircharters.com" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={label}>Country</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...inp, appearance: 'auto', colorScheme: 'dark' }}>
            {COUNTRIES.map(([flag, name]) => <option key={name} value={name}>{name} {flag}</option>)}
          </select>
        </div>
        <div><label style={label}>Port / marina</label><input style={inp} value={port} onChange={(e) => setPort(e.target.value)} placeholder="e.g. Puerto Banús" /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div><label style={label}>Email</label><input style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@company.com" /></div>
        <div>
          <label style={label}>WhatsApp / phone</label>
          <input style={inp} value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="+34 600 000 000" />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <label style={{ ...label, marginBottom: 0 }}>Boats</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: muted }}>
          Currency
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ ...inp, width: 'auto', padding: '7px 8px', fontSize: 13, appearance: 'auto', colorScheme: 'dark' }}>
            {CURRENCIES.map(([code, s, name]) => <option key={code} value={code}>{code} ({s}) — {name}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {boats.map((b, i) => (
          <div key={i} style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 10 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input style={{ ...inp, flex: 1.3 }} value={b.name} onChange={(e) => setBoat(i, { name: e.target.value })} placeholder="Boat name" />
              {boats.length > 1 && <button onClick={() => setBoats((bs) => bs.filter((_, j) => j !== i))} style={{ width: 40, borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: muted, fontSize: 16, cursor: 'pointer' }}>×</button>}
            </div>
            <input style={{ ...inp, marginBottom: 8 }} value={b.url} onChange={(e) => setBoat(i, { url: e.target.value })} placeholder="Link to this boat on their site" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {DURATIONS.map(([k, lbl]) => {
                const p = num(b.prices[k] || '')
                return (
                  <div key={k}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', marginBottom: 3 }}>{lbl}</div>
                    <input style={{ ...inp, padding: '8px 8px', fontSize: 13 }} value={b.prices[k] || ''} onChange={(e) => setBoatPrice(i, k, e.target.value)} placeholder={sym} />
                    {p != null && <div style={{ fontSize: 10, color: gold, marginTop: 2 }}>renter {sym}{Math.round(p * 1.15).toLocaleString()}</div>}
                  </div>
                )
              })}
            </div>
            {(i === 0 || !samePolicy) && (
              <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: muted, marginBottom: 6 }}>Cancellation policy</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
                  {POLICIES.map(([v, plabel, desc]) => {
                    const on = b.cancellation === v
                    return <button key={v} type="button" onClick={() => setBoat(i, { cancellation: v })} style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: on ? 'rgba(116,207,232,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? border : 'rgba(255,255,255,0.1)'}` }}><div style={{ fontSize: 12.5, fontWeight: 700, color: on ? gold : text }}>{plabel}</div><div style={{ fontSize: 10.5, color: muted }}>{desc}</div></button>
                  })}
                </div>
                {b.cancellation === 'custom' && <textarea style={{ ...inp, marginTop: 6, minHeight: 44, fontSize: 13 }} value={b.cancellationCustom} onChange={(e) => setBoat(i, { cancellationCustom: e.target.value })} placeholder="Refund terms…" />}
              </div>
            )}
            {i === 0 && boats.length > 1 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12.5, color: text, cursor: 'pointer' }}>
                <input type="checkbox" checked={samePolicy} onChange={(e) => setSamePolicy(e.target.checked)} style={{ width: 16, height: 16, accentColor: gold }} />
                All boats use this same cancellation policy
              </label>
            )}
          </div>
        ))}
      </div>
      <button onClick={() => setBoats((b) => [...b, newBoat()])} style={{ marginTop: 10, padding: '8px 14px', borderRadius: 9, background: 'transparent', border: `1px dashed ${border}`, color: gold, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>+ Add another boat</button>

      <div style={{ margin: '14px 0' }}><label style={label}>Notes</label><textarea style={{ ...inp, minHeight: 56 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Commission, availability, anything useful…" /></div>

      {err && <p style={{ color: '#f87171', fontSize: 13, margin: '0 0 10px' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={submit} disabled={busy} style={{ padding: '11px 22px', borderRadius: 10, background: gold, color: '#07101e', border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save customer'}</button>
        <button onClick={() => setOpen(false)} style={{ padding: '11px 18px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.18)', color: muted, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}
