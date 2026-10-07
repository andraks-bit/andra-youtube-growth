'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Ship, ChevronDown, ChevronUp, ExternalLink, Loader2, X } from 'lucide-react'

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.10)'
const goldBorder = 'rgba(116,207,232,0.22)'
const card = '#0c1828'
const muted = 'rgba(244,244,242,0.55)'
const text = '#f4f4f2'

type Boat = {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  admin_note: string | null
  type: string
  status: string
  length_m: number | null
  capacity_pax: number | null
  cabins: number | null
  builder: string | null
  model_year: number | null
  departure_port: string | null
  includes_skipper: boolean
  includes_fuel: boolean
  includes_drinks: boolean
  min_hours: number
  pricing_type: string
  instant_book: boolean
  cancellation_policy: string
  created_at: string
  location: { name: string; city: string; country: string } | null
  bookings: { total: number; confirmed: number; pending: number }
  boat_images: { storage_url: string; is_hero: boolean; sort_order: number }[]
  boat_pricing: { duration_hours: number; price: number; currency: string; season: string }[]
  boat_features: { feature: string }[]
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  active: { color: '#22c55e', bg: 'rgba(34,197,94,0.10)' },
  paused: { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  draft:  { color: muted, bg: 'rgba(255,255,255,0.06)' },
}

export default function AdminBoatsButton({ userId, boatCount }: { userId: string; boatCount: number }) {
  const [open, setOpen] = useState(false)
  const [boats, setBoats] = useState<Boat[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Boat | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close the dropdown when clicking outside it, or pressing Escape.
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
    if (boats.length > 0) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/boats?userId=${userId}`)
      const json = await res.json()
      setBoats(json.boats ?? [])
    } finally {
      setLoading(false)
    }
  }

  if (boatCount === 0) {
    return <span style={{ fontSize: '13px', color: 'rgba(244,244,242,0.30)' }}>—</span>
  }

  return (
    <>
      <div ref={wrapRef} style={{ display: 'inline-block' }}>
      <button
        onClick={toggle}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: open ? goldFaint : 'rgba(255,255,255,0.05)', border: `1px solid ${open ? goldBorder : 'rgba(255,255,255,0.10)'}`, color: open ? gold : text, fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        <Ship style={{ width: 13, height: 13 }} />
        {boatCount} boat{boatCount !== 1 ? 's' : ''}
        {loading
          ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
          : open ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />
        }
      </button>

      {open && !loading && (
        <div style={{ position: 'absolute', right: 0, marginTop: '6px', background: card, border: `1px solid ${goldBorder}`, borderRadius: '12px', padding: '8px', minWidth: '320px', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.40)' }}>
          {boats.length === 0 ? (
            <p style={{ fontSize: '13px', color: muted, padding: '8px 12px', margin: 0 }}>No boats yet.</p>
          ) : (
            boats.map((boat, i) => {
              const hero = boat.boat_images?.find((img) => img.is_hero) ?? boat.boat_images?.[0]
              const s = STATUS_STYLE[boat.status] ?? STATUS_STYLE.draft
              return (
                <button
                  key={boat.id}
                  onClick={() => { setSelected(boat); setOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }}>
                    {hero ? <img src={hero.storage_url} alt={boat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Ship style={{ width: 18, height: 18, color: muted, margin: '9px' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Listing {i + 1} — {boat.name}
                    </div>
                    <div style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>
                      <span style={{ color: s.color, fontWeight: 700, textTransform: 'capitalize' }}>{boat.status}</span>
                      {boat.location && ` · ${boat.location.city}`}
                      {boat.capacity_pax && ` · ${boat.capacity_pax} pax`}
                    </div>
                  </div>
                  <ExternalLink style={{ width: 12, height: 12, color: muted, flexShrink: 0 }} />
                </button>
              )
            })
          )}
        </div>
      )}
      </div>

      {/* ── Detail modal ── */}
      {selected && <BoatDetailModal boat={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

function BoatDetailModal({ boat, onClose }: { boat: Boat; onClose: () => void }) {
  const sortedImages = [...boat.boat_images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const sortedPricing = [...boat.boat_pricing].sort((a, b) => a.duration_hours - b.duration_hours)
  const s = STATUS_STYLE[boat.status] ?? STATUS_STYLE.draft
  const [lightbox, setLightbox] = useState<number | null>(null)

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto', backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: card, border: `1px solid ${goldBorder}`, borderRadius: '20px', maxWidth: '1000px', width: '100%', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', position: 'relative' }}
      >
        {/* Sticky header */}
        <div style={{ position: 'sticky', top: 0, background: card, borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: '11px', color: gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Listing details · {sortedImages.length} photo{sortedImages.length !== 1 ? 's' : ''}</div>
            <div style={{ fontWeight: 800, fontSize: '18px', color: text }}>{boat.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: muted, display: 'flex' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Hero (large primary image) */}
          {sortedImages.length > 0 && (
            <>
              <div
                onClick={() => setLightbox(0)}
                style={{ position: 'relative', width: '100%', height: '380px', borderRadius: '14px', overflow: 'hidden', marginBottom: '8px', cursor: 'zoom-in', background: 'rgba(255,255,255,0.04)' }}
              >
                <img
                  src={sortedImages[0].storage_url}
                  alt={boat.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '50px', background: 'rgba(7,16,30,0.85)', color: gold, border: `1px solid ${goldBorder}`, backdropFilter: 'blur(8px)' }}>HERO</span>
                </div>
                <div style={{ position: 'absolute', bottom: '12px', right: '12px', padding: '6px 12px', borderRadius: '50px', background: 'rgba(7,16,30,0.85)', color: text, fontSize: '11px', fontWeight: 600, backdropFilter: 'blur(8px)' }}>
                  🔍 Click to enlarge
                </div>
              </div>

              {/* Thumbnail grid — all remaining images */}
              {sortedImages.length > 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '6px', marginBottom: '24px' }}>
                  {sortedImages.slice(1).map((img, i) => (
                    <div
                      key={i + 1}
                      onClick={() => setLightbox(i + 1)}
                      style={{ position: 'relative', aspectRatio: '4/3', borderRadius: '8px', overflow: 'hidden', cursor: 'zoom-in', background: 'rgba(255,255,255,0.04)' }}
                    >
                      <img src={img.storage_url} alt={`${boat.name} photo ${i + 2}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {sortedImages.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: `1px dashed rgba(255,255,255,0.10)`, marginBottom: '24px' }}>
              <Ship style={{ width: 32, height: 32, color: 'rgba(244,244,242,0.20)', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13px', color: muted, margin: 0 }}>No photos uploaded yet</p>
            </div>
          )}

          {/* Status chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: s.bg, color: s.color, border: `1px solid ${s.color}40`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{boat.status}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, textTransform: 'capitalize' }}>{boat.type.replace(/_/g, ' ')}</span>
            {boat.instant_book && <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: 'rgba(34,197,94,0.10)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.28)' }}>⚡ Instant book</span>}
          </div>

          {/* Tagline + description */}
          {boat.tagline && <p style={{ fontSize: '15px', color: text, lineHeight: 1.6, marginBottom: '12px', fontStyle: 'italic' }}>"{boat.tagline}"</p>}
          {boat.description && <p style={{ fontSize: '14px', color: muted, lineHeight: 1.65, marginBottom: '24px', whiteSpace: 'pre-line' }}>{boat.description}</p>}

          {/* Specs grid */}
          <Section title="Specifications">
            <SpecRow label="Type"     value={boat.type.replace(/_/g, ' ')} />
            <SpecRow label="Length"   value={boat.length_m ? `${boat.length_m} m` : '—'} />
            <SpecRow label="Capacity" value={boat.capacity_pax ? `${boat.capacity_pax} guests` : '—'} />
            <SpecRow label="Cabins"   value={boat.cabins ?? '—'} />
            <SpecRow label="Builder"  value={boat.builder ?? '—'} />
            <SpecRow label="Year"     value={boat.model_year ?? '—'} />
          </Section>

          {/* Location */}
          {boat.location && (
            <Section title="Location">
              <SpecRow label="City"           value={`${boat.location.city}, ${boat.location.country}`} />
              <SpecRow label="Departure port" value={boat.departure_port ?? '—'} />
            </Section>
          )}

          {/* Pricing */}
          {sortedPricing.length > 0 && (
            <Section title="Pricing">
              {sortedPricing.map((p, i) => (
                <SpecRow key={i} label={p.duration_hours >= 24 ? `${p.duration_hours / 24} day${p.duration_hours / 24 > 1 ? 's' : ''}` : `${p.duration_hours}h`} value={`${p.currency === 'EUR' ? '€' : p.currency}${p.price.toLocaleString()}`} />
              ))}
              <SpecRow label="Min hours"  value={`${boat.min_hours}h`} />
              <SpecRow label="Cancellation" value={boat.cancellation_policy} />
            </Section>
          )}

          {/* Included */}
          <Section title="Includes">
            <SpecRow label="Skipper" value={boat.includes_skipper ? '✓ Included' : '✗ Not included'} valueColor={boat.includes_skipper ? '#22c55e' : muted} />
            <SpecRow label="Fuel"    value={boat.includes_fuel ? '✓ Included' : '✗ Not included'}    valueColor={boat.includes_fuel ? '#22c55e' : muted} />
            <SpecRow label="Drinks"  value={boat.includes_drinks ? '✓ Included' : '✗ Not included'}  valueColor={boat.includes_drinks ? '#22c55e' : muted} />
          </Section>

          {/* Amenities */}
          {boat.boat_features.filter((f) => !f.feature.startsWith('__REFUND_POLICY__::')).length > 0 && (
            <Section title="Amenities">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px 0' }}>
                {boat.boat_features.filter((f) => !f.feature.startsWith('__REFUND_POLICY__::')).map((f, i) => (
                  <span key={i} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}` }}>{f.feature}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Bookings stats */}
          <Section title="Bookings">
            <SpecRow label="Total bookings"     value={boat.bookings.total} />
            <SpecRow label="Confirmed/completed" value={boat.bookings.confirmed} valueColor="#22c55e" />
            <SpecRow label="Pending"            value={boat.bookings.pending}   valueColor={boat.bookings.pending > 0 ? '#f59e0b' : muted} />
          </Section>

          {/* Meta */}
          <Section title="Meta">
            <SpecRow label="Slug"       value={<code style={{ fontSize: '11px', color: muted }}>{boat.slug}</code>} />
            <SpecRow label="Boat ID"    value={<code style={{ fontSize: '11px', color: muted }}>{boat.id}</code>} />
            <SpecRow label="Created"    value={new Date(boat.created_at).toLocaleString('en-GB')} />
          </Section>

          {/* ── Admin: status & revision note ── */}
          <AdminStatusControl boat={boat} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {(boat.status === 'draft' || boat.status === 'paused') && (
              <ApproveButton boat={boat} />
            )}
            {boat.status === 'active' && (
              <Link href={`/boats/${boat.slug}`} target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 22px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                View live page <ExternalLink style={{ width: 13, height: 13 }} />
              </Link>
            )}
            <Link href={`/host/listings/${boat.id}`} target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 22px', borderRadius: '99px', background: goldFaint, border: `1px solid ${goldBorder}`, color: gold, fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
              Open in editor <ExternalLink style={{ width: 13, height: 13 }} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Lightbox overlay ── */}
      {lightbox !== null && sortedImages[lightbox] && (
        <div
          onClick={(e) => { e.stopPropagation(); setLightbox(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', cursor: 'zoom-out' }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null) }}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>

          {/* Prev */}
          {lightbox > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1) }}
              style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)', borderRadius: '50%', width: 48, height: 48, cursor: 'pointer', color: text, fontSize: '24px', fontWeight: 700 }}
            >
              ‹
            </button>
          )}

          <img
            src={sortedImages[lightbox].storage_url}
            alt={`${boat.name} ${lightbox + 1}/${sortedImages.length}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px', cursor: 'default', boxShadow: '0 20px 60px rgba(0,0,0,0.65)' }}
          />

          {/* Next */}
          {lightbox < sortedImages.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1) }}
              style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)', borderRadius: '50%', width: 48, height: 48, cursor: 'pointer', color: text, fontSize: '24px', fontWeight: 700 }}
            >
              ›
            </button>
          )}

          {/* Counter */}
          <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', padding: '8px 16px', borderRadius: '50px', background: 'rgba(0,0,0,0.60)', color: text, fontSize: '13px', fontWeight: 600, backdropFilter: 'blur(8px)' }}>
            {lightbox + 1} / {sortedImages.length}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '11px', fontWeight: 700, color: gold, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: '8px' }}>{title}</h3>
      <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: '10px', padding: '4px 14px', border: '1px solid rgba(255,255,255,0.05)' }}>
        {children}
      </div>
    </div>
  )
}

