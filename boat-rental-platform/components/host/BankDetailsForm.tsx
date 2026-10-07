'use client'

import { useState } from 'react'
import { Banknote, Check, Loader2, Pencil, Lock, Globe2, Building2, User } from 'lucide-react'

const gold = '#74cfe8'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const faint = 'rgba(244,244,242,0.35)'
const inputBg = 'rgba(255,255,255,0.05)'
const inputBorder = 'rgba(255,255,255,0.14)'

// SEPA zone — for these countries an IBAN is all an Estonian bank needs (EUR, no SWIFT).
const SEPA = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT',
  'LV','LI','LT','LU','MT','MC','NL','NO','PL','PT','RO','SK','SI','ES','SE','CH','GB','SM','AD','VA','GI',
])

const COUNTRIES: { code: string; name: string }[] = [
  { code: 'ES', name: 'Spain' }, { code: 'GR', name: 'Greece' }, { code: 'EE', name: 'Estonia' },
  { code: 'IT', name: 'Italy' }, { code: 'FR', name: 'France' }, { code: 'PT', name: 'Portugal' },
  { code: 'DE', name: 'Germany' }, { code: 'NL', name: 'Netherlands' }, { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' }, { code: 'MT', name: 'Malta' }, { code: 'IE', name: 'Ireland' },
  { code: 'BE', name: 'Belgium' }, { code: 'AT', name: 'Austria' }, { code: 'SE', name: 'Sweden' },
  { code: 'DK', name: 'Denmark' }, { code: 'FI', name: 'Finland' }, { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland' }, { code: 'CH', name: 'Switzerland' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'TH', name: 'Thailand' }, { code: 'AE', name: 'United Arab Emirates' }, { code: 'TR', name: 'Turkey' },
  { code: 'ME', name: 'Montenegro' }, { code: 'US', name: 'United States' },
  { code: 'CW', name: 'Curaçao' }, { code: 'AW', name: 'Aruba' }, { code: 'MX', name: 'Mexico' },
  { code: 'SC', name: 'Seychelles' }, { code: 'MU', name: 'Mauritius' }, { code: 'BS', name: 'Bahamas' },
  { code: 'OTHER', name: 'Other country…' },
]

const CURRENCIES = ['EUR', 'USD', 'GBP', 'THB', 'AED', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'TRY']

export type PayoutMethod = {
  account_holder_name: string
  account_holder_type: string
  account_holder_address: string | null
  bank_country: string
  bank_name: string | null
  iban: string | null
  account_number: string | null
  swift_bic: string | null
  currency: string
  is_sepa: boolean
  notes: string | null
  updated_at?: string
} | null

function mask(s?: string | null): string {
  if (!s) return ''
  const t = s.replace(/\s+/g, '')
  return t.length <= 4 ? t : '•••• •••• ' + t.slice(-4)
}
function countryName(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code
}

export default function BankDetailsForm({ initial }: { initial: PayoutMethod }) {
  const [saved, setSaved] = useState<PayoutMethod>(initial)
  const [editing, setEditing] = useState(!initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    account_holder_name: initial?.account_holder_name ?? '',
    account_holder_type: initial?.account_holder_type ?? 'individual',
    account_holder_address: initial?.account_holder_address ?? '',
    bank_country: initial?.bank_country ?? 'ES',
    bank_name: initial?.bank_name ?? '',
    iban: initial?.iban ?? '',
    account_number: initial?.account_number ?? '',
    swift_bic: initial?.swift_bic ?? '',
    currency: initial?.currency ?? 'EUR',
    notes: initial?.notes ?? '',
  })
  // When the country isn't in the list, the host picks "Other country…" and types it here.
  const [otherCountry, setOtherCountry] = useState('')

  const isSepa = SEPA.has(form.bank_country)
  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function save() {
    setError(null)
    const effectiveCountry = form.bank_country === 'OTHER' ? otherCountry.trim() : form.bank_country
    if (!effectiveCountry || effectiveCountry.toUpperCase() === 'OTHER') { setError('Please enter your bank country.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/payout-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, bank_country: effectiveCountry }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error ?? 'Could not save. Please try again.'); return }
      setSaved({
        account_holder_name: form.account_holder_name,
        account_holder_type: form.account_holder_type,
        account_holder_address: form.account_holder_address || null,
        bank_country: effectiveCountry,
        bank_name: form.bank_name || null,
        iban: form.iban || null,
        account_number: form.account_number || null,
        swift_bic: form.swift_bic || null,
        currency: form.currency,
        is_sepa: isSepa,
        notes: form.notes || null,
      })
      setEditing(false)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }
  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: '10px', background: inputBg, border: `1px solid ${inputBorder}`, color: text, fontSize: '14px', outline: 'none' }

  /* ───────────────── Saved (collapsed) view ───────────────── */
  if (saved && !editing) {
    const rows: [string, string][] = [
      ['Account holder', `${saved.account_holder_name}${saved.account_holder_type === 'company' ? ' (Company)' : ''}`],
      ['Bank country', `${countryName(saved.bank_country)}${saved.is_sepa ? ' · SEPA' : ' · International'}`],
      saved.bank_name ? ['Bank', saved.bank_name] as [string, string] : null,
      saved.iban ? ['IBAN', mask(saved.iban)] as [string, string] : null,
      saved.account_number ? ['Account no.', mask(saved.account_number)] as [string, string] : null,
      saved.swift_bic ? ['SWIFT / BIC', saved.swift_bic] as [string, string] : null,
      ['Currency', saved.currency],
    ].filter(Boolean) as [string, string][]

    return (
      <div style={{ background: '#0c1828', border: '1px solid rgba(34,197,94,0.28)', borderRadius: '20px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <span style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Check style={{ width: 17, height: 17, color: '#22c55e' }} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: text, fontSize: '15px' }}>Bank account on file</div>
            <div style={{ fontSize: '12px', color: muted }}>We&apos;ll send your payouts here after each charter.</div>
          </div>
          <button onClick={() => setEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', background: 'rgba(116,207,232,0.10)', border: '1px solid rgba(116,207,232,0.30)', color: gold, fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
            <Pencil style={{ width: 13, height: 13 }} /> Update
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '11px 14px', background: '#0c1828' }}>
              <span style={{ fontSize: '13px', color: muted }}>{k}</span>
              <span style={{ fontSize: '13px', color: text, fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '14px', fontSize: '12px', color: faint }}>
          <Lock style={{ width: 12, height: 12, flexShrink: 0 }} />
          Stored securely · only visible to BoatHire24&apos;s payouts team.
        </div>
      </div>
    )
  }

  /* ───────────────── Edit / add form ───────────────── */
  return (
    <div style={{ background: '#0c1828', border: '1px solid rgba(116,207,232,0.22)', borderRadius: '20px', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <span style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(116,207,232,0.10)', border: '1px solid rgba(116,207,232,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Banknote style={{ width: 17, height: 17, color: gold }} />
        </span>
        <div>
          <div style={{ fontWeight: 800, color: text, fontSize: '16px' }}>Add your bank account</div>
          <div style={{ fontSize: '12px', color: muted }}>Get paid by bank transfer — no Stripe account needed.</div>
        </div>
      </div>

      <p style={{ fontSize: '12px', color: faint, lineHeight: 1.6, margin: '4px 0 18px' }}>
        We pay your earnings (85% of each booking) directly from our EU business bank. Enter the account exactly as it appears at your bank.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Account holder type */}
        <div>
          <label style={labelStyle}>Account type</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { v: 'individual', label: 'Individual', Icon: User },
              { v: 'company', label: 'Company', Icon: Building2 },
            ].map(({ v, label, Icon }) => {
              const on = form.account_holder_type === v
              return (
                <button key={v} type="button" onClick={() => set('account_holder_type', v)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: on ? 'rgba(116,207,232,0.12)' : inputBg, border: `1px solid ${on ? 'rgba(116,207,232,0.45)' : inputBorder}`, color: on ? gold : muted }}>
                  <Icon style={{ width: 15, height: 15 }} /> {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Account holder name */}
        <div>
          <label style={labelStyle}>Account holder name *</label>
          <input value={form.account_holder_name} onChange={(e) => set('account_holder_name', e.target.value)} placeholder={form.account_holder_type === 'company' ? 'Company legal name' : 'Full name on the account'} style={inputStyle} />
        </div>

        {/* Country + currency */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 200px' }}>
            <label style={labelStyle}>Bank country *</label>
            <select value={form.bank_country} onChange={(e) => set('bank_country', e.target.value)} style={{ ...inputStyle, cursor: 'pointer', colorScheme: 'dark' }}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code} style={{ background: '#0c1828' }}>{c.name}</option>)}
            </select>
            {form.bank_country === 'OTHER' && (
              <input value={otherCountry} onChange={(e) => setOtherCountry(e.target.value)} placeholder="Type your country (e.g. Curaçao)" style={{ ...inputStyle, marginTop: '8px' }} />
            )}
          </div>
          <div style={{ flex: '1 1 110px' }}>
            <label style={labelStyle}>Currency</label>
            <select value={form.currency} onChange={(e) => set('currency', e.target.value)} style={{ ...inputStyle, cursor: 'pointer', colorScheme: 'dark' }}>
              {CURRENCIES.map((c) => <option key={c} value={c} style={{ background: '#0c1828' }}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Rail hint */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 13px', borderRadius: '10px', background: isSepa ? 'rgba(34,197,94,0.07)' : 'rgba(59,130,246,0.07)', border: `1px solid ${isSepa ? 'rgba(34,197,94,0.22)' : 'rgba(59,130,246,0.22)'}` }}>
          <Globe2 style={{ width: 14, height: 14, color: isSepa ? '#22c55e' : '#60a5fa', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: muted, lineHeight: 1.5 }}>
            {isSepa
              ? <>SEPA transfer — your <strong style={{ color: text }}>IBAN</strong> is all we need.</>
              : <>International transfer — we&apos;ll need your <strong style={{ color: text }}>account number &amp; SWIFT/BIC</strong>.</>}
          </span>
        </div>

        {/* Bank name */}
        <div>
          <label style={labelStyle}>Bank name {isSepa ? '' : '*'}</label>
          <input value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} placeholder="e.g. Banco Santander, Bangkok Bank" style={inputStyle} />
        </div>

        {/* SEPA: IBAN + optional BIC.  Non-SEPA: account number + SWIFT (required) */}
        {isSepa ? (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 220px' }}>
              <label style={labelStyle}>IBAN *</label>
              <input value={form.iban} onChange={(e) => set('iban', e.target.value.toUpperCase())} placeholder="ES00 0000 0000 0000 0000 0000" autoComplete="off" spellCheck={false} style={{ ...inputStyle, letterSpacing: '0.04em', fontFamily: 'ui-monospace, monospace' }} />
            </div>
            <div style={{ flex: '1 1 130px' }}>
              <label style={labelStyle}>BIC / SWIFT</label>
              <input value={form.swift_bic} onChange={(e) => set('swift_bic', e.target.value.toUpperCase())} placeholder="Optional" autoComplete="off" spellCheck={false} style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: '2 1 200px' }}>
                <label style={labelStyle}>Account number / IBAN *</label>
                <input value={form.account_number} onChange={(e) => set('account_number', e.target.value)} placeholder="Account number" autoComplete="off" spellCheck={false} style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }} />
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label style={labelStyle}>SWIFT / BIC *</label>
                <input value={form.swift_bic} onChange={(e) => set('swift_bic', e.target.value.toUpperCase())} placeholder="BKKBTHBK" autoComplete="off" spellCheck={false} style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Account holder address *</label>
              <input value={form.account_holder_address} onChange={(e) => set('account_holder_address', e.target.value)} placeholder="Street, city, country (required for international transfers)" style={inputStyle} />
            </div>
          </>
        )}

        {/* Notes */}
        <div>
          <label style={labelStyle}>Notes for our payouts team (optional)</label>
          <input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. intermediary bank, reference to quote" style={inputStyle} />
        </div>

        {error && (
          <div style={{ padding: '11px 14px', borderRadius: '10px', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.30)', color: '#fca5a5', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={save} disabled={saving}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', borderRadius: '12px', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', fontSize: '14px', fontWeight: 800, border: 'none', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 18px rgba(116,207,232,0.25)' }}>
            {saving ? <><Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> Saving…</> : <>Save bank details</>}
          </button>
          {saved && (
            <button onClick={() => { setEditing(false); setError(null) }} disabled={saving}
              style={{ padding: '13px 18px', borderRadius: '12px', background: 'transparent', border: `1px solid ${inputBorder}`, color: muted, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: faint }}>
          <Lock style={{ width: 12, height: 12, flexShrink: 0 }} />
          Encrypted at rest · used only to pay you · never shared with guests.
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg) } }' }} />
    </div>
  )
}
