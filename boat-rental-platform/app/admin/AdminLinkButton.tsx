'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link2 } from 'lucide-react'

const muted = 'rgba(244,244,242,0.55)'

// Admin sets a host's external website/feed URL on their profile, so we can later
// scrape/import that host's boats from it.
export default function AdminLinkButton({ userId, currentUrl }: { userId: string; currentUrl?: string | null }) {
  const [editing, setEditing] = useState(false)
  const [url, setUrl] = useState(currentUrl ?? '')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function save() {
    setSaving(true)
    const res = await fetch('/api/admin/set-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, url: url.trim() }),
    })
    setSaving(false)
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(`Couldn't save link: ${j.error ?? 'error'}`); return }
    setEditing(false)
    router.refresh()
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save() }}
          placeholder="https://their-site.com"
          style={{ width: '170px', padding: '6px 8px', borderRadius: '7px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.16)', color: '#f4f4f2', fontSize: '11px', outline: 'none' }}
        />
        <button onClick={save} disabled={saving} style={{ padding: '6px 9px', borderRadius: '7px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.30)', color: '#22c55e', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>{saving ? '…' : 'Save'}</button>
        <button onClick={() => { setEditing(false); setUrl(currentUrl ?? '') }} style={{ padding: '6px 8px', borderRadius: '7px', background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', color: muted, fontSize: '11px', cursor: 'pointer' }}>✕</button>
      </div>
    )
  }

  return currentUrl ? (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <a href={currentUrl} target="_blank" rel="noopener noreferrer" title={currentUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#60a5fa', fontSize: '11px', textDecoration: 'none' }}>
        <Link2 style={{ width: 12, height: 12, flexShrink: 0 }} /> {currentUrl.replace(/^https?:\/\//, '')}
      </a>
      <button onClick={() => setEditing(true)} title="Edit link" style={{ padding: '3px 7px', borderRadius: '6px', background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', color: muted, fontSize: '10px', cursor: 'pointer' }}>edit</button>
    </div>
  ) : (
    <button onClick={() => setEditing(true)} title="Add a website link to scrape this host's boats" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '8px', background: 'rgba(96,165,250,0.10)', border: '1px solid rgba(96,165,250,0.28)', color: '#60a5fa', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <Link2 style={{ width: 12, height: 12 }} /> + Link
    </button>
  )
}
