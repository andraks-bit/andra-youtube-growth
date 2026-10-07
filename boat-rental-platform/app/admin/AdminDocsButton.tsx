'use client'

import { useState, useEffect, useRef } from 'react'
import { FileText, ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react'

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.10)'
const goldBorder = 'rgba(116,207,232,0.22)'
const muted = 'rgba(244,244,242,0.55)'
const text = '#f4f4f2'

const DOC_LABELS: Record<string, string> = {
  passport: '🪪 Passport / ID',
  company_registration: '🏢 Company Registration',
  boat_registration: '⚓ Boat Registration',
  marina_contract: '🏗️ Marina Contract',
  boat_insurance: '🛡️ Boat Insurance',
}

type Doc = {
  id: string
  doc_type: string
  file_name: string
  file_size: number | null
  storage_path: string
  uploaded_at: string
  url: string | null
}

export default function AdminDocsButton({ userId, docCount }: { userId: string; docCount: number }) {
  const [open, setOpen] = useState(false)
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside the dropdown, or pressing Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  async function toggle() {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (docs.length > 0) return // already loaded
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/docs?userId=${userId}`)
      const json = await res.json()
      setDocs(json.docs ?? [])
    } finally {
      setLoading(false)
    }
  }

  if (docCount === 0) {
    return <span style={{ fontSize: '12px', color: 'rgba(244,244,242,0.25)' }}>No docs</span>
  }

  return (
    <div ref={wrapRef}>
      <button
        onClick={toggle}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: open ? goldFaint : 'rgba(255,255,255,0.05)', border: `1px solid ${open ? goldBorder : 'rgba(255,255,255,0.10)'}`, color: open ? gold : muted, fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        <FileText style={{ width: 13, height: 13 }} />
        {docCount} doc{docCount !== 1 ? 's' : ''}
        {loading
          ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
          : open ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />
        }
      </button>

      {open && !loading && (
        <div style={{ position: 'absolute', right: 0, marginTop: '6px', background: '#0c1828', border: `1px solid ${goldBorder}`, borderRadius: '12px', padding: '8px', minWidth: '280px', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.40)' }}>
          {docs.length === 0 ? (
            <p style={{ fontSize: '13px', color: muted, padding: '8px 12px', margin: 0 }}>No documents found.</p>
          ) : (
            docs.map((doc) => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', borderRadius: '8px', marginBottom: '4px', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: text, marginBottom: '2px' }}>
                    {DOC_LABELS[doc.doc_type] ?? doc.doc_type.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.file_name}
                    {doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(0)}KB` : ''}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(244,244,242,0.30)', marginTop: '2px' }}>
                    {new Date(doc.uploaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {doc.url ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', background: goldFaint, border: `1px solid ${goldBorder}`, color: gold, fontSize: '11px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    Open <ExternalLink style={{ width: 11, height: 11 }} />
                  </a>
                ) : (
                  <span style={{ fontSize: '11px', color: '#f87171' }}>Link expired</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
