'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight, ChevronLeft, Check, Sparkles, Globe, Upload, PenLine, ArrowRight } from 'lucide-react'
import type { Location } from '@/types/database'
import { COUNTRIES } from '@/lib/countries'
import { buildBoatSlug } from '@/lib/slug'
import { CURRENCIES, symbolOf } from '@/lib/listing-options'

interface WizardProps {
  locations: Pick<Location, 'id' | 'name' | 'city' | 'country'>[]
  initialData?: any
  boatId?: string
  /**
   * If set, this listing is created on behalf of the given user (admin concierge mode).
   * The boat's host_id will be this ID, not the current authenticated user's ID.
   * Server-side checks in the page already validate the caller is an admin.
   */
  targetHostId?: string
  /** Where to go after save (defaults to /host). Concierge edits return to the admin hub. */
  returnTo?: string
  /** Admin editing an existing boat they don't own → save via service-role API (RLS-safe). */
  conciergeEdit?: boolean
  /**
   * Links a newly-created listing back to the get-listed lead it belongs to
   * (boats.submission_id). Set when adding manually from a lead card so the boat
   * shows under that lead on /admin/boathire24. Only applied on create.
   */
  submissionId?: string
}

const STEPS = ['Basics', 'Specs & features', 'Pricing', 'Photos', 'Review & publish']
const DRAFT_KEY = 'bh24-listing-draft'

// Custom refund policy is stored as a namespaced boat_features row so it needs
// no DB migration. Anything after this prefix is the host's free-text policy.
export const REFUND_MARKER = '__REFUND_POLICY__::'

const BOAT_TYPES = [
  'motor_yacht', 'catamaran', 'sailing', 'speedboat', 'fishing', 'rib', 'luxury', 'jet_ski', 'jet_car', 'gulet',
]

const COMMON_FEATURES = [
  'WiFi', 'Air conditioning', 'Paddleboard', 'Snorkel gear', 'Bluetooth speaker',
  'BBQ grill', 'Fishing gear', 'Inflatable toys', 'Waterski', 'Wakeboard',
  'Sun canopy', 'Fresh water shower', 'Tender/dinghy', 'Jet ski',
]

/* ── tokens ── */
const card    = '#0c1828'
const border  = 'rgba(116,207,232,0.18)'
const gold    = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.10)'
const goldBorder = 'rgba(116,207,232,0.28)'
const text    = '#f4f4f2'
const muted   = 'rgba(244,244,242,0.55)'
const dim     = 'rgba(244,244,242,0.35)'
const inputBg = 'rgba(255,255,255,0.05)'
const inputBorder = 'rgba(255,255,255,0.14)'

interface FormData {
  name: string; tagline: string; description: string; type: string; locationId: string
  country: string; city: string
  departurePorts: string[]; capacityPax: number; lengthM: string; cabins: number
  builder: string; modelYear: string; includesSkipper: boolean; includesFuel: boolean
  includesDrinks: boolean; instantBook: boolean; cancellationPolicy: string; cancellationCustom: string; minHours: number
  pricingType: string; selectedFeatures: string[]; pricing: { durationHours: number; price: string }[]
  currency: string
  priceOnRequest: boolean
  isFishingTrip: boolean
  isBoatTour: boolean
  images: File[]
}

const INITIAL: FormData = {
  name: '', tagline: '', description: '', type: 'motor_yacht', locationId: '', country: '', city: '', departurePorts: [''],
  capacityPax: 8, lengthM: '', cabins: 0, builder: '', modelYear: '', includesSkipper: true,
  includesFuel: true, includesDrinks: false, instantBook: false, cancellationPolicy: 'moderate', cancellationCustom: '',
  minHours: 2, pricingType: 'hourly', selectedFeatures: [],
  pricing: [{ durationHours: 2, price: '' }, { durationHours: 4, price: '' }, { durationHours: 8, price: '' }],
  currency: 'EUR',
  priceOnRequest: false,
  isFishingTrip: false,
  isBoatTour: false,
  images: [],
}

function formFromInitial(d?: any): FormData {
  if (!d) return INITIAL
  const allFeatures: string[] = (d.boat_features ?? []).map((f: any) => f.feature)
  // Pull the custom refund policy out of the features list (it's stored there to avoid a migration)
  const refundRow = allFeatures.find((f) => f.startsWith(REFUND_MARKER))
  const customRefund = refundRow ? refundRow.slice(REFUND_MARKER.length) : ''
  const visibleFeatures = allFeatures.filter((f) => !f.startsWith(REFUND_MARKER))
  return {
    name: d.name ?? '', tagline: d.tagline ?? '', description: d.description ?? '',
    type: d.type ?? 'motor_yacht', locationId: d.location_id ?? '',
    country: d.locations?.country ?? '', city: d.locations?.city ?? '',
    departurePorts: (d.departure_port ?? '').split(' · ').map((s: string) => s.trim()).filter(Boolean).length
      ? (d.departure_port ?? '').split(' · ').map((s: string) => s.trim()).filter(Boolean)
      : [''],
    capacityPax: d.capacity_pax ?? 8,
    lengthM: d.length_m ? String(d.length_m) : '', cabins: d.cabins ?? 0,
    builder: d.builder ?? '', modelYear: d.model_year ? String(d.model_year) : '',
    includesSkipper: d.includes_skipper ?? true, includesFuel: d.includes_fuel ?? true,
    includesDrinks: d.includes_drinks ?? false, instantBook: d.instant_book ?? false,
    cancellationPolicy: customRefund ? 'custom' : (d.cancellation_policy ?? 'moderate'),
    cancellationCustom: customRefund,
    minHours: d.min_hours ?? 2,
    pricingType: d.pricing_type ?? 'hourly',
    selectedFeatures: visibleFeatures,
    pricing: (d.boat_pricing ?? []).length > 0
      ? (d.boat_pricing ?? []).map((p: any) => ({ durationHours: p.duration_hours, price: String(p.price) }))
      : INITIAL.pricing,
    currency: (d.boat_pricing ?? [])[0]?.currency ?? 'EUR',
    priceOnRequest: (d.boat_pricing ?? []).length === 0,
    isFishingTrip: d.is_fishing_trip ?? false,
    isBoatTour: d.is_boat_tour ?? false,
    images: [],
  }
}

