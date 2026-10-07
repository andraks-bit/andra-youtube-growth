// MMK Booking Manager (booking-manager.com) fleet sync.
// Charter operators keep their fleet in MMK; they generate an API key in the
// Booking Manager portal (My Account → API Integration) and give us the key +
// their company ID. We pull yachts (specs, photos, weekly offers) and upsert
// listings, keyed by external_id `mmk:<yachtId>` so re-syncs update in place.
// API: https://www.booking-manager.com/api/v2 (Bearer auth) — spec: swaggerhub mmksystems/bm-api

const BASE = 'https://www.booking-manager.com/api/v2'

export interface MMKYacht {
  id: number | string
  name?: string
  model?: string
  year?: number
  kind?: string
  homeBase?: string
  company?: string
  companyId?: number | string
  length?: number
  beam?: number
  draught?: number
  berths?: number
  cabins?: number
  wc?: number
  maxPeopleOnBoard?: number
  minimumCharterDuration?: number
  currency?: string
  deposit?: number
  images?: (string | { url?: string })[]
  equipment?: (string | { name?: string })[]
  descriptions?: { language?: string; text?: string }[] | string
  shipyardId?: number
  requiredSkipperLicense?: boolean
}

export async function mmkFetch<T>(apiKey: string, path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(45000),
  })
  if (res.status === 401 || res.status === 403) throw new Error('MMK rejected the API key (401/403). Check the key in Booking Manager → My Account → API Integration.')
  // MMK's backend answers invalid keys/requests with a raw 500 (Tomcat) page,
  // not a clean 401 — surface that as a key problem, not a server crash.
  if (!res.ok) throw new Error(`MMK returned HTTP ${res.status} for ${path} — this usually means the API key or Company ID is wrong. Double-check both in Booking Manager (My Account → API Integration).`)
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('json')) throw new Error('MMK returned a non-JSON response — the API key looks invalid. Re-generate it in Booking Manager → My Account → API Integration.')
  return res.json() as Promise<T>
}

export async function mmkListYachts(apiKey: string, companyId?: string): Promise<MMKYacht[]> {
  const params: Record<string, string> = {}
  if (companyId) params.companyId = String(companyId)
  const out = await mmkFetch<unknown>(apiKey, '/yachts', params)
  const arr = Array.isArray(out) ? out : (out as { yachts?: unknown[] })?.yachts
  return (Array.isArray(arr) ? arr : []) as MMKYacht[]
}

// kind → our boat_type enum
export function mmkType(kind?: string, model?: string): string {
  const k = `${kind ?? ''} ${model ?? ''}`.toLowerCase()
  if (/power\s*cat|motor\s*cat/.test(k)) return 'catamaran'
  if (/catamaran|lagoon|leopard|bali|fountaine/.test(k)) return 'catamaran'
  if (/gulet/.test(k)) return 'gulet'
  if (/sail|monohull|bavaria|beneteau|jeanneau|hanse|dufour|oceanis|elan/.test(k)) return 'sailing'
  if (/rib|inflatable/.test(k)) return 'rib'
  if (/speed|open|day\s*boat/.test(k)) return 'speedboat'
  return 'motor_yacht'
}

export function mmkDescription(d: MMKYacht['descriptions']): string | null {
  if (!d) return null
  if (typeof d === 'string') return d.slice(0, 5000) || null
  const en = d.find((x) => /^en/i.test(x.language ?? '')) ?? d[0]
  return (en?.text ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000) || null
}

export function mmkImages(imgs: MMKYacht['images']): string[] {
  return (imgs ?? [])
    .map((i) => (typeof i === 'string' ? i : i?.url ?? ''))
    .filter((u) => /^https?:\/\//.test(u))
    .slice(0, 10)
}

// Map an MMK yacht to our boats row (without ids/host/location).
export function mmkToBoatRow(y: MMKYacht) {
  const name = String(y.name || y.model || `Yacht ${y.id}`).trim().slice(0, 120)
  return {
    name,
    external_id: `mmk:${y.id}`,
    external_source: 'booking-manager.com',
    type: mmkType(y.kind, y.model),
    length_m: Number(y.length) > 0 ? Math.round(Number(y.length) * 10) / 10 : null,
    capacity_pax: Math.min(200, Math.max(1, Number(y.maxPeopleOnBoard) || Number(y.berths) || 8)),
    cabins: Number(y.cabins) > 0 ? Math.round(Number(y.cabins)) : null,
    builder: String(y.model ?? '').split(/\s+/)[0]?.slice(0, 80) || null,
    model_year: Number(y.year) >= 1950 && Number(y.year) <= 2035 ? Number(y.year) : null,
    departure_port: String(y.homeBase ?? '').slice(0, 120) || null,
    tagline: `${y.model ?? name}${y.year ? ` (${y.year})` : ''}${y.homeBase ? ` — from ${y.homeBase}` : ''}`.slice(0, 200),
    description: mmkDescription(y.descriptions),
    min_hours: 168, // MMK fleets are weekly charter by default
    pricing_type: 'hourly' as const,
    includes_skipper: !!y.requiredSkipperLicense === false, // bareboat fleets need a licence; keep skipper flag conservative
    instant_book: false,
    cancellation_policy: 'moderate' as const,
  }
}
