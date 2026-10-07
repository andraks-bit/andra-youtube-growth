'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Upload, ChevronLeft, CheckCircle, AlertCircle, FileText, X } from 'lucide-react'

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.10)'
const goldBorder = 'rgba(116,207,232,0.22)'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

type Location = { id: string; name: string; city: string; country: string }

interface ParsedBoat {
  name: string
  type: string
  length_m: number
  capacity_pax: number
  hourly_price: number
  daily_price: number
  departure_port: string
  includes_skipper: boolean
  includes_fuel: boolean
  includes_drinks: boolean
  errors: string[]
}

const VALID_TYPES = ['motor_yacht', 'catamaran', 'sailing', 'speedboat', 'fishing', 'rib', 'luxury', 'gulet']

function parseCSV(text: string): ParsedBoat[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''))
  const rows = lines.slice(1)

  return rows.map((row) => {
    const values = row.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const get = (key: string) => values[headers.indexOf(key)] ?? ''

    const name = get('name')
    const type = get('type').toLowerCase().replace(/\s+/g, '_')
    const length_m = parseFloat(get('length_m') || get('length'))
    const capacity_pax = parseInt(get('capacity_pax') || get('capacity'))
    const hourly_price = parseFloat(get('hourly_price') || get('price_per_hour') || '0')
    const daily_price = parseFloat(get('daily_price') || get('price_per_day') || '0')
    const departure_port = get('departure_port') || get('port')
    const includes_skipper = ['true', 'yes', '1'].includes(get('includes_skipper').toLowerCase())
    const includes_fuel = ['true', 'yes', '1'].includes(get('includes_fuel').toLowerCase())
    const includes_drinks = ['true', 'yes', '1'].includes(get('includes_drinks').toLowerCase())

    const errors: string[] = []
    if (!name) errors.push('Name required')
    if (!VALID_TYPES.includes(type)) errors.push(`Type "${type}" invalid (use: ${VALID_TYPES.join(', ')})`)
    if (isNaN(capacity_pax) || capacity_pax < 1) errors.push('Capacity must be ≥ 1')
    if (hourly_price === 0 && daily_price === 0) errors.push('At least one price required')

    return { name, type, length_m, capacity_pax, hourly_price, daily_price, departure_port, includes_skipper, includes_fuel, includes_drinks, errors }
  })
}

const TEMPLATE_CSV = `name,type,length_m,capacity_pax,hourly_price,daily_price,departure_port,includes_skipper,includes_fuel,includes_drinks
"Sunseeker 48",motor_yacht,14.6,8,350,2500,"Puerto Banús",true,false,false
"Bavaria 44 Cruiser",sailing,13.4,8,0,1200,"Marbella Marina",false,false,false
"Lagoon 42 Cat",catamaran,12.8,10,0,1800,"Puerto Banús",true,true,true`

interface Props {
  userId: string
  locations: Location[]
}

