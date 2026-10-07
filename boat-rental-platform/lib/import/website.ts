// Website listing importer: crawl a yacht-company website, find the boat pages,
// and extract structured listings (specs, prices, photos) with DeepSeek.
// Used by /api/host/import-website/* — server-side only.
import { aiJson } from '@/lib/ai/deepseek'
import { aiVisionJson } from '@/lib/ai/openai'

const UA = 'Mozilla/5.0 (compatible; BoatHire24Importer/1.0; +https://boathire24.com)'

// Hosts paste arbitrary URLs — never let the importer reach internal services.
export function assertPublicUrl(raw: string): URL {
  let u: URL
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    throw new Error('Enter a valid website address')
  }
  if (!/^https?:$/.test(u.protocol)) throw new Error('URL must start with http(s)')
  if (u.port && u.port !== '80' && u.port !== '443') throw new Error('That URL is not allowed')
  const h = u.hostname.toLowerCase()
  const privateIp = /^\d+\.\d+\.\d+\.\d+$/.test(h) && (
    h.startsWith('127.') || h.startsWith('10.') || h.startsWith('192.168.') ||
    h.startsWith('169.254.') || h.startsWith('0.') || /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  )
  if (h === 'localhost' || privateIp || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.')) {
    throw new Error('That URL is not allowed')
  }
  return u
}

async function fetchHtmlOnce(url: string, timeoutMs: number): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*' },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`The page returned HTTP ${res.status}`)
  const ct = res.headers.get('content-type') ?? ''
  if (ct && !/html|xml|text/.test(ct)) throw new Error('That URL is not a web page')
  return (await res.text()).slice(0, 1_500_000)
}

// Toggle the leading "www." on a URL's host (add it if absent, strip it if present).
function toggleWww(url: string): string | null {
  try {
    const u = new URL(url)
    u.hostname = u.hostname.startsWith('www.') ? u.hostname.slice(4) : `www.${u.hostname}`
    return u.toString()
  } catch { return null }
}

export async function fetchHtml(url: string, timeoutMs = 15000): Promise<string> {
  try {
    return await fetchHtmlOnce(url, timeoutMs)
  } catch (e) {
    // Common misconfiguration: the TLS cert is valid on the apex but not on
    // "www." (or vice-versa), so one host variant throws "fetch failed". Retry
    // once with the www prefix toggled before giving up.
    const alt = toggleWww(url)
    if (alt && alt !== url) {
      try { return await fetchHtmlOnce(alt, timeoutMs) } catch { /* fall through to original error */ }
    }
    throw e
  }
}

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
   .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

export function htmlToText(html: string, cap = 12000): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|iframe|head)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, cap)
}

const SKIP_EXT = /\.(jpe?g|png|webp|gif|svg|pdf|zip|docx?|xlsx?|mp4|mov|avif|ico|css|js)(\?|$)/i

export function extractLinks(html: string, baseUrl: string): { url: string; text: string }[] {
  const base = new URL(baseUrl)
  const out = new Map<string, string>()
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && out.size < 400) {
    const href = m[1].trim()
    if (/^(mailto:|tel:|javascript:|whatsapp:|sms:)/i.test(href)) continue
    let abs: URL
    try { abs = new URL(href, base) } catch { continue }
    // Same site only (treat www. and bare domain as the same site).
    const same = abs.hostname.replace(/^www\./, '') === base.hostname.replace(/^www\./, '')
    if (!same || SKIP_EXT.test(abs.pathname)) continue
    abs.hash = ''
    const key = abs.toString()
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 80)
    if (!out.has(key) || (text && !out.get(key))) out.set(key, text)
  }
  return [...out.entries()].map(([url, text]) => ({ url, text }))
}

const BOAT_HINT = /fleet|boat|yacht|charter|catamaran|sail|gulet|rib\b|jet|vessel|rental|rent\b|barco|barca|bateau|velero|flotta|flota|vloot|alquiler|noleggio|locazione|nuestra|nos-bateaux/i
const CATALOG_HINT = /\/(fleet|boats|yachts|our-fleet|our-boats|charters?|flota|flotta|barcos|bateaux|vloot|rentals?|listings?)\/?$/i

// Pages that are clearly NOT a boat listing — dropped before classification.
const EXCLUDE_HINT = /\/(contacto?|kontakt|about|quienes|nosotros|gallery|galer[íi]a|galerie|fotos|blog|news|noticias|press|impressum|privac|terms|terminos|condiciones|cookies?|faq|cart|checkout|basket|account|login|signin|register|sitemap)/i
const EXCLUDE_TEXT = /^(home|inicio|accueil|startseite|contacto?|kontakt|gallery|galer[íi]a|galerie|english|deutsch|fran[cç]ais|espa[ñn]ol|italiano|nederlands)\b/i

