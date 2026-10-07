'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const gold = '#74cfe8', muted = 'rgba(244,244,242,0.55)', text = '#f4f4f2'
const border = 'rgba(116,207,232,0.22)'

interface Props {
  id: string
  website: string | null
  email: string | null
  phone: string | null
  location?: string
  contactName?: string | null
  company?: string | null
}

const inp: React.CSSProperties = {
  padding: '7px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.14)', color: text, fontSize: 13, outline: 'none',
}

export default function LeadContactEdit({ id, website, email, phone, location, contactName, company }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [co, setCo] = useState(company ?? '')
  const [nm, setNm] = useState(contactName ?? '')
  const [w, setW] = useState(website ?? '')
  const [e, setE] = useState(email ?? '')
  const [p, setP] = useState(phone ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [cur, setCur] = useState({ website, email, phone })

  useEffect(() => {
    const open = () => setEditing(true)
    window.addEventListener(`lead-edit-open:${id}`, open)
    return () => window.removeEventListener(`lead-edit-open:${id}`, open)
  }, [id])

  async function save() {
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/admin/list-submissions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, website: w, email: e, phone: p, contact_name: nm, company: co }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Failed')
      setCur({ website: j.lead.website, email: j.lead.email, phone: j.lead.phone })
      setEditing(false)
      // The lead's name in the card header is server-rendered — refresh it.
      router.refresh()
    } catch (err2) { setErr((err2 as Error).message) } finally { setBusy(false) }
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '6px 0 10px', maxWidth: 420 }}>
        <input style={inp} value={co} onChange={(ev) => setCo(ev.target.value)} placeholder="Company (shown as the lead name)" />
        <input style={inp} value={nm} onChange={(ev) => setNm(ev.target.value)} placeholder="Contact person" />
        <input style={inp} value={w} onChange={(ev) => setW(ev.target.value)} placeholder="Website" />
        <input style={inp} value={e} onChange={(ev) => setE(ev.target.value)} placeholder="Email" />
        <input style={inp} value={p} onChange={(ev) => setP(ev.target.value)} placeholder="Phone" />
        {err && <span style={{ color: '#f87171', fontSize: 12 }}>{err}</span>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={busy} style={{ padding: '6px 14px', borderRadius: 8, background: gold, color: '#07101e', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save'}</button>
          <button onClick={() => { setEditing(false); setCo(company ?? ''); setNm(contactName ?? ''); setW(cur.website ?? ''); setE(cur.email ?? ''); setP(cur.phone ?? '') }} style={{ padding: '6px 12px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.18)', color: muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontSize: 13, color: muted, margin: '0 0 10px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
      {cur.website && <a href={cur.website.startsWith('http') ? cur.website : `https://${cur.website}`} target="_blank" rel="noopener" style={{ color: gold }}>🌐 {cur.website}</a>}
      {cur.email && <a href={`mailto:${cur.email}`} style={{ color: gold }}>✉ {cur.email}</a>}
      {cur.phone && <span>📞 {cur.phone}</span>}
      {location && <span>📍 {location}</span>}
      <button onClick={() => setEditing(true)} style={{ padding: '3px 10px', borderRadius: 7, background: 'transparent', border: `1px solid ${border}`, color: gold, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✏ Edit</button>
    </div>
  )
}