export default function FleetImportClient({ userId, locations }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [boats, setBoats] = useState<ParsedBoat[]>([])
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '')
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)
  const [fileName, setFileName] = useState('')

  function handleFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setBoats(parseCSV(text))
    }
    reader.readAsText(file)
  }

  const validBoats = boats.filter((b) => b.errors.length === 0)
  const invalidBoats = boats.filter((b) => b.errors.length > 0)

  async function handleImport() {
    if (!locationId || validBoats.length === 0) return
    setImporting(true)

    const supabase = createClient()
    let success = 0
    let failed = 0

    for (const boat of validBoats) {
      const slug = `${boat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Math.random().toString(36).slice(2, 6)}`

      const { data: newBoat, error } = await supabase
        .from('boats')
        .insert({
          host_id: userId,
          location_id: locationId,
          slug,
          name: boat.name,
          type: boat.type,
          length_m: isNaN(boat.length_m) ? null : boat.length_m,
          capacity_pax: boat.capacity_pax,
          departure_port: boat.departure_port || null,
          includes_skipper: boat.includes_skipper,
          includes_fuel: boat.includes_fuel,
          includes_drinks: boat.includes_drinks,
          min_hours: 2,
          pricing_type: boat.hourly_price > 0 ? 'hourly' : 'daily',
          instant_book: false,
          cancellation_policy: 'flexible',
          // Self-serve imports publish immediately; the host can delist from My listings.
          status: 'active',
        })
        .select('id')
        .single()

      if (error || !newBoat) { failed++; continue }

      // Create pricing rows
      const pricingRows = []
      if (boat.hourly_price > 0) {
        pricingRows.push({ boat_id: newBoat.id, duration_hours: 2, price: boat.hourly_price * 2, currency: 'EUR', season: 'all' })
        pricingRows.push({ boat_id: newBoat.id, duration_hours: 4, price: boat.hourly_price * 4, currency: 'EUR', season: 'all' })
        pricingRows.push({ boat_id: newBoat.id, duration_hours: 8, price: boat.hourly_price * 8, currency: 'EUR', season: 'all' })
      }
      if (boat.daily_price > 0) {
        pricingRows.push({ boat_id: newBoat.id, duration_hours: 24, price: boat.daily_price, currency: 'EUR', season: 'all' })
      }
      if (pricingRows.length > 0) {
        await supabase.from('boat_pricing').insert(pricingRows)
      }

      success++
    }

    setResult({ success, failed })
    setImporting(false)
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'boathire24-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (result) {
    return (
      <div style={{ background: '#07101e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', color: text }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <CheckCircle style={{ width: 64, height: 64, color: '#22c55e', margin: '0 auto 20px' }} />
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '10px' }}>Import complete</h1>
          <p style={{ fontSize: '15px', color: muted, marginBottom: '8px' }}>
            <strong style={{ color: '#22c55e' }}>{result.success} boats</strong> created as drafts.
            {result.failed > 0 && <> · <strong style={{ color: '#f87171' }}>{result.failed} failed.</strong></>}
          </p>
          <p style={{ fontSize: '13px', color: muted, marginBottom: '32px' }}>Review each listing to add photos and activate.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/host/listings" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
              View all listings
            </Link>
            <button onClick={() => { setBoats([]); setResult(null); setFileName('') }} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', border: `1px solid ${goldBorder}`, color: gold, fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: goldFaint }}>
              Import more
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Back + Header */}
        <Link href="/host/fleet" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: muted, textDecoration: 'none', marginBottom: '28px' }}>
          <ChevronLeft style={{ width: 15, height: 15 }} /> Fleet Manager
        </Link>

        <div style={{ marginBottom: '36px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '8px' }}>Bulk import boats</h1>
          <p style={{ fontSize: '15px', color: muted }}>Upload a CSV to create multiple listings as drafts. You can review and activate each one afterwards.</p>
        </div>

        {/* CSV format guide + download */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '24px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText style={{ width: 18, height: 18, color: gold }} />
              <span style={{ fontWeight: 700, fontSize: '14px', color: text }}>CSV format</span>
            </div>
            <button
              onClick={downloadTemplate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '99px', background: goldFaint, border: `1px solid ${goldBorder}`, color: gold, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Download template
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Column', 'Required', 'Example'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: muted, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['name', 'Yes', '"Sunseeker 48"'],
                  ['type', 'Yes', 'motor_yacht | catamaran | sailing | speedboat | fishing | rib | luxury | gulet'],
                  ['length_m', 'No', '14.6'],
                  ['capacity_pax', 'Yes', '8'],
                  ['hourly_price', 'Yes*', '350'],
                  ['daily_price', 'Yes*', '2500'],
                  ['departure_port', 'No', '"Puerto Banús"'],
                  ['includes_skipper', 'No', 'true / false'],
                  ['includes_fuel', 'No', 'true / false'],
                  ['includes_drinks', 'No', 'true / false'],
                ].map(([col, req, ex], i) => (
                  <tr key={col} style={{ borderBottom: i < 9 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '8px 12px', color: gold, fontFamily: 'monospace', fontWeight: 600 }}>{col}</td>
                    <td style={{ padding: '8px 12px', color: req === 'Yes' ? '#22c55e' : req === 'Yes*' ? '#f59e0b' : muted, fontSize: '11px', fontWeight: 600 }}>{req}</td>
                    <td style={{ padding: '8px 12px', color: muted, fontSize: '11px' }}>{ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(244,244,242,0.35)', marginTop: '12px' }}>* At least one of hourly_price or daily_price is required.</p>
        </div>

        {/* Location selector */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: muted, marginBottom: '8px' }}>Location for all imported boats</label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            style={{ width: '100%', maxWidth: '400px', padding: '11px 14px', borderRadius: '10px', background: card, border: `1px solid ${goldBorder}`, color: text, fontSize: '14px', outline: 'none', cursor: 'pointer' }}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}{loc.city !== loc.name ? ` — ${loc.city}` : ''}, {loc.country}</option>
            ))}
          </select>
        </div>

        {/* Drop zone */}
        {boats.length === 0 ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${dragging ? gold : goldBorder}`, borderRadius: '18px', padding: '56px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? goldFaint : 'transparent', transition: 'all 0.15s' }}
          >
            <Upload style={{ width: 40, height: 40, color: dragging ? gold : 'rgba(116,207,232,0.35)', margin: '0 auto 16px' }} />
            <p style={{ fontWeight: 700, fontSize: '15px', color: text, marginBottom: '6px' }}>Drop your CSV file here</p>
            <p style={{ fontSize: '13px', color: muted, marginBottom: '20px' }}>or click to browse</p>
            <span style={{ fontSize: '12px', padding: '6px 16px', borderRadius: '99px', background: goldFaint, border: `1px solid ${goldBorder}`, color: gold }}>Choose CSV file</span>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        ) : (
          <>
            {/* File indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', background: card, border: `1px solid ${border}`, marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText style={{ width: 16, height: 16, color: gold }} />
                <span style={{ fontSize: '14px', color: text, fontWeight: 600 }}>{fileName}</span>
                <span style={{ fontSize: '12px', color: muted }}>{boats.length} rows parsed</span>
              </div>
              <button onClick={() => { setBoats([]); setFileName('') }} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', display: 'flex', padding: '4px' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Summary pills */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '99px', background: 'rgba(34,197,94,0.10)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
                ✓ {validBoats.length} valid
              </span>
              {invalidBoats.length > 0 && (
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '99px', background: 'rgba(248,113,113,0.10)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                  ✗ {invalidBoats.length} with errors
                </span>
              )}
            </div>

            {/* Preview table */}
            <div style={{ background: card, borderRadius: '16px', border: `1px solid ${border}`, overflow: 'hidden', marginBottom: '28px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['', 'Name', 'Type', 'Length', 'Capacity', 'Hourly', 'Daily', 'Port', 'Extras'].map((h) => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: muted, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boats.map((boat, i) => (
                      <tr key={i} style={{ borderBottom: i < boats.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: boat.errors.length > 0 ? 'rgba(248,113,113,0.04)' : 'transparent' }}>
                        <td style={{ padding: '10px 12px', width: '28px' }}>
                          {boat.errors.length === 0
                            ? <CheckCircle style={{ width: 14, height: 14, color: '#22c55e' }} />
                            : (
                              <div title={boat.errors.join('\n')}>
                                <AlertCircle style={{ width: 14, height: 14, color: '#f87171' }} />
                              </div>
                            )
                          }
                        </td>
                        <td style={{ padding: '10px 12px', color: text, fontWeight: 600 }}>{boat.name || <span style={{ color: '#f87171' }}>—</span>}</td>
                        <td style={{ padding: '10px 12px', color: VALID_TYPES.includes(boat.type) ? muted : '#f87171', textTransform: 'capitalize' }}>{boat.type.replace(/_/g, ' ') || '—'}</td>
                        <td style={{ padding: '10px 12px', color: muted }}>{isNaN(boat.length_m) ? '—' : `${boat.length_m}m`}</td>
                        <td style={{ padding: '10px 12px', color: muted }}>{isNaN(boat.capacity_pax) ? <span style={{ color: '#f87171' }}>—</span> : `${boat.capacity_pax} pax`}</td>
                        <td style={{ padding: '10px 12px', color: muted }}>{boat.hourly_price > 0 ? `€${boat.hourly_price}/h` : '—'}</td>
                        <td style={{ padding: '10px 12px', color: muted }}>{boat.daily_price > 0 ? `€${boat.daily_price}` : '—'}</td>
                        <td style={{ padding: '10px 12px', color: muted }}>{boat.departure_port || '—'}</td>
                        <td style={{ padding: '10px 12px', color: muted, fontSize: '11px' }}>
                          {[boat.includes_skipper && 'skipper', boat.includes_fuel && 'fuel', boat.includes_drinks && 'drinks'].filter(Boolean).join(', ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Errors detail */}
            {invalidBoats.length > 0 && (
              <div style={{ marginBottom: '24px', padding: '16px 20px', borderRadius: '12px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.20)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <AlertCircle style={{ width: 15, height: 15, color: '#f87171' }} />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#f87171' }}>Rows with errors will be skipped</span>
                </div>
                {invalidBoats.slice(0, 5).map((boat, i) => (
                  <p key={i} style={{ fontSize: '12px', color: 'rgba(248,113,113,0.80)', margin: '4px 0' }}>
                    <strong>{boat.name || `Row ${i + 1}`}:</strong> {boat.errors.join(' · ')}
                  </p>
                ))}
              </div>
            )}

            {/* Import button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleImport}
                disabled={importing || validBoats.length === 0 || !locationId}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 28px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '14px', fontWeight: 700, cursor: importing || validBoats.length === 0 ? 'not-allowed' : 'pointer', opacity: validBoats.length === 0 ? 0.5 : 1, border: 'none', boxShadow: '0 4px 18px rgba(116,207,232,0.22)' }}
              >
                {importing ? 'Creating drafts…' : `Create ${validBoats.length} draft listing${validBoats.length !== 1 ? 's' : ''}`}
              </button>
              <Link href="/host/fleet" style={{ fontSize: '13px', color: muted, textDecoration: 'none' }}>Cancel</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