// True when a URL looks like an INDIVIDUAL boat detail page (not a homepage or
// fleet/catalog index) — used to keep a host-pasted single-boat URL in results.
export function looksLikeBoatPage(u: string): boolean {
  try { const p = new URL(u).pathname; return BOAT_HINT.test(p) && !CATALOG_HINT.test(p) } catch { return false }
}

// Crawl the site (home + sitemap + obvious catalog pages, 1 level deep) and
// return candidate boat-page links for the LLM to classify.
export async function discoverCandidates(siteUrl: string): Promise<{ url: string; text: string }[]> {
  const start = assertPublicUrl(siteUrl)
  const seen = new Map<string, string>()
  const add = (l: { url: string; text: string }) => {
    if (!seen.has(l.url) || (l.text && !seen.get(l.url))) seen.set(l.url, l.text)
  }

  // If the host pasted a specific boat page (not a homepage/catalog), keep it —
  // it's usually the exact boat they want imported.
  const startIsBoatPage = looksLikeBoatPage(start.toString())

  const startHtml = await fetchHtml(start.toString())
  const startLinks = extractLinks(startHtml, start.toString())
  startLinks.forEach(add)
  if (startIsBoatPage) {
    const startTitle = (startHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
      .replace(/\s+/g, ' ').trim().slice(0, 120)
    add({ url: start.toString(), text: startTitle })
  }

  // sitemap.xml often lists every boat page directly.
  try {
    const xml = await fetchHtml(new URL('/sitemap.xml', start).toString(), 10000)
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((x) => x[1]).slice(0, 300)
    for (const u of locs) {
      try {
        const abs = new URL(u)
        if (abs.hostname.replace(/^www\./, '') === start.hostname.replace(/^www\./, '') && !SKIP_EXT.test(abs.pathname)) {
          add({ url: abs.toString(), text: '' })
        }
      } catch { /* skip bad sitemap entries */ }
    }
  } catch { /* no sitemap — fine */ }

  // Follow up to 5 catalog-looking pages one level deep (fleet/boats/charter indexes).
  const catalogs = [...seen.keys()]
    .filter((u) => CATALOG_HINT.test(new URL(u).pathname) || /fleet|flota|flotta|vloot|our.boats/i.test(seen.get(u) ?? ''))
    .slice(0, 5)
  for (const c of catalogs) {
    try {
      const html = await fetchHtml(c, 10000)
      extractLinks(html, c).forEach(add)
    } catch { /* unreachable catalog page — skip */ }
  }

  const startKey = start.toString().replace(/\/$/, '')
  return [...seen.entries()]
    .map(([url, text]) => ({ url, text }))
    .filter((l) => startIsBoatPage || l.url.replace(/\/$/, '') !== startKey)
    .filter((l) => !/\.xml(\?|$)/i.test(l.url))
    .filter((l) => !EXCLUDE_HINT.test(new URL(l.url).pathname) && !EXCLUDE_TEXT.test(l.text.trim()))
    .filter((l) => BOAT_HINT.test(l.url) || BOAT_HINT.test(l.text))
    .slice(0, 80)
}

// LLM pass: which of the candidate links are INDIVIDUAL boat detail pages?
export async function classifyBoatPages(siteUrl: string, candidates: { url: string; text: string }[]): Promise<string[]> {
  if (candidates.length === 0) return []
  try {
    const out = await aiJson<{ boat_pages?: string[] }>(
      `You are looking at links found on a boat/yacht charter company website (${siteUrl}).
Pick the URLs that are INDIVIDUAL boat or yacht detail pages (one specific vessel each) — the pages
a customer would open to see one boat's photos, specs and price.
EXCLUDE: home, contact, about, blog/news, destination guides, booking/checkout, terms, generic
category or fleet-overview pages, and anything that is clearly not one specific vessel.
Return JSON: {"boat_pages": [url, ...]} using the exact URLs given, max 30.`,
      candidates.map((c) => `${c.url}${c.text ? ` — "${c.text}"` : ''}`).join('\n'),
      { maxTokens: 2000 }
    )
    const allowed = new Set(candidates.map((c) => c.url))
    const picked = (out.boat_pages ?? []).filter((u) => allowed.has(u))
    if (picked.length > 0) return picked.slice(0, 30)
  } catch { /* fall through to heuristic */ }
  // Heuristic fallback: deepest boat-hinting paths first.
  return candidates
    .filter((c) => BOAT_HINT.test(c.url))
    .sort((a, b) => b.url.split('/').length - a.url.split('/').length)
    .slice(0, 20)
    .map((c) => c.url)
}

const IMG_JUNK = /logo|icon|favicon|sprite|placeholder|avatar|flag|payment|badge|whatsapp|tripadvisor|instagram|facebook|loading|spinner|arrow|btn|button|banner-?ad/i

export function extractImages(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl)
  const found: string[] = []
  const push = (raw: string | undefined) => {
    if (!raw) return
    let abs: URL
    try { abs = new URL(decodeEntities(raw.trim()), base) } catch { return }
    if (!/^https?:$/.test(abs.protocol)) return
    const s = abs.toString()
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(abs.pathname) && !/\/(image|img|photo|media|upload)s?\//i.test(abs.pathname)) return
    if (IMG_JUNK.test(s)) return
    if (!found.includes(s)) found.push(s)
  }

  // og:image first — it is almost always the hero shot.
  for (const m of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)) push(m[1])
  for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi)) push(m[1])

  for (const tagMatch of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = tagMatch[0]
    const attr = (name: string) => tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'))?.[1]
    // Skip obviously tiny images (icons, separators).
    const w = Number(attr('width')), h = Number(attr('height'))
    if ((w && w < 300) || (h && h < 200)) continue
    const srcset = attr('srcset') ?? attr('data-srcset')
    if (srcset) {
      // Take the largest srcset entry.
      const parts = srcset.split(',').map((p) => p.trim().split(/\s+/))
      const biggest = parts.sort((a, b) => (parseInt(b[1] ?? '0') || 0) - (parseInt(a[1] ?? '0') || 0))[0]
      push(biggest?.[0])
    }
    push(attr('data-src') ?? attr('data-lazy-src') ?? attr('data-original') ?? attr('src'))
    if (found.length >= 16) break
  }
  return found.slice(0, 16)
}

