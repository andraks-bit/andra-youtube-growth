'use client'

import { useEffect, useState } from 'react'
import AddCustomerButton from '@/components/admin/AddCustomerButton'
import LeadBoats from '@/components/admin/LeadBoats'

const gold = '#74cfe8', muted = 'rgba(244,244,242,0.55)', text = '#f4f4f2'
const card = 'rgba(255,255,255,0.03)', border = 'rgba(116,207,232,0.18)'

interface Boat { id: string; name: string; slug: string; status: string }

export default function ManagedListings({ hostId }: { hostId: string | null }) {
  const [boats, setBoats] = useState<Boat[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    try {
      const r = await fetch('/api/admin/managed')
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Failed to load')
      setBoats(j.boats ?? [])
    } catch (e) { setErr((e as Error).message) }
  }
  useEffect(() => { load() }, [])

  if (!hostId) {
    return (
      <div style={{ background: card, borderRadius: 16, border: `1px solid ${border}`, padding: 32, textAlign: 'center' }}>
        <p style={{ color: text, fontWeight: 700, marginBottom: 6 }}>BoatHire24 managed account not set up yet</p>
        <p style={{ color: muted, fontSize: 13 }}>Run the one-off setup script to create the managed host account, then refresh.</p>
      </div>
    )
  }

  const count = boats?.length ?? 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <p style={{ color: muted, fontSize: 13, margin: 0, maxWidth: 520, lineHeight: 1.5 }}>
          Boats we list & manage on owners&apos; behalf under the <strong style={{ color: text }}>BoatHire24</strong> account. Add a customer, then import or add their listings — boats are grouped under each lead below.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <AddCustomerButton />
          <a href="/admin/leads" style={{ padding: '9px 18px', borderRadius: 99, background: 'transparent', border: `1px solid ${border}`, color: gold, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>🚤 Listing leads</a>
          <a href={`/host/fleet/website?host=${hostId}`} style={{ padding: '9px 18px', borderRadius: 99, background: 'transparent', border: `1px solid ${border}`, color: gold, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>🔗 Import from website link</a>
        </div>
      </div>

      {err && <p style={{ color: '#f87171', fontSize: 13 }}>{err}</p>}

      {boats === null ? (
        <div style={{ color: muted, fontSize: 13 }}>Loading fleet…</div>
      ) : count === 0 ? (
        <div style={{ background: card, borderRadius: 16, border: `1px solid ${border}`, padding: 28, textAlign: 'center', color: muted, fontSize: 14 }}>
          No managed boats yet. Add a customer, then import or add their listings.
        </div>
      ) : (
        <LeadBoats boats={boats} label={`All boats (${count})`} />
      )}
    </div>
  )
}
