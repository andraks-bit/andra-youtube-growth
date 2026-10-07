'use client'

import { useState, useEffect, useRef } from 'react'
import { Banknote, ChevronDown, ChevronUp, Loader2, Copy, Check } from 'lucide-react'

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.10)'
const goldBorder = 'rgba(116,207,232,0.22)'
const muted = 'rgba(244,244,242,0.55)'
const text = '#f4f4f2'

type Method = {
  account_holder_name: string
  account_holder_type: string
  account_holder_address: string | null
  bank_country: string
  bank_name: string | null
  iban: string | null
  account_number: string | null
  swift_bic: string | null
  routing_number: string | null
  currency: string
  is_sepa: boolean
  notes: string | null
  updated_at: string
} | null

function Row({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200) } catch {}
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', marginBottom: '4px' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '10px', color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '13px', color: text, fontWeight: 600, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>{value}</div>
      </div>
      <button onClick={copy} title="Copy" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '7px', background: copied ? 'rgba(34,197,94,0.12)' : goldFaint, border: `1px solid ${copied ? 'rgba(34,197,94,0.30)' : goldBorder}`, color: copied ? '#22c55e' : gold, cursor: 'pointer' }}>
        {copied ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
      </button>
    </div>
  )
}

export default function AdminPayoutButton({ userId, hasMethod }: { userId: string; hasMethod: boolean }) {
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<Method>(null)
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
    if (method) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/payout-method?userId=${userId}`)
      const json = await res.json()
      setMethod(json.method ?? null)
    } finally {
      setLoading(false)
    }
  }

  if (!hasMethod) {
    return <span style={{ fontSize: '12px', color: 'rgba(244,244,242,0.25)' }}>—</span>
  }

  const rows: [string, string][] = method ? ([
    ['Account holder', `${method.account_holder_name}${method.account_holder_type === 'company' ? ' (Company)' : ''}`],
    method.bank_name ? ['Bank', method.bank_name] as [string, string] : null,
    ['Country', `${method.bank_country}${method.is_sepa ? ' · SEPA' : ' · International'}`],
    method.iban ? ['IBAN', method.iban] as [string, string] : null,
    method.account_number ? ['Account number', method.account_number] as [string, string] : null,
    method.swift_bic ? ['SWIFT / BIC', method.swift_bic] as [string, string] : null,
    method.routing_number ? ['Routing', method.routing_number] as [string, string] : null,
    method.account_holder_address ? ['Address', method.account_holder_address] as [string, string] : null,
    ['Currency', method.currency],
    method.notes ? ['Notes', method.notes] as [string, string] : null,
  ].filter(Boolean) as [string, string][]) : []

  return (
    <div ref={wrapRef}>
      <button onClick={toggle}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: open ? goldFaint : 'rgba(34,197,94,0.08)', border: `1px solid ${open ? goldBorder : 'rgba(34,197,94,0.26)'}`, color: open ? gold : '#22c55e', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        <Banknote style={{ width: 13, height: 13 }} />
        Bank details
        {loading
          ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
          : open ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
      </button>

      {open && !loading && (
        <div style={{ position: 'absolute', right: 0, marginTop: '6px', background: '#0c1828', border: `1px solid ${goldBorder}`, borderRadius: '12px', padding: '10px', minWidth: '320px', maxWidth: '380px', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
          {!method ? (
            <p style={{ fontSize: '13px', color: muted, padding: '8px 12px', margin: 0 }}>No bank details found.</p>
          ) : (
            <>
              {rows.map(([k, v]) => <Row key={k} label={k} value={v} />)}
              <div style={{ fontSize: '10px', color: 'rgba(244,244,242,0.30)', padding: '6px 12px 2px' }}>
                Updated {new Date(method.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })} · pay 85% of each completed booking
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