// ── LLM extraction of one page into platform-shaped boats ──────────────────

export interface ExtractedBoat {
  name: string
  tagline: string
  description: string
  type: string
  length_m: number | null
  capacity_pax: number
  cabins: number | null
  builder: string | null
  model_year: number | null
  departure_port: string | null
  currency: string
  pricing: { duration_hours: number; price: number }[]
  features: string[]
  images: string[]
  sourceUrl: string
}

const BOAT_TYPES = ['motor_yacht', 'catamaran', 'sailing', 'speedboat', 'fishing', 'rib', 'luxury', 'jet_ski', 'jet_car', 'gulet']
export function mapBoatType(raw: unknown): string {
  const t = String(raw ?? '').toLowerCase().replace(/[\s-]+/g, '_')
  if (BOAT_TYPES.includes(t)) return t
  if (/(motor|fly|power).*yacht|^yacht$|motorboat|cruiser/.test(t)) return 'motor_yacht'
  if (/catamaran/.test(t)) return 'catamaran'
  if (/sail|velero/.test(t)) return 'sailing'
  if (/speed|sport|bowrider|day_?boat/.test(t)) return 'speedboat'
  if (/fish/.test(t)) return 'fishing'
  if (/rib|inflatable|zodiac/.test(t)) return 'rib'
  if (/luxury|super_?yacht|mega/.test(t)) return 'luxury'
  if (/jet_?ski|wave/.test(t)) return 'jet_ski'
  if (/gulet/.test(t)) return 'gulet'
  return 'motor_yacht'
}

