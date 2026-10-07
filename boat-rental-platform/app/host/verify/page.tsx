'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ShieldCheck, Upload, CheckCircle, AlertCircle, User, Building2 } from 'lucide-react'

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.10)'
const goldBorder = 'rgba(116,207,232,0.22)'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

const INPUT: React.CSSProperties = {
  display: 'none',
}

interface DocUpload {
  file: File | null
  label: string
  required: boolean
  accept: string
}

interface DocState {
  passport: File | null
  company_registration: File | null
  boat_registration: File | null
  marina_contract: File | null
  boat_insurance: File | null
}

function FileField({
  docKey, label, required, desc, file, onChange,
}: {
  docKey: string; label: string; required: boolean; desc: string
  file: File | null; onChange: (f: File | null) => void
}) {
  return (
    <label style={{ display: 'block', cursor: 'pointer' }}>
      <div style={{
        padding: '16px 18px', borderRadius: '12px',
        background: file ? 'rgba(34,197,94,0.07)' : goldFaint,
        border: `1px solid ${file ? 'rgba(34,197,94,0.30)' : goldBorder}`,
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: '10px', background: file ? 'rgba(34,197,94,0.12)' : goldFaint, border: `1px solid ${file ? 'rgba(34,197,94,0.25)' : goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {file
            ? <CheckCircle style={{ width: 18, height: 18, color: '#22c55e' }} />
            : <Upload style={{ width: 16, height: 16, color: gold }} />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: text, marginBottom: '2px' }}>
            {label}{required && <span style={{ color: '#f87171', marginLeft: '4px' }}>*</span>}
          </div>
          <div style={{ fontSize: '12px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file ? file.name : desc}
          </div>
        </div>
        {file && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onChange(null) }}
            style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', padding: '4px', flexShrink: 0, fontSize: '16px', lineHeight: 1 }}
          >
            ×
          </button>
        )}
      </div>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        style={INPUT}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  )
}

export default function VerifyPage() {
  const router = useRouter()
  const [ownerType, setOwnerType] = useState<'individual' | 'company'>('individual')
  const [docs, setDocs] = useState<DocState>({
    passport: null, company_registration: null, boat_registration: null,
    marina_contract: null, boat_insurance: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof DocState) => (f: File | null) => setDocs((d) => ({ ...d, [key]: f }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (ownerType === 'individual' && !docs.passport) {
      setError('Passport / ID copy is required for individual owners.')
      return
    }
    if (ownerType === 'company') {
      if (!docs.company_registration) {
        setError('Company registration document is required for company owners.')
        return
      }
      if (!docs.passport) {
        setError("The director's / owner's passport or ID is also required for company owners.")
        return
      }
    }
    setError('')
    setSubmitting(true)

    try {
      const supabase = createClient()
      const fileEntries = Object.entries(docs).filter(([, f]) => !!f) as [string, File][]

      // 1) Ask the server for a signed upload URL per file
      const presignRes = await fetch('/api/verify-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: fileEntries.map(([type, file]) => ({ type, ext: file.name.split('.').pop() ?? 'pdf' })),
        }),
      })
      const presign = await presignRes.json()
      if (!presignRes.ok || !presign.uploads) throw new Error(presign.error ?? 'Could not start upload')

      // 2) Upload each file DIRECTLY to Supabase Storage (bypasses Vercel's 4.5MB limit)
      const uploaded: { type: string; name: string; path: string }[] = []
      for (const up of presign.uploads as { type: string; path: string; token: string }[]) {
        const file = docs[up.type as keyof DocState]
        if (!file) continue
        const { error: upErr } = await supabase.storage
          .from('verification-docs')
          .uploadToSignedUrl(up.path, up.token, file)
        if (upErr) throw new Error(`Upload failed for ${up.type.replace(/_/g, ' ')}: ${upErr.message}`)
        uploaded.push({ type: up.type, name: file.name, path: up.path })
      }

      // 3) Tell the server which files were uploaded (small JSON only)
      const res = await fetch('/api/verify-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerType, docs: uploaded }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Submission failed')
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ background: '#07101e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', color: text }}>
        <div style={{ textAlign: 'center', maxWidth: '440px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <ShieldCheck style={{ width: 36, height: 36, color: '#22c55e' }} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '12px' }}>Documents submitted!</h1>
          <p style={{ fontSize: '15px', color: muted, lineHeight: 1.65, marginBottom: '28px' }}>
            We've received your verification documents and sent them to our team at info@boathire24.com. We'll review and respond within 1–2 business days.
          </p>
          <div style={{ padding: '16px 20px', borderRadius: '12px', background: goldFaint, border: `1px solid ${goldBorder}`, marginBottom: '28px', textAlign: 'left' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: gold, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: '8px' }}>What happens next</p>
            {['Our team reviews your documents (1–2 business days)', 'You receive an email with the decision', 'Once verified, your listings become visible to guests'].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '6px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: goldFaint, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: gold, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: '13px', color: muted }}>{step}</span>
              </div>
            ))}
          </div>
          <Link href="/host" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 20px 80px' }}>

        <Link href="/host" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: muted, textDecoration: 'none', marginBottom: '28px' }}>
          <ChevronLeft style={{ width: 15, height: 15 }} /> Host Dashboard
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div style={{ width: 52, height: 52, borderRadius: '14px', background: goldFaint, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck style={{ width: 24, height: 24, color: gold }} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: text, marginBottom: '4px' }}>Verify your account</h1>
            <p style={{ fontSize: '14px', color: muted }}>Required before your listings go live to guests</p>
          </div>
        </div>

        {/* Why required */}
        <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(116,207,232,0.06)', border: `1px solid ${goldBorder}`, marginBottom: '28px' }}>
          <p style={{ fontSize: '13px', color: muted, lineHeight: 1.65, margin: 0 }}>
            BoatHire24 verifies all hosts to ensure guests can book with confidence. Documents are reviewed by our team and are <strong style={{ color: text }}>never shared publicly</strong>. Verification typically takes 1–2 business days.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Owner type */}
          <div style={{ marginBottom: '28px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>I am listing as</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {([
                { value: 'individual', Icon: User, label: 'Individual', desc: 'Personal boat owner' },
                { value: 'company', Icon: Building2, label: 'Company', desc: 'Business / charter operator' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOwnerType(opt.value)}
                  style={{ padding: '16px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer', background: ownerType === opt.value ? goldFaint : 'rgba(255,255,255,0.03)', border: `2px solid ${ownerType === opt.value ? gold : 'rgba(255,255,255,0.10)'}`, transition: 'all 0.15s' }}
                >
                  <opt.Icon style={{ width: 20, height: 20, color: ownerType === opt.value ? gold : muted, marginBottom: '8px' }} />
                  <div style={{ fontWeight: 700, fontSize: '14px', color: ownerType === opt.value ? text : muted }}>{opt.label}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(244,244,242,0.35)', marginTop: '2px' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: text, marginBottom: '4px' }}>
              {ownerType === 'individual' ? 'Required documents' : 'Required documents (company)'}
            </p>

            {ownerType === 'individual' && (
              <FileField
                docKey="passport" label="Passport or National ID" required
                desc="Clear photo or scan — PDF, JPG, PNG"
                file={docs.passport} onChange={set('passport')}
              />
            )}

            {ownerType === 'company' && (
              <>
                <FileField
                  docKey="company_registration" label="Company Registration Certificate" required
                  desc="Official registration document — PDF, JPG, PNG"
                  file={docs.company_registration} onChange={set('company_registration')}
                />
                <FileField
                  docKey="passport" label="Director / Owner Passport or ID" required
                  desc="Photo ID of the company's authorised representative — PDF, JPG, PNG"
                  file={docs.passport} onChange={set('passport')}
                />
              </>
            )}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '4px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: muted, marginBottom: '10px' }}>Boat documentation — provide at least one:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <FileField
                  docKey="boat_registration" label="Boat Registration Card"
                  required={false} desc="Official boat registration — PDF, JPG, PNG"
                  file={docs.boat_registration} onChange={set('boat_registration')}
                />
                <FileField
                  docKey="marina_contract" label="Marina Contract / Berth Agreement"
                  required={false} desc="Current marina berth contract — PDF, JPG, PNG"
                  file={docs.marina_contract} onChange={set('marina_contract')}
                />
                <FileField
                  docKey="boat_insurance" label="Boat Insurance Certificate"
                  required={false} desc="Valid insurance certificate — PDF, JPG, PNG"
                  file={docs.boat_insurance} onChange={set('boat_insurance')}
                />
              </div>
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: '13px', marginBottom: '20px' }}>
              <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ width: '100%', padding: '14px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '15px', fontWeight: 700, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, boxShadow: '0 4px 18px rgba(116,207,232,0.25)' }}
          >
            {submitting ? 'Uploading & sending…' : 'Submit for verification'}
          </button>

          <p style={{ fontSize: '12px', color: 'rgba(244,244,242,0.30)', textAlign: 'center', marginTop: '12px' }}>
            Documents are sent securely to info@boathire24.com and reviewed by our team only.
          </p>
        </form>
      </div>
    </div>
  )
}
