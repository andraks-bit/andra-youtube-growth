'use client'

import { useEffect, useState } from 'react'
import { Bot } from 'lucide-react'

const card = '#0c1828'
const border = 'rgba(116,207,232,0.18)'
const gold = '#74cfe8'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

// Host setting: instant AI answers to guest messages, on by default.
export default function AutoReplyToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [configurable, setConfigurable] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/host/auto-reply')
      .then((r) => r.json())
      .then((j) => { setEnabled(j.enabled !== false); setConfigurable(j.configurable !== false) })
      .catch(() => setEnabled(true))
  }, [])

  async function toggle() {
    if (enabled === null || busy || !configurable) return
    const next = !enabled
    setBusy(true)
    setEnabled(next)
    try {
      const res = await fetch('/api/host/auto-reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: next }),
      })
      if (!res.ok) setEnabled(!next)
    } catch {
      setEnabled(!next)
    } finally {
      setBusy(false)
    }
  }

  if (enabled === null) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '36px' }}>
      <Bot style={{ width: 18, height: 18, color: gold, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 700, color: text }}>Instant AI replies to guest questions</div>
        <div style={{ fontSize: '12px', color: muted, lineHeight: 1.5 }}>
          Guests get an immediate answer from your listing details (clearly marked as automatic). You always see the conversation and can take over any time.
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={busy || !configurable}
        aria-label="Toggle automatic replies"
        style={{
          width: 44, height: 24, borderRadius: 99, border: 'none', cursor: configurable ? 'pointer' : 'default',
          background: enabled ? gold : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: enabled ? 23 : 3, width: 18, height: 18, borderRadius: '50%',
          background: enabled ? '#07101e' : '#f4f4f2', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}