const EXTRACT_SYSTEM = `You extract boat/yacht charter listings from the text of a web page.
Return JSON: {"boats":[{"name":string,"type":string,"length_m":number|null,"capacity_pax":number,
"cabins":number|null,"builder":string|null,"model_year":number|null,"departure_port":string|null,
"currency":string,"prices":[{"duration_hours":number,"price":number}],"features":[string],
"tagline":string,"description":string}]}

Rules:
- Only vessels actually offered for charter/rental ON THIS PAGE. Ignore "similar boats" teasers,
  destination text and company history. If the page is not about a rentable boat, return {"boats":[]}.
- ONE page can list MANY boats. A detail page is usually ONE boat, but a fleet / rentals / "deals" /
  price-list page often lists many — extract EVERY distinct rentable boat you find (up to 25), each as
  its own object. Do not merge different boats into one, and do not stop at the first.
- EXCLUDE land vehicles and non-boats: cars, scooters, mopeds, motorbikes, Vespas, quad bikes/ATVs,
  bicycles, jet-skis-that-are-actually-scooters. If a "rentals" page mixes boats with cars/scooters,
  return ONLY the boats.
- type: one of motor_yacht, catamaran, sailing, speedboat, fishing, rib, luxury, jet_ski, gulet.
- length_m in metres (convert feet: ft × 0.3048, one decimal).
- capacity_pax: max guests as a number (default 8 if truly absent).
- prices: convert what the page states. Per-hour price → {"duration_hours":1,"price":hourly}.
  Half day → duration_hours 4. Full day / per day → duration_hours 8 for day charters of
  motorboats, 24 only if it is explicitly a multi-day/overnight rate. Per week → duration_hours 168.
  Numbers only, no thousands separators. If no price is shown, return an empty array.
- currency: 3-letter code (EUR if symbol € or unclear in Europe).
- features: up to 15 short amenity names exactly as the page implies (e.g. "Bluetooth sound system").
- tagline: one line, max 90 chars, no exclamation marks.
- description: 100-200 words in warm, conversational British English, second person, ONLY facts
  from the page, no em-dashes, no exclamation marks, no invented details.`

// Shared: turn one raw LLM boat object into our validated ExtractedBoat shape.
// When many boats share ONE page, pick the images that belong to THIS boat by
// matching its name tokens against the image URL path (sites usually namespace
// photos per boat, e.g. /photos/solemar-175/..). Falls back to the page images.
function imagesForBoat(nameHint: string | undefined, images: string[]): string[] {
  if (!nameHint || images.length <= 1) return images.slice(0, 12)
  const tokens = slugify(nameHint).split('-').filter((t) => t.length >= 3 || /^\d{2,}$/.test(t))
  if (tokens.length === 0) return images.slice(0, 12)
  const matched = images.filter((u) => { const p = decodeURI(u).toLowerCase(); return tokens.some((t) => p.includes(t)) })
  return (matched.length ? matched : images).slice(0, 12)
}

function normalizeExtractedBoat(b: any, sourceUrl: string, images: string[], nameHint?: string): ExtractedBoat | null {
  const name = String(b?.name ?? '').trim().slice(0, 120)
  if (!name) return null
  const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null }
  let pricing = (Array.isArray(b.prices) ? b.prices : [])
    .map((p: any) => ({ duration_hours: Math.round(num(p?.duration_hours) ?? 0), price: Math.round(num(p?.price) ?? 0) }))
    .filter((p: any) => p.duration_hours >= 1 && p.duration_hours <= 720 && p.price > 0 && p.price < 1_000_000)
  // A bare hourly rate becomes the standard 2/4/8h tiers.
  const hourly = pricing.find((p: { duration_hours: number }) => p.duration_hours === 1)
  if (hourly) {
    pricing = [
      ...[2, 4, 8].map((h) => ({ duration_hours: h, price: hourly.price * h })),
      ...pricing.filter((p: { duration_hours: number }) => p.duration_hours > 8),
    ]
  }
  const seen = new Set<number>()
  pricing = pricing.filter((p: { duration_hours: number }) => !seen.has(p.duration_hours) && seen.add(p.duration_hours))

  return {
    name,
    tagline: String(b?.tagline ?? '').trim().slice(0, 200),
    description: String(b?.description ?? '').trim().slice(0, 5000),
    type: mapBoatType(b?.type),
    length_m: num(b?.length_m),
    capacity_pax: Math.min(200, Math.max(1, Math.round(num(b?.capacity_pax) ?? 8))),
    cabins: num(b?.cabins) ? Math.round(num(b?.cabins)!) : null,
    builder: String(b?.builder ?? '').trim().slice(0, 80) || null,
    model_year: (() => { const y = Math.round(num(b?.model_year) ?? 0); return y >= 1950 && y <= 2030 ? y : null })(),
    departure_port: String(b?.departure_port ?? '').trim().slice(0, 120) || null,
    currency: /^[A-Z]{3}$/.test(String(b?.currency ?? '').toUpperCase()) ? String(b.currency).toUpperCase() : 'EUR',
    pricing: pricing.slice(0, 6),
    features: (Array.isArray(b?.features) ? b.features : []).map((f: any) => String(f).trim().slice(0, 60)).filter(Boolean).slice(0, 15),
    images: imagesForBoat(nameHint ?? name, images),
    sourceUrl,
  }
}