function SpecRow({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', gap: '16px' }}>
      <span style={{ fontSize: '12px', color: muted, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: '13px', color: valueColor ?? text, fontWeight: 600, textAlign: 'right', textTransform: typeof value === 'string' && (value as string).includes('_') ? 'none' : undefined }}>{value}</span>
    </div>
  )
}

function ApproveButton({ boat }: { boat: Boat }) {
  const [loading, setLoading] = useState(false)
  const [approved, setApproved] = useState(false)

  async function approve() {
    if (!confirm(`Approve & activate "${boat.name}"?\n\nThis will make the listing visible to guests immediately.`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/boat-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Don't send adminNote on a simple approve — keeps it working
        // even if the admin_note DB column hasn't been added yet.
        body: JSON.stringify({ boatId: boat.id, status: 'active' }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(`Approve failed: ${json.error ?? 'unknown'}`)
        return
      }
      setApproved(true)
      if (!json.emailSent && json.emailError) {
        alert(`Listing approved & live ✓\n\nBut the host email didn't send: ${json.emailError}`)
      }
      setTimeout(() => window.location.reload(), 1200)
    } finally {
      setLoading(false)
    }
  }

  if (approved) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '99px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.40)', color: '#22c55e', fontSize: '13px', fontWeight: 700 }}>
        ✓ Approved — refreshing…
      </div>
    )
  }

  return (
    <button
      onClick={approve}
      disabled={loading}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 26px', borderRadius: '99px', background: 'linear-gradient(135deg,#22c55e,#16a34a,#15803d)', color: '#fff', fontSize: '13px', fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, boxShadow: '0 4px 14px rgba(34,197,94,0.30)' }}
    >
      {loading ? 'Approving…' : '✓ Approve & activate'}
    </button>
  )
}