/* ── shared field wrapper ── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '13px', fontWeight: 600, color: text, letterSpacing: '0.01em' }}>
        {label}{required && <span style={{ color: gold, marginLeft: '3px' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

/* ── dark-styled input override wrapper ── */
const inputStyle: React.CSSProperties = {
  background: inputBg,
  border: `1px solid ${inputBorder}`,
  borderRadius: '10px',
  color: text,
  fontSize: '14px',
  padding: '11px 14px',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.15s',
}

function DarkInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        ...inputStyle,
        ...props.style,
      }}
      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = goldBorder }}
      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = inputBorder }}
    />
  )
}

function DarkTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        ...inputStyle,
        resize: 'vertical',
        minHeight: '120px',
        fontFamily: 'inherit',
        lineHeight: 1.6,
      }}
      onFocus={(e) => { e.target.style.borderColor = goldBorder }}
      onBlur={(e) => { e.target.style.borderColor = inputBorder }}
    />
  )
}

function DarkSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...inputStyle,
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(244,244,242,0.5)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
        paddingRight: '36px',
        cursor: 'pointer',
      }}
      onFocus={(e) => { e.target.style.borderColor = goldBorder }}
      onBlur={(e) => { e.target.style.borderColor = inputBorder }}
    >
      {children}
    </select>
  )
}

