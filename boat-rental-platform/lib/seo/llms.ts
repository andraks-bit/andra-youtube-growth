import { ALL_POSTS } from '@/lib/blog/posts'
import { LANDING_PAGES } from '@/lib/landing/pages'
import { prettyCity } from '@/lib/pretty-city'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface LowestPrice { price: number; currency: string }

interface BoatRow {
  name: string
  slug: string
  type: string
  capacity_pax: number
  length_m: number | null
  city: string
  country: string
  lowestPrice: LowestPrice | null
}

// Same display convention as the boat pages (app/boats/[slug]/page.tsx meta):
// € prefixes EUR, every other currency shows its ISO code — never € on a THB price.
function money(p: LowestPrice): string {
  return `${p.currency === 'EUR' ? '€' : p.currency + ' '}${p.price.toLocaleString('en')}`
}

// "City, Country" label. prettyCity strips raw geocoded street addresses and
// country repeats ("Nassau, Bahamas" + country "Bahamas" would otherwise render
// "Nassau, Bahamas, Bahamas"); we also drop departure-note parentheticals and
// skip the country when the city IS the country ("Gibraltar, Gibraltar").
function destinationLabel(city: string, country: string): string {
  const c = prettyCity(city).replace(/\s*\(.*$/, '').trim() || country
  return c === country ? c : `${c}, ${country}`
}

async function fetchFleet(): Promise<BoatRow[]> {
  // NOTE: no `tags` column exists on boats — selecting one 400s the whole
  // request and llms.txt then claims the fleet is empty. Keep this select in
  // sync with the live schema.
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/boats?select=name,slug,type,capacity_pax,length_m,boat_pricing(price,currency),locations(city,country)&status=eq.active&order=name.asc`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' }, cache: 'no-store' }
  )
  if (!res.ok) return []
  const raw = (await res.json()) as Array<{
    name: string; slug: string; type: string; capacity_pax: number; length_m: number | null
    boat_pricing: Array<{ price: number; currency: string | null }>; locations: { city?: string; country?: string } | null
  }>
  return raw.map((b) => {
    const prices = b.boat_pricing ?? []
    const lowest = prices.length
      ? prices.reduce((min, p) => (p.price < min.price ? p : min))
      : null
    return {
      name: b.name, slug: b.slug, type: b.type, capacity_pax: b.capacity_pax, length_m: b.length_m,
      city: b.locations?.city ?? 'Marbella', country: b.locations?.country ?? 'Spain',
      lowestPrice: lowest ? { price: lowest.price, currency: lowest.currency ?? 'EUR' } : null,
    }
  })
}

function formatType(type: string): string {
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Builds the llms.txt body. `full: false` is a concise index (a few KB); `full: true` also
// dumps all landing pages (the heavy part) — served at /llms-full.txt for deep ingestion.
export async function buildLlms({ full }: { full: boolean }): Promise<string> {
  const fleet = await fetchFleet()
  // Group vessels by destination so an answer engine can quote "boats in X".
  const byCity = new Map<string, BoatRow[]>()
  for (const b of fleet) {
    const key = destinationLabel(b.city, b.country)
    byCity.set(key, [...(byCity.get(key) ?? []), b])
  }
  const fleetSection = [...byCity.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([cityLabel, boats]) => {
      const lines = boats.map((b) => {
        const type = formatType(b.type)
        const length = b.length_m ? `${b.length_m}m` : 'n/a'
        const price = b.lowestPrice ? `from ${money(b.lowestPrice)}` : 'price on request'
        return `- **${b.name}** (/boats/${b.slug}) — ${type}, ${b.capacity_pax} guests, ${length}, ${price}`
      })
      return `### ${cityLabel} — ${boats.length} vessel${boats.length !== 1 ? 's' : ''}\n\n${lines.join('\n')}`
    })
    .join('\n\n')

  // Live per-category from-prices. Prices are only compared within a single
  // currency — EUR (the primary market) wins when a category has any EUR
  // listing, otherwise the category's most common currency is used.
  const byType = new Map<string, BoatRow[]>()
  for (const b of fleet) byType.set(b.type, [...(byType.get(b.type) ?? []), b])
  const pricingLines = [...byType.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([type, boats]) => {
      const priced = boats.map((b) => b.lowestPrice).filter((p): p is LowestPrice => p !== null)
      const label = `${formatType(type)} — ${boats.length} vessel${boats.length !== 1 ? 's' : ''}`
      if (!priced.length) return `- ${label}, price on request`
      const eur = priced.filter((p) => p.currency === 'EUR')
      let pool = eur
      if (!pool.length) {
        const counts = new Map<string, number>()
        for (const p of priced) counts.set(p.currency, (counts.get(p.currency) ?? 0) + 1)
        const topCurrency = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
        pool = priced.filter((p) => p.currency === topCurrency)
      }
      const min = pool.reduce((m, p) => (p.price < m.price ? p : m))
      return `- ${label}, from ${money(min)}`
    })
    .join('\n')
  const editorialLines = ALL_POSTS.filter((p) => p.tag !== 'Boat review').map((p) => `- [${p.title}](/blog/${p.slug}) — ${p.excerpt.slice(0, 100)}…`)
  const reviewLines = ALL_POSTS.filter((p) => p.tag === 'Boat review').map((p) => `- [${p.title}](/blog/${p.slug}) — ${p.excerpt.slice(0, 90)}…`)

  const landingSection = full
    ? `## Charter & rental landing pages (by location and boat type)\n\n${LANDING_PAGES.map((p) => `- [${p.h1 || p.title}](/${p.slug}) — ${(p.metaDescription || '').slice(0, 100)}`).join('\n')}`
    : `## Charter & rental guides\n\n${LANDING_PAGES.length}+ location × boat-type guides (e.g. /boat-rental-marbella, /yacht-charter-puerto-banus, /catamaran-charter-marbella).\nFull machine-readable list: /llms-full.txt · /sitemap.xml`

  return `# BoatHire24 — Boat & Yacht Charter Marketplace

> Find and book verified boats, yachts, catamarans, and sailing boats worldwide. Licensed skippers, instant booking, secure payments.

Last updated: ${new Date().toISOString().slice(0, 10)} (fleet and prices are generated live on every request)

## About

BoatHire24 is an online marketplace for boat charter in Marbella, Spain and beyond. All bookings include a licensed skipper, fuel, and drinks. Instant confirmation available on selected vessels.

**Platform:** boathire24.com
**Headquarters:** Marbella, Spain
**Service area:** ${byCity.size} destination${byCity.size !== 1 ? 's' : ''} worldwide — ${[...byCity.keys()].slice(0, 8).join(' · ')}${byCity.size > 8 ? ' and more' : ''}
**Payment:** Stripe (card, Apple Pay, Google Pay) — funds held in escrow until charter day
**Pricing:** All-inclusive — listing price is the final price guests pay (no fees added at checkout). Platform takes 15% commission; hosts receive 85% as their payout.

## Fleet — ${fleet.length} verified vessels across ${byCity.size} destinations

${fleetSection}

## Locations

${[...byCity.entries()].sort((a, b) => b[1].length - a[1].length).map(([c, boats]) => `- ${c} — ${boats.length} vessel${boats.length !== 1 ? 's' : ''} active`).join('\n')}

## What's always included

Every BoatHire24 charter includes: licensed skipper, fuel, drinks (water, soft drinks, beer, white wine, cava), light snacks, full insurance, safety equipment, and VAT.

## How booking works

1. Search by location, date, and guest count at /search
2. Choose duration (2 hours minimum, up to full day or multi-day)
3. Instant book (confirms immediately) or request-to-book (host has 24h)
4. Secure payment via Stripe — held in escrow until 24h after charter
5. Receive confirmation with captain's number and marina coordinates
6. Meet your licensed skipper at the marina and set sail

## Pricing — live from-prices by vessel category

${pricingLines}
- All listed prices are all-inclusive — no service fees or surcharges added at checkout

## Editorial content — Charter guides

${editorialLines.join('\n')}

## Boat reviews — Complete Marbella fleet

${reviewLines.join('\n')}

${landingSection}

## Contact

- Email: info@boathire24.com
- WhatsApp: +358 40 0406194 (08:00–22:00) — https://wa.me/358400406194
- X (Twitter): https://x.com/boathire24
- Instagram: https://www.instagram.com/boathire24

## Key pages

- /search — Browse and filter all available boats
- /marbella — Marbella destination + fleet overview
- /blog — All charter guides and boat reviews
- /faq — Frequently asked questions (prices, licences, skippers, inclusions, booking)
- /how-it-works — Full platform explainer (renters + hosts)
- /become-a-host — Host onboarding and earnings info
- /llms.txt — This concise index (refreshed live)
- /llms-full.txt — Full index including all ${LANDING_PAGES.length} landing pages
- /sitemap.xml — Full XML sitemap
`
}