function AdminStatusControl({ boat }: { boat: Boat }) {
  const [status, setStatus] = useState(boat.status)
  const [note, setNote] = useState(boat.admin_note ?? '')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dirty = status !== boat.status || (note || '') !== (boat.admin_note ?? '')

  async function save() {
    setSaving(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/admin/boat-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boatId: boat.id, status, adminNote: note }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      let msg = '✅ Listing updated'
      if (json.emailSent) msg += ' · host notified by email ✉️'
      else if (json.emailError) msg += ` · ⚠️ email: ${json.emailError}`
      setResult(msg)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const statusColors: Record<string, { bg: string; bd: string; co: string }> = {
    active: { bg: 'rgba(34,197,94,0.10)', bd: 'rgba(34,197,94,0.30)', co: '#22c55e' },
    paused: { bg: 'rgba(245,158,11,0.10)', bd: 'rgba(245,158,11,0.30)', co: '#f59e0b' },
    draft:  { bg: 'rgba(255,255,255,0.05)', bd: 'rgba(255,255,255,0.12)', co: muted },
  }

  return (
    <div style={{ marginTop: '24px', padding: '20px', borderRadius: '14px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.22)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '14px', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🛡️ Admin · Status & Revision</span>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Status</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['active', 'paused', 'draft'] as const).map((opt) => {
            const s = statusColors[opt]
            const active = status === opt
            return (
              <button
                key={opt}
                onClick={() => setStatus(opt)}
                style={{ padding: '7px 14px', borderRadius: '50px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', background: active ? s.bg : 'transparent', border: `1px solid ${active ? s.bd : 'rgba(255,255,255,0.10)'}`, color: active ? s.co : muted }}
              >
                {opt === 'active' ? '✓ Active' : opt === 'paused' ? '⏸ Pause' : '📋 Move to drafts'}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
          Note to host (what needs to be added or fixed)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder='Example: "Please add at least 3 boat photos and a valid insurance certificate before we can re-activate this listing."'
          style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#0a1523', border: '1px solid rgba(245,158,11,0.30)', color: text, fontSize: '13px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5, fontFamily: 'inherit' }}
        />
        <p style={{ fontSize: '11px', color: 'rgba(244,244,242,0.40)', margin: '6px 0 0' }}>
          The host will see this note on their dashboard and in the listing editor. They&apos;ll also receive an email if status is paused or moved to drafts.
        </p>
      </div>

      {result && (
        <div style={{ marginBottom: '10px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.28)', color: '#22c55e', fontSize: '12px' }}>
          {result}
        </div>
      )}
      {error && (
        <div style={{ marginBottom: '10px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.28)', color: '#f87171', fontSize: '12px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={save}
          disabled={saving || !dirty}
          style={{ padding: '10px 22px', borderRadius: '50px', background: dirty ? 'linear-gradient(135deg,#fbbf24,#74cfe8,#4fb8d6)' : 'rgba(255,255,255,0.06)', color: dirty ? '#07101e' : muted, fontSize: '13px', fontWeight: 700, border: 'none', cursor: dirty && !saving ? 'pointer' : 'not-allowed', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving…' : 'Save status & notify host'}
        </button>
        {!dirty && <span style={{ fontSize: '11px', color: 'rgba(244,244,242,0.40)' }}>No changes</span>}
      </div>
    </div>
  )
}