export default function ListingWizard({ locations, initialData, boatId, targetHostId, returnTo, conciergeEdit, submissionId }: WizardProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(() => {
    const f = formFromInitial(initialData)
    if ((!f.country || !f.city) && f.locationId) {
      const loc = locations.find((l) => l.id === f.locationId)
      if (loc) { f.country = loc.country; f.city = loc.city }
    }
    return f
  })
  const [loading, setLoading] = useState(false)
  // When editing a paused listing, re-activate it on save (default on) so hosts
  // don't get stuck unable to re-list; they can untick to keep it paused.
  const [reactivate, setReactivate] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const [existingImages, setExistingImages] = useState<any[]>(() =>
    [...((initialData?.boat_images as any[]) ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  )
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoWarning, setPhotoWarning] = useState<string | null>(null)
  const [draftAvailable, setDraftAvailable] = useState<Partial<FormData> | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  // % markup tool: recalculates every pricing tier (e.g. owner price +15% for
  // managed listings). The recalculated prices are what get saved & shown live.
  const [markupPct, setMarkupPct] = useState('15')

  function applyMarkup() {
    const pct = Number(markupPct)
    if (!Number.isFinite(pct) || pct === 0) return
    update('pricing', form.pricing.map((p) => {
      const n = Number(p.price)
      return n > 0 ? { ...p, price: String(Math.round(n * (1 + pct / 100))) } : p
    }))
  }

  // Append image files (from picker or drag-and-drop), de-duped by name+size.
  function addImages(files: FileList | File[] | null) {
    const all = Array.from(files ?? [])
    // HEIC/HEIF (the iPhone default) can't be rendered by most browsers and we
    // can't transcode it server-side yet — reject with a clear fix instead of
    // silently storing a broken/unviewable image (or dropping it with no reason).
    const isHeic = (f: File) => /heic|heif/i.test(f.type) || /\.hei[cf]$/i.test(f.name)
    const heic = all.filter(isHeic)
    const incoming = all.filter((f) => !isHeic(f) && f.type.startsWith('image/'))
    setPhotoWarning(heic.length
      ? `${heic.length} HEIC photo${heic.length > 1 ? 's were' : ' was'} skipped — most browsers can't show HEIC. On iPhone: Settings → Camera → Formats → Most Compatible (or export as JPEG), then re-upload.`
      : null)
    if (incoming.length === 0) return
    setForm((f) => {
      const merged = [...f.images]
      for (const file of incoming) {
        if (!merged.some((m) => m.name === file.name && m.size === file.size)) merged.push(file)
      }
      return { ...f, images: merged }
    })
  }

  // Brand-new listing → first offer how to add it (import vs manual). Skip the
  // chooser when editing, when prefilled, or in admin concierge mode (import
  // attributes boats to the logged-in user, not the target host).
  const isNewManual = !boatId && !initialData && !targetHostId
  const [method, setMethod] = useState<'choose' | 'manual'>(isNewManual ? 'choose' : 'manual')

  // Autosave a brand-new listing's text/specs to localStorage (photos can't be
  // serialized, so they're excluded) — a refresh or timeout never wipes the whole
  // 5-step form. Offered back via a "Resume your draft?" banner on the chooser.
  useEffect(() => {
    // Only once a name exists — skips the empty initial render, so it never
    // overwrites a saved draft before the restore effect below can read it.
    if (!isNewManual || !form.name.trim()) return
    try { const { images: _img, ...rest } = form; localStorage.setItem(DRAFT_KEY, JSON.stringify(rest)) } catch { /* ignore quota/serialisation */ }
  }, [form, isNewManual])
  useEffect(() => {
    if (!isNewManual) return
    try { const raw = localStorage.getItem(DRAFT_KEY); const p = raw ? JSON.parse(raw) : null; if (p && p.name) setDraftAvailable(p) } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const resumeDraft = () => { if (draftAvailable) { setForm((f) => ({ ...f, ...draftAvailable, images: f.images })); setMethod('manual'); setDraftAvailable(null) } }
  const discardDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } setDraftAvailable(null) }

  // "Generate with AI" — writes a tagline + description from the facts already in the form.
  async function generateDescription() {
    if (!form.name.trim()) { setError('Give the boat a name first, then generate.'); return }
    setAiBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, type: form.type, lengthM: form.lengthM, capacityPax: form.capacityPax,
          cabins: form.cabins, builder: form.builder, modelYear: form.modelYear,
          departurePort: form.departurePorts.filter(Boolean).join(' · '), locationName: (form.city && form.country) ? `${form.city}, ${form.country}` : '',
          includesSkipper: form.includesSkipper, includesFuel: form.includesFuel,
          includesDrinks: form.includesDrinks, features: form.selectedFeatures,
          existingDescription: form.description,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')
      setForm((f) => ({ ...f, description: json.description, tagline: f.tagline || json.tagline || '' }))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAiBusy(false)
    }
  }

  function update(key: keyof FormData, value: any) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // ── Existing-photo management (edit mode): set cover, reorder, delete ──
  async function setCover(id: string) {
    if (!boatId) return
    setPhotoBusy(true)
    // Photo ops go through the server API: browser-side writes under RLS can
    // fail silently (0 rows, no error) — hosts saw deletes "work" then photos
    // reappear on reload. The API verifies ownership and reports real errors.
    const ok = await photoOp({ op: 'cover', imageId: id })
    if (ok) setExistingImages((imgs) => imgs.map((im) => ({ ...im, is_hero: im.id === id })))
    setPhotoBusy(false)
  }
  async function deletePhoto(id: string) {
    setPhotoBusy(true)
    const ok = await photoOp({ op: 'delete', imageId: id })
    if (ok) setExistingImages((imgs) => imgs.filter((im) => im.id !== id))
    setPhotoBusy(false)
  }
  async function movePhoto(id: string, dir: -1 | 1) {
    const idx = existingImages.findIndex((im) => im.id === id)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= existingImages.length) return
    const next = [...existingImages]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setPhotoBusy(true)
    const ok = await photoOp({ op: 'sort', imageId: next[idx].id, sortOrder: idx, otherId: next[j].id, otherSort: j })
    if (ok) setExistingImages(next)
    setPhotoBusy(false)
  }
  async function photoOp(payload: Record<string, unknown>): Promise<boolean> {
    try {
      const r = await fetch('/api/host/photos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Photo update failed')
      return true
    } catch (e) {
      alert((e as Error).message)
      return false
    }
  }

  // ── New-upload arranging (before the listing is saved): reorder, choose cover, remove ──
  function moveNew(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= form.images.length) return
    const next = [...form.images]
    ;[next[i], next[j]] = [next[j], next[i]]
    update('images', next)
  }
  function coverNew(i: number) {
    if (i === 0) return
    const next = [...form.images]
    const [pick] = next.splice(i, 1)
    next.unshift(pick)
    update('images', next)
  }
  function removeNew(i: number) {
    update('images', form.images.filter((_, k) => k !== i))
  }

  function toggleFeature(feat: string) {
    setForm((f) => ({
      ...f,
      selectedFeatures: f.selectedFeatures.includes(feat)
        ? f.selectedFeatures.filter((x) => x !== feat)
        : [...f.selectedFeatures, feat],
    }))
  }

  async function uploadImages(boatId: string): Promise<string[]> {
    const urls: string[] = []
    for (const file of form.images) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('boatId', boatId)
      try {
        const res = await fetch('/api/upload-image', { method: 'POST', body: fd })
        const json = await res.json()
        if (json.url) urls.push(json.url)
      } catch {
        // skip failed upload, continue with others
      }
    }
    return urls
  }

  async function handlePublish() {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Resolve the typed city + country into a locations row (find-or-create).
      // If neither was provided, fall back to the listing's existing location.
      let resolvedLocationId = form.locationId
      if (form.city.trim() || form.country.trim()) {
        const locRes = await fetch('/api/locations/resolve', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city: form.city, country: form.country }),
        })
        const locJson = await locRes.json()
        if (!locRes.ok || !locJson.id) throw new Error(locJson.error || 'Could not resolve location')
        resolvedLocationId = locJson.id as string
      }
      if (!resolvedLocationId) throw new Error('Please set a country and city for this listing.')

      const boatFields = {
        location_id: resolvedLocationId, name: form.name, tagline: form.tagline || null,
        description: form.description || null, type: form.type as any,
        length_m: form.lengthM ? Number(form.lengthM) : null, capacity_pax: form.capacityPax,
        cabins: form.cabins || null, builder: form.builder || null,
        model_year: form.modelYear ? Number(form.modelYear) : null,
        departure_port: form.departurePorts.map((s) => s.trim()).filter(Boolean).join(' · ') || null, includes_skipper: form.includesSkipper,
        includes_fuel: form.includesFuel, includes_drinks: form.includesDrinks,
        min_hours: form.minHours, pricing_type: form.pricingType as any,
        instant_book: form.instantBook,
        // 'custom' isn't a DB enum value — store 'strict' as the safe base; the real
        // custom terms live in a boat_features marker row (see below).
        cancellation_policy: (form.cancellationPolicy === 'custom' ? 'strict' : form.cancellationPolicy) as any,
        is_fishing_trip: form.isFishingTrip,
        // is_boat_tour intentionally NOT sent — column pending migration 017 (re-enable after DDL)
      }

      // Admin editing a boat they don't own → write via service-role API so RLS
      // doesn't silently drop the changes.
      if (conciergeEdit && boatId) {
        let newImages: { storage_url: string; alt: string; sort_order: number; is_hero: boolean }[] = []
        if (form.images.length > 0) {
          const urls = await uploadImages(boatId)
          const existingCount = initialData?.boat_images?.length ?? 0
          newImages = urls.map((url, i) => ({ storage_url: url, alt: `${form.name} photo ${existingCount + i + 1}`, sort_order: existingCount + i, is_hero: existingCount === 0 && i === 0 }))
        }
        const pricing = form.priceOnRequest ? [] : form.pricing
          .filter((p) => p.price && Number(p.price) > 0 && p.durationHours && Number(p.durationHours) > 0)
          .map((p) => ({ duration_hours: p.durationHours, price: Number(p.price), currency: form.currency, season: 'all' }))
        const features = [...form.selectedFeatures]
        if (form.cancellationPolicy === 'custom' && form.cancellationCustom.trim()) features.push(REFUND_MARKER + form.cancellationCustom.trim())
        const res = await fetch('/api/admin/update-listing', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ boatId, fields: boatFields, pricing, features, newImages }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to save listing')
        router.push(returnTo ?? '/host')
        return
      }

      let targetBoatId: string

      if (boatId) {
        const { error: updateErr } = await supabase.from('boats').update(boatFields).eq('id', boatId)
        if (updateErr) throw new Error(updateErr.message)
        targetBoatId = boatId
        await supabase.from('boat_pricing').delete().eq('boat_id', boatId)
      } else {
        // Keyword-rich, human-readable slug: <city>-<builder>-<name>.
        const slugBase = buildBoatSlug({ city: form.city, builder: form.builder, name: form.name })
        // For admin concierge mode, route through API so server-side service role can set arbitrary host_id
        if (targetHostId) {
          const res = await fetch('/api/admin/create-listing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostId: targetHostId, slug: slugBase, status: 'draft', ...(submissionId ? { submission_id: submissionId } : {}), ...boatFields }),
          })
          const json = await res.json()
          if (!res.ok || !json.id) throw new Error(json.error ?? 'Failed to create listing')
          targetBoatId = json.id
        } else {
          // Retry with -2, -3… on the unique-slug constraint (23505).
          let boat: { id: string } | null = null
          for (let n = 1; n <= 12 && !boat; n++) {
            const slug = n === 1 ? slugBase : `${slugBase}-${n}`
            const r = await supabase
              .from('boats').insert({ host_id: user.id, slug, status: 'draft', ...(submissionId ? { submission_id: submissionId } : {}), ...boatFields })
              .select('id').single()
            if (!r.error) { boat = r.data as { id: string }; break }
            if (r.error.code !== '23505') throw new Error(r.error.message)
          }
          if (!boat) throw new Error('Failed to create listing')
          targetBoatId = boat.id
        }
      }

      // "Price on request" → store no pricing rows, so the boat page shows the enquiry form.
      const pricingRecords = form.priceOnRequest ? [] : form.pricing
        .filter((p) => p.price && Number(p.price) > 0 && p.durationHours && Number(p.durationHours) > 0)
        .map((p) => ({ boat_id: targetBoatId, duration_hours: p.durationHours, price: Number(p.price), currency: form.currency, season: 'all' as const }))
      if (pricingRecords.length > 0) await supabase.from('boat_pricing').insert(pricingRecords)

      if (boatId) await supabase.from('boat_features').delete().eq('boat_id', boatId)
      const featureRows = form.selectedFeatures.map((f) => ({ boat_id: targetBoatId, feature: f }))
      // Persist a custom refund policy as a namespaced feature row (no migration needed)
      if (form.cancellationPolicy === 'custom' && form.cancellationCustom.trim()) {
        featureRows.push({ boat_id: targetBoatId, feature: REFUND_MARKER + form.cancellationCustom.trim() })
      }
      if (featureRows.length > 0) {
        await supabase.from('boat_features').insert(featureRows)
      }

      if (form.images.length > 0) {
        const urls = await uploadImages(targetBoatId)
        const existingCount = initialData?.boat_images?.length ?? 0
        await supabase.from('boat_images').insert(
          urls.map((url, i) => ({ boat_id: targetBoatId, storage_url: url, alt: `${form.name} photo ${existingCount + i + 1}`, sort_order: existingCount + i, is_hero: existingCount === 0 && i === 0 }))
        )
      }

      // Self-serve boats publish automatically (price-on-request boats show an
      // enquiry form, so no pricing is required to go live); the host can delist
      // any time from My listings. Admin concierge listings stay as drafts so the
      // operator reviews & publishes from the admin panel. A paused listing is
      // re-activated only when the host ticks "make it active" in the review step
      // (default on), so a deliberately-paused boat can be edited without
      // republishing, but nobody gets stuck unable to re-list.
      const isPaused = !!(boatId && initialData?.status === 'paused')
      const wasActive = !!(boatId && initialData?.status === 'active')

      // Publish-readiness gate: a listing only goes live with at least one photo, a
      // real description, and a price (or an explicit "Price on request"). Keeps
      // imageless / priceless / one-word boats out of search + the sitemap. Only
      // gates a listing that is BECOMING active — never de-lists an already-live one.
      const totalImages = (initialData?.boat_images?.length ?? 0) + form.images.length
      const hasPrice = form.priceOnRequest || form.pricing.some((p) => p.price && Number(p.price) > 0)
      const hasDesc = (form.description ?? '').trim().length >= 25
      const missing: string[] = []
      if (totalImages === 0) missing.push('at least one photo')
      if (!hasDesc) missing.push('a short description')
      if (!hasPrice) missing.push('a price (or tick “Price on request”)')

      const wantsActive = !targetHostId && (!isPaused || reactivate)
      if (wantsActive && !wasActive && missing.length > 0) {
        setError(`Saved, but not published yet — add ${missing.join(', ')} to go live.`)
        setLoading(false)
        router.refresh()
        return
      }
      if (wantsActive) {
        await supabase.from('boats').update({ status: 'active' }).eq('id', targetBoatId)
      }
      try { if (isNewManual) localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      router.push(returnTo ?? '/host')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  // ── Method chooser (first screen for a brand-new listing) ──
  if (method === 'choose') {
    const choices = [
      {
        href: '/host/fleet/website',
        Icon: Globe,
        title: 'Import from your website',
        desc: 'Paste your company site and we pull in each boat automatically — specs, prices, descriptions and photos. Fastest if your boats are already online.',
        badge: 'AI · fastest',
        badgeColor: '#a855f7',
      },
      {
        href: '/host/fleet/import',
        Icon: Upload,
        title: 'Bulk import a spreadsheet',
        desc: 'Upload a CSV to create several listings at once. Best if you keep your fleet in a spreadsheet.',
        badge: 'CSV',
        badgeColor: '#3b82f6',
      },
    ]
    return (
      <div>
        {draftAvailable && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '14px 16px', marginBottom: '18px', borderRadius: '12px', background: goldFaint, border: `1px solid ${goldBorder}` }}>
            <span style={{ fontSize: '13.5px', color: text }}>📝 You have an unsaved draft{draftAvailable.name ? ` for “${draftAvailable.name}”` : ''}. Resume where you left off?</span>
            <span style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button type="button" onClick={resumeDraft} style={{ padding: '8px 16px', borderRadius: '9px', background: gold, color: '#07101e', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Resume</button>
              <button type="button" onClick={discardDraft} style={{ padding: '8px 14px', borderRadius: '9px', background: 'transparent', border: `1px solid ${inputBorder}`, color: muted, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Discard</button>
            </span>
          </div>
        )}
        <p style={{ color: muted, fontSize: '14px', lineHeight: 1.6, margin: '0 0 22px' }}>
          How would you like to add your boat? You can always edit everything afterwards.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
          {choices.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '22px', borderRadius: '16px', background: card, border: `1px solid ${goldBorder}`, textDecoration: 'none' }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: goldFaint, border: `1px solid ${goldBorder}`, flexShrink: 0 }}>
                <c.Icon style={{ width: 22, height: 22, color: gold }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '16px', color: text }}>{c.title}</span>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '3px 9px', borderRadius: '99px', background: `${c.badgeColor}1a`, color: c.badgeColor, border: `1px solid ${c.badgeColor}40` }}>{c.badge}</span>
                </div>
                <p style={{ fontSize: '13px', color: muted, lineHeight: 1.55, margin: 0 }}>{c.desc}</p>
              </div>
              <ArrowRight style={{ width: 18, height: 18, color: gold, flexShrink: 0 }} />
            </Link>
          ))}
          {/* Add manually */}
          <button
            onClick={() => setMethod('manual')}
            style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '22px', borderRadius: '16px', background: card, border: `1px solid ${border}`, textAlign: 'left', cursor: 'pointer', width: '100%' }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: `1px solid ${inputBorder}`, flexShrink: 0 }}>
              <PenLine style={{ width: 22, height: 22, color: muted }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '16px', color: text, marginBottom: '4px' }}>Add it manually</div>
              <p style={{ fontSize: '13px', color: muted, lineHeight: 1.55, margin: 0 }}>Fill in the details yourself, step by step. You can write the description with AI as you go.</p>
            </div>
            <ArrowRight style={{ width: 18, height: 18, color: muted, flexShrink: 0 }} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ── Step indicator ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px', overflowX: 'auto', paddingBottom: '4px' }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, transition: 'all 0.2s',
              background: i < step ? '#22c55e' : i === step ? gold : 'rgba(255,255,255,0.10)',
              color: i < step || i === step ? '#07101e' : muted,
              border: i === step ? `2px solid ${gold}` : '2px solid transparent',
            }}>
              {i < step ? <Check style={{ width: 14, height: 14 }} /> : i + 1}
            </div>
            <span style={{ fontSize: '13px', fontWeight: i === step ? 700 : 400, color: i === step ? text : muted }}>
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight style={{ width: 16, height: 16, color: dim, flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step content ── */}
      <div style={{ background: card, borderRadius: '16px', border: `1px solid ${border}`, padding: '28px 24px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Step 0: Basics ── */}
        {step === 0 && (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: text, marginBottom: '4px' }}>Tell guests about your boat</h2>
            <Field label="Listing name" required>
              <DarkInput value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Azimut 40 – Sun Seeker" />
            </Field>
            <Field label="Tagline">
              <DarkInput value={form.tagline} onChange={(e) => update('tagline', e.target.value)} placeholder="Short catchy description (optional)" />
            </Field>
            <Field label="Full description">
              <DarkTextarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe the boat, the experience, what to expect…" rows={5} />
              <button
                type="button"
                onClick={generateDescription}
                disabled={aiBusy}
                style={{
                  alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '7px',
                  padding: '8px 16px', borderRadius: '99px', background: goldFaint,
                  border: `1px solid ${goldBorder}`, color: gold, fontSize: '13px', fontWeight: 600,
                  cursor: aiBusy ? 'wait' : 'pointer', opacity: aiBusy ? 0.6 : 1,
                }}
              >
                <Sparkles style={{ width: 14, height: 14 }} />
                {aiBusy ? 'Writing…' : form.description ? 'Rewrite with AI' : 'Generate with AI'}
              </button>
            </Field>
            <Field label="Boat type" required>
              <DarkSelect value={form.type} onChange={(v) => update('type', v)}>
                {BOAT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </DarkSelect>
            </Field>
            <Field label="Country" required>
              <DarkSelect value={form.country} onChange={(v) => update('country', v)}>
                <option value="">Select a country</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
              </DarkSelect>
            </Field>
            <Field label="City" required>
              <DarkInput value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="e.g. Marbella, Dubai, Mykonos…" />
            </Field>
            <Field label="Departure ports / marinas">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {form.departurePorts.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px' }}>
                    <DarkInput
                      value={p}
                      onChange={(e) => { const u = [...form.departurePorts]; u[i] = e.target.value; update('departurePorts', u) }}
                      placeholder="e.g. Puerto Banús, Marbella"
                    />
                    {form.departurePorts.length > 1 && (
                      <button type="button" aria-label="Remove port"
                        onClick={() => update('departurePorts', form.departurePorts.filter((_, j) => j !== i))}
                        style={{ flexShrink: 0, width: '40px', borderRadius: '8px', background: 'transparent', border: `1px solid ${inputBorder}`, color: muted, fontSize: '18px', lineHeight: 1, cursor: 'pointer' }}>×</button>
                    )}
                  </div>
                ))}
                <button type="button"
                  onClick={() => update('departurePorts', [...form.departurePorts, ''])}
                  style={{ alignSelf: 'flex-start', padding: '8px 14px', borderRadius: '8px', background: goldFaint, border: `1px solid ${goldBorder}`, color: gold, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ Add another port</button>
              </div>
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', background: form.isFishingTrip ? goldFaint : 'rgba(255,255,255,0.03)', border: `1px solid ${form.isFishingTrip ? goldBorder : inputBorder}`, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isFishingTrip} onChange={(e) => update('isFishingTrip', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: gold, cursor: 'pointer' }} />
              <span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: text }}>🎣 Fishing trip</span>
                <span style={{ display: 'block', fontSize: '12px', color: dim, marginTop: '2px' }}>Also list this boat in the Fishing trips section (it stays visible in Explore boats too).</span>
              </span>
            </label>
          </>
        )}

        {/* ── Step 1: Specs & features ── */}
        {step === 1 && (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: text, marginBottom: '4px' }}>Boat specifications</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Max guests" required>
                <DarkInput type="number" value={form.capacityPax} onChange={(e) => update('capacityPax', Number(e.target.value))} min={1} max={100} />
              </Field>
              <Field label="Length (m)">
                <DarkInput type="number" value={form.lengthM} onChange={(e) => update('lengthM', e.target.value)} step={0.1} min={1} placeholder="12.5" />
              </Field>
              <Field label="Cabins">
                <DarkInput type="number" value={form.cabins} onChange={(e) => update('cabins', Number(e.target.value))} min={0} />
              </Field>
              <Field label="Builder / brand">
                <DarkInput value={form.builder} onChange={(e) => update('builder', e.target.value)} placeholder="Azimut, Sunseeker…" />
              </Field>
              <Field label="Model year">
                <DarkInput type="number" value={form.modelYear} onChange={(e) => update('modelYear', e.target.value)} min={1970} max={2030} placeholder="2019" />
              </Field>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: text }}>What&apos;s included?</label>
              {[
                { key: 'includesSkipper', label: 'Licensed skipper' },
                { key: 'includesFuel', label: 'Fuel' },
                { key: 'includesDrinks', label: 'Drinks & snacks' },
                { key: 'instantBook', label: 'Instant book (guests book without approval)' },
              ].map((opt) => (
                <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <div
                    style={{
                      width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                      border: `2px solid ${form[opt.key as keyof FormData] ? gold : inputBorder}`,
                      background: form[opt.key as keyof FormData] ? goldFaint : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                    onClick={() => update(opt.key as keyof FormData, !form[opt.key as keyof FormData])}
                  >
                    {form[opt.key as keyof FormData] && <Check style={{ width: 12, height: 12, color: gold }} />}
                  </div>
                  <span style={{ fontSize: '14px', color: text }}>{opt.label}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: text }}>Amenities</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {COMMON_FEATURES.map((feat) => {
                  const active = form.selectedFeatures.includes(feat)
                  return (
                    <button
                      key={feat}
                      type="button"
                      onClick={() => toggleFeature(feat)}
                      style={{
                        padding: '7px 14px', borderRadius: '99px', fontSize: '13px', cursor: 'pointer',
                        transition: 'all 0.15s', fontWeight: active ? 600 : 400,
                        background: active ? goldFaint : 'transparent',
                        border: `1px solid ${active ? gold : inputBorder}`,
                        color: active ? gold : muted,
                      }}
                    >
                      {feat}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Pricing ── */}
        {step === 2 && (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: text, marginBottom: '4px' }}>Set your prices</h2>

            {/* ── Cancellation / refund policy ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: text }}>
                Cancellation &amp; refund policy
              </label>
              <p style={{ fontSize: '12px', color: dim, margin: '-4px 0 4px' }}>Choose a standard policy or set your own custom refund terms.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                {[
                  { v: 'flexible', label: 'Flexible',  desc: 'Full refund up to 24h before departure.' },
                  { v: 'moderate', label: 'Moderate',  desc: 'Full refund up to 5 days before.' },
                  { v: 'strict',   label: 'Strict',    desc: '50% refund up to 14 days before.' },
                  { v: 'custom',   label: '✍️ Custom', desc: 'Define your own refund terms.' },
                ].map((opt) => {
                  const active = form.cancellationPolicy === opt.v
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => update('cancellationPolicy', opt.v)}
                      style={{
                        textAlign: 'left', padding: '14px 14px', borderRadius: '12px', cursor: 'pointer',
                        background: active ? goldFaint : 'transparent',
                        border: `1.5px solid ${active ? gold : inputBorder}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: active ? gold : text }}>{opt.label}</span>
                        <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${active ? gold : inputBorder}`, background: active ? gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {active && <Check style={{ width: 10, height: 10, color: '#07101e' }} />}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: muted, lineHeight: 1.5, margin: 0 }}>{opt.desc}</p>
                    </button>
                  )
                })}
              </div>

              {/* Custom builder */}
              {form.cancellationPolicy === 'custom' && (
                <div style={{ marginTop: '6px', padding: '16px', borderRadius: '12px', background: goldFaint, border: `1px solid ${goldBorder}` }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: gold, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                    Your custom refund policy
                  </label>
                  <DarkTextarea
                    value={form.cancellationCustom}
                    onChange={(e) => update('cancellationCustom', e.target.value)}
                    rows={5}
                    placeholder={'Example:\n• 100% refund if cancelled 30+ days before\n• 50% refund if cancelled 7–29 days before\n• No refund within 7 days of departure\n• Weather cancellations: full refund or free reschedule'}
                    style={{ minHeight: '120px' }}
                  />
                  <p style={{ fontSize: '11px', color: dim, marginTop: '8px', marginBottom: 0 }}>
                    Guests will see these exact terms before booking. Be clear about refund percentages, time windows, and weather/no-show rules.
                  </p>
                </div>
              )}
            </div>
            {/* Minimum booking length + pricing model — were in state but had no UI, so
                every manual listing was silently locked to a 2-hour hourly model. */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
              <div style={{ flex: '1 1 190px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: text, marginBottom: '6px' }}>Minimum booking length</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DarkInput type="number" min={1} max={720} value={String(form.minHours)} onChange={(e) => update('minHours', Math.max(1, Number(e.target.value) || 1))} style={{ width: '110px' }} />
                  <span style={{ fontSize: '13px', color: muted }}>hours{form.minHours >= 24 ? ` (${Math.round(form.minHours / 24)} day${form.minHours >= 48 ? 's' : ''})` : ''}</span>
                </div>
              </div>
              <div style={{ flex: '1 1 190px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: text, marginBottom: '6px' }}>Pricing model</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ v: 'hourly', l: 'Per hour' }, { v: 'daily', l: 'Per day' }].map((o) => (
                    <button key={o.v} type="button" onClick={() => update('pricingType', o.v)} style={{ flex: 1, padding: '10px', borderRadius: '9px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: form.pricingType === o.v ? goldFaint : 'transparent', border: `1.5px solid ${form.pricingType === o.v ? gold : inputBorder}`, color: form.pricingType === o.v ? gold : text }}>{o.l}</button>
                  ))}
                </div>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', background: form.priceOnRequest ? goldFaint : 'rgba(255,255,255,0.03)', border: `1px solid ${form.priceOnRequest ? goldBorder : inputBorder}`, cursor: 'pointer', marginBottom: '4px' }}>
              <input type="checkbox" checked={form.priceOnRequest} onChange={(e) => update('priceOnRequest', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: gold, cursor: 'pointer' }} />
              <span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: text }}>Price on request</span>
                <span style={{ display: 'block', fontSize: '12px', color: dim, marginTop: '2px' }}>No fixed prices — guests send an enquiry and you quote them. Hides the price tiers below.</span>
              </span>
            </label>

            {!form.priceOnRequest && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: text }}>Pricing tiers</label>
                <div style={{ width: '230px' }}>
                  <DarkSelect value={form.currency} onChange={(v) => update('currency', v)}>
                    {CURRENCIES.map(([code, sym, label]) => <option key={code} value={code}>{code} {sym !== code ? `(${sym})` : ''} — {label}</option>)}
                  </DarkSelect>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: dim, margin: '-6px 0 2px' }}>Add a row for each duration you offer (e.g. 3h, 4h, 7h). Set the hours, then the all-inclusive price.</p>

              {/* % markup — recalculates every tier below; the new prices are what renters see on the site */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(116,207,232,0.06)', border: '1px solid rgba(116,207,232,0.16)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12.5px', color: muted }}>Adjust all prices by</span>
                <div style={{ position: 'relative', width: '84px' }}>
                  <DarkInput
                    type="number"
                    value={markupPct}
                    onChange={(e) => setMarkupPct(e.target.value)}
                    placeholder="15"
                    style={{ paddingRight: '26px' }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: muted, fontSize: '13px', pointerEvents: 'none' }}>%</span>
                </div>
                <button
                  type="button"
                  onClick={applyMarkup}
                  style={{ padding: '9px 16px', borderRadius: '99px', background: 'rgba(116,207,232,0.14)', border: '1px solid rgba(116,207,232,0.30)', color: gold, fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Apply {Number(markupPct) > 0 ? `+${Number(markupPct)}%` : `${Number(markupPct) || 0}%`}
                </button>
                <span style={{ fontSize: '11.5px', color: dim }}>Recalculates the tiers below — the new prices are what guests see on the website.</span>
              </div>
              {form.pricing.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ position: 'relative', width: '92px', flexShrink: 0 }}>
                    <DarkInput
                      type="number"
                      value={p.durationHours || ''}
                      onChange={(e) => {
                        const updated = [...form.pricing]
                        updated[i] = { ...updated[i], durationHours: Number(e.target.value) }
                        update('pricing', updated)
                      }}
                      placeholder="2"
                      min={1}
                      style={{ paddingRight: '26px' }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: muted, fontSize: '13px', pointerEvents: 'none' }}>h</span>
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: muted, fontSize: '14px', pointerEvents: 'none' }}>{symbolOf(form.currency)}</span>
                    <DarkInput
                      type="number"
                      value={p.price}
                      onChange={(e) => {
                        const updated = [...form.pricing]
                        updated[i] = { ...updated[i], price: e.target.value }
                        update('pricing', updated)
                      }}
                      placeholder="0"
                      min={0}
                      style={{ paddingLeft: '32px' }}
                    />
                  </div>
                  {form.pricing.length > 1 && (
                    <button
                      type="button"
                      onClick={() => update('pricing', form.pricing.filter((_, j) => j !== i))}
                      aria-label="Remove pricing tier"
                      style={{ flexShrink: 0, width: '34px', height: '34px', borderRadius: '8px', background: 'transparent', border: `1px solid ${inputBorder}`, color: muted, fontSize: '18px', lineHeight: 1, cursor: 'pointer' }}
                    >×</button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => update('pricing', [...form.pricing, { durationHours: 0, price: '' }])}
                style={{ alignSelf: 'flex-start', padding: '8px 14px', borderRadius: '8px', background: goldFaint, border: `1px solid ${goldBorder}`, color: gold, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >+ Add duration</button>
              <p style={{ fontSize: '12px', color: dim }}>The price guests pay is exactly what you enter above — all-inclusive. BoatHire24 takes a 15% platform commission from this price, so you receive 85% as your payout.</p>
            </div>
            )}
          </>
        )}

        {/* ── Step 3: Photos ── */}
        {step === 3 && (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: text, marginBottom: '4px' }}>
              Photos {(existingImages.length + form.images.length) > 0 && (
                <span style={{ color: gold, fontWeight: 700 }}>· {existingImages.length + form.images.length}/10</span>
              )}
            </h2>
            <p style={{ fontSize: '13px', color: muted, marginBottom: '14px' }}>
              Add photos in as many goes as you like — each new selection is <strong style={{ color: text }}>added</strong> to the ones above, never replaced. They&apos;re saved when you publish, and you can add more anytime after approval.
            </p>

            {/* Existing photos (edit mode) */}
            {existingImages.length > 0 && (
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: muted, marginBottom: '10px' }}>
                  Current photos ({existingImages.length}) — set your cover (★), reorder with ← →, or remove. New uploads add to these.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  {existingImages.map((img: any, i: number) => {
                    const isHero = img.is_hero || (i === 0 && !existingImages.some((x: any) => x.is_hero))
                    return (
                      <div key={img.id ?? i} style={{ borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: isHero ? `2px solid ${gold}` : '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ aspectRatio: '16/9', position: 'relative' }}>
                          <img src={img.storage_url} alt={img.alt ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {isHero && (
                            <span style={{ position: 'absolute', top: '6px', left: '6px', fontSize: '10px', background: 'rgba(116,207,232,0.92)', color: '#07101e', fontWeight: 800, padding: '2px 8px', borderRadius: '99px' }}>★ Cover</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px', background: '#0c1828' }}>
                          <button type="button" disabled={photoBusy || isHero} onClick={() => setCover(img.id)} title="Set as cover" style={{ flex: 1, fontSize: '10px', fontWeight: 700, padding: '6px 4px', borderRadius: '7px', cursor: isHero ? 'default' : 'pointer', background: isHero ? 'transparent' : 'rgba(116,207,232,0.14)', color: isHero ? dim : gold, border: 'none' }}>{isHero ? 'Cover' : 'Set cover'}</button>
                          <button type="button" disabled={photoBusy || i === 0} onClick={() => movePhoto(img.id, -1)} title="Move left" style={{ fontSize: '13px', padding: '6px 8px', borderRadius: '7px', cursor: i === 0 ? 'default' : 'pointer', background: 'rgba(255,255,255,0.06)', color: i === 0 ? dim : text, border: 'none' }}>←</button>
                          <button type="button" disabled={photoBusy || i === existingImages.length - 1} onClick={() => movePhoto(img.id, 1)} title="Move right" style={{ fontSize: '13px', padding: '6px 8px', borderRadius: '7px', cursor: i === existingImages.length - 1 ? 'default' : 'pointer', background: 'rgba(255,255,255,0.06)', color: i === existingImages.length - 1 ? dim : text, border: 'none' }}>→</button>
                          <button type="button" disabled={photoBusy} onClick={() => deletePhoto(img.id)} title="Delete photo" style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '7px', cursor: 'pointer', background: 'rgba(248,113,113,0.12)', color: '#f87171', border: 'none' }}>✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Upload new photos — click to browse or drag & drop */}
            <div
              onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true) }}
              onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget === e.target) setDragOver(false) }}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addImages(e.dataTransfer.files) }}
              style={{
                border: `2px dashed ${dragOver ? '#74cfe8' : inputBorder}`,
                background: dragOver ? 'rgba(116,207,232,0.08)' : 'transparent',
                borderRadius: '14px', padding: '40px 24px', textAlign: 'center',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <input type="file" accept="image/*" multiple onChange={(e) => { addImages(e.target.files); e.target.value = '' }} style={{ display: 'none' }} id="photo-upload" />
              <label htmlFor="photo-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '36px' }}>📸</div>
                <div style={{ fontWeight: 600, color: text, fontSize: '15px' }}>
                  {dragOver ? 'Drop photos here' : ((initialData?.boat_images ?? []).length > 0 ? 'Add more photos' : 'Upload photos')}
                </div>
                <div style={{ fontSize: '13px', color: muted }}>Drag &amp; drop or click · JPG, PNG or WebP · up to 10 photos</div>
              </label>
            </div>

            {photoWarning && (
              <p style={{ fontSize: '13px', color: '#f7b955', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: '10px', padding: '10px 14px', margin: 0 }}>
                {photoWarning}
              </p>
            )}

            {/* New photo previews */}
            {form.images.length > 0 && (
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: muted, marginBottom: '8px' }}>New photos to upload ({form.images.length}) — use ← → to order{existingImages.length === 0 ? ', ★ for the cover' : ''}.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {form.images.map((f, i) => {
                    const isHero = i === 0 && existingImages.length === 0
                    return (
                      <div key={i} style={{ borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: isHero ? `2px solid ${gold}` : '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ aspectRatio: '16/9', position: 'relative' }}>
                          <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {isHero && (
                            <span style={{ position: 'absolute', top: '6px', left: '6px', fontSize: '10px', background: 'rgba(116,207,232,0.92)', color: '#07101e', fontWeight: 800, padding: '2px 8px', borderRadius: '99px' }}>★ Cover</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px', background: '#0c1828' }}>
                          {existingImages.length === 0 && (
                            <button type="button" disabled={isHero} onClick={() => coverNew(i)} title="Make this the cover" style={{ flex: 1, fontSize: '10px', fontWeight: 700, padding: '6px 4px', borderRadius: '7px', cursor: isHero ? 'default' : 'pointer', background: isHero ? 'transparent' : 'rgba(116,207,232,0.14)', color: isHero ? dim : gold, border: 'none' }}>{isHero ? 'Cover' : 'Set cover'}</button>
                          )}
                          <button type="button" disabled={i === 0} onClick={() => moveNew(i, -1)} title="Move left" style={{ fontSize: '13px', padding: '6px 8px', borderRadius: '7px', cursor: i === 0 ? 'default' : 'pointer', background: 'rgba(255,255,255,0.06)', color: i === 0 ? dim : text, border: 'none' }}>←</button>
                          <button type="button" disabled={i === form.images.length - 1} onClick={() => moveNew(i, 1)} title="Move right" style={{ fontSize: '13px', padding: '6px 8px', borderRadius: '7px', cursor: i === form.images.length - 1 ? 'default' : 'pointer', background: 'rgba(255,255,255,0.06)', color: i === form.images.length - 1 ? dim : text, border: 'none' }}>→</button>
                          <button type="button" onClick={() => removeNew(i)} title="Remove" style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '7px', cursor: 'pointer', background: 'rgba(248,113,113,0.12)', color: '#f87171', border: 'none' }}>✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Step 4: Review & publish ── */}
        {step === 4 && (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: text, marginBottom: '4px' }}>Review & publish</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { label: 'Name', value: form.name || '—' },
                { label: 'Type', value: form.type.replace('_', ' ') },
                { label: 'Capacity', value: `${form.capacityPax} guests` },
                { label: 'Pricing slots', value: `${form.pricing.filter((p) => p.price && Number(p.price) > 0).length} set` },
                { label: 'Photos', value: `${(initialData?.boat_images?.length ?? 0) + form.images.length} total` },
                { label: 'Instant book', value: form.instantBook ? 'Yes' : 'No' },
              ].map((row, i, arr) => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 0', fontSize: '14px',
                  borderBottom: i < arr.length - 1 ? `1px solid rgba(255,255,255,0.07)` : 'none',
                }}>
                  <span style={{ color: muted }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: text }}>{row.value}</span>
                </div>
              ))}
            </div>
            {boatId && initialData?.status === 'paused' && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '14px', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                background: reactivate ? 'rgba(94,214,140,0.10)' : 'rgba(255,255,255,0.03)', border: `1px solid ${reactivate ? 'rgba(94,214,140,0.32)' : inputBorder}` }}>
                <input type="checkbox" checked={reactivate} onChange={(e) => setReactivate(e.target.checked)} style={{ width: '18px', height: '18px', marginTop: '1px', accentColor: '#5ed68c', cursor: 'pointer' }} />
                <span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: text }}>⏸ This listing is paused — make it active when I save</span>
                  <span style={{ display: 'block', fontSize: '12px', color: dim, marginTop: '2px' }}>It's currently hidden from guests. Leave this ticked to publish it again, or untick to keep it paused.</span>
                </span>
              </label>
            )}
            {error && (
              <p style={{ fontSize: '13px', color: '#f87171', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '10px', padding: '12px 16px' }}>
                {error}
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Navigation buttons ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
        {step > 0 ? (
          <button
            onClick={() => setStep(step - 1)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 22px', borderRadius: '99px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: 'transparent', border: `1px solid ${inputBorder}`, color: text }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} /> Back
          </button>
        ) : <div />}
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 0 && (!form.name || !form.country || !form.city)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 28px', borderRadius: '99px',
              fontSize: '14px', fontWeight: 700, cursor: step === 0 && (!form.name || !form.country || !form.city) ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)',
              color: '#07101e', opacity: step === 0 && (!form.name || !form.country || !form.city) ? 0.45 : 1,
              border: 'none', boxShadow: '0 4px 18px rgba(116,207,232,0.25)',
            }}
          >
            Continue <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        ) : (
          <button
            onClick={handlePublish}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 28px', borderRadius: '99px',
              fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)',
              color: '#07101e', opacity: loading ? 0.6 : 1, border: 'none',
              boxShadow: '0 4px 18px rgba(116,207,232,0.25)',
            }}
          >
            {loading ? (boatId ? 'Saving…' : 'Publishing…') : (boatId ? 'Save changes' : 'Publish listing')}
          </button>
        )}
      </div>
    </div>
  )
}