export async function extractBoatsFromPage(url: string, html: string, note?: string): Promise<ExtractedBoat[]> {
  const text = htmlToText(html)
  if (text.length < 200) return []
  const images = extractImages(html, url)
  const noteBlock = note && note.trim()
    ? `\n\nOPERATOR NOTE (a human hint about these listings — apply it, e.g. it may tell you the boat type, that prices are on request, or that they're fishing trips):\n${note.trim()}`
    : ''
  // Bigger token budget — a fleet/deals page can carry many boats in one response.
  const out = await aiJson<{ boats?: any[] }>(EXTRACT_SYSTEM, `URL: ${url}\n\nPAGE TEXT:\n${text}${noteBlock}`, { maxTokens: 6000 })
  const boats = Array.isArray(out.boats) ? out.boats.slice(0, 25) : []
  return boats.map((b) => normalizeExtractedBoat(b, url, images, b?.name)).filter((b): b is ExtractedBoat => b !== null)
}

// Extract a listing from a SCREENSHOT (vision) plus optional website text.
// The image usually carries the ad (name, specs, price); the website adds context.
export async function extractBoatsFromImageAndSite(
  imageDataUrls: string[], url: string | null, websiteText: string, images: string[], note?: string,
): Promise<ExtractedBoat[]> {
  const parts: string[] = []
  if (url) parts.push(`WEBSITE: ${url}`)
  if (websiteText && websiteText.trim().length > 80) parts.push(`WEBSITE TEXT (context):\n${websiteText.slice(0, 8000)}`)
  if (note && note.trim()) parts.push(`OPERATOR NOTE (apply this hint):\n${note.trim()}`)
  parts.push('Read the attached screenshot image(s) AND the website text above. Extract the boat / charter / trip listing(s). Prefer details visible in the screenshot; use the website text to fill gaps.')
  const out = await aiVisionJson<{ boats?: any[] }>(EXTRACT_SYSTEM, parts.join('\n\n'), imageDataUrls, { maxTokens: 3000 })
  const boats = Array.isArray(out.boats) ? out.boats.slice(0, 5) : []
  return boats.map((b) => normalizeExtractedBoat(b, url ?? 'screenshot', images)).filter((b): b is ExtractedBoat => b !== null)
}

const DOC_EXTRACT_SYSTEM = `You extract boat/yacht charter listings from a document an operator sent us
(a fleet PDF, price list, brochure or similar). The document may describe MANY boats — extract every
distinct rentable vessel you can find.
Return JSON: {"boats":[{"name":string,"type":string,"length_m":number|null,"capacity_pax":number,
"cabins":number|null,"builder":string|null,"model_year":number|null,"departure_port":string|null,
"currency":string,"prices":[{"duration_hours":number,"price":number}],"features":[string],
"tagline":string,"description":string}]}

Rules:
- One entry per distinct boat. Up to 25 boats. If the document has no rentable boats, return {"boats":[]}.
- type: one of motor_yacht, catamaran, sailing, speedboat, fishing, rib, luxury, jet_ski, gulet.
- length_m in metres (convert feet: ft × 0.3048, one decimal).
- capacity_pax: max guests as a number (default 8 if truly absent).
- prices: per-hour → {"duration_hours":1,"price":hourly}. Half day → 4. Full day / per day → 8.
  Per week → 168. Numbers only, no thousands separators. No price shown → empty array.
- currency: 3-letter code (EUR if symbol € or unclear in Europe).
- features: up to 15 short amenity names exactly as stated.
- tagline: one line, max 90 chars, no exclamation marks.
- description: 100-200 words, warm conversational British English, second person, ONLY facts from the
  document, no em-dashes, no exclamation marks, no invented details.`

// Extract boats from arbitrary document text (PDF, pasted brochure, Dropbox file).
// No images (a text source has none) — the admin adds photos when reviewing the draft.
export async function extractBoatsFromText(sourceLabel: string, text: string): Promise<ExtractedBoat[]> {
  const clean = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 24000)
  if (clean.length < 80) return []
  const out = await aiJson<{ boats?: any[] }>(DOC_EXTRACT_SYSTEM, `SOURCE: ${sourceLabel}\n\nDOCUMENT TEXT:\n${clean}`, { maxTokens: 6000 })
  const boats = Array.isArray(out.boats) ? out.boats.slice(0, 25) : []
  return boats.map((b) => normalizeExtractedBoat(b, sourceLabel, [])).filter((b): b is ExtractedBoat => b !== null)
}

export function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}
