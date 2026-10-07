import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { attachRatings } from '@/lib/ratings'
import BoatCard from '@/components/search/BoatCard'
import SearchBar from '@/components/search/SearchBar'
import TrustBar from '@/components/ui/TrustBar'
import { MapPin } from 'lucide-react'
import type { BoatWithDetails, LocationRow } from '@/types/database'
import { getCategory, type BoatCategory } from '@/lib/landing/categories'
import { prettyCity } from '@/lib/pretty-city'

interface Props {
  params: Promise<{ location: string; category: string }>
}

const BASE = 'https://boathire24.com'
const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.12)'
const goldBorder = 'rgba(116,207,232,0.22)'

async function resolve(locationSlug: string, categorySlug: string) {
  const cat = getCategory(categorySlug)
  if (!cat) return null
  const supabase = await createClient()
  const { data: locRaw } = await supabase.from('locations').select('*').eq('slug', locationSlug).single()
  const loc = locRaw as LocationRow | null
  if (!loc) return null

  let q = supabase
    .from('boats')
    .select(`*, boat_images(*), boat_pricing(*), boat_features(*), locations(*), profiles(id, full_name, avatar_url, verification_status)`)
    .eq('location_id', loc.id)
    .eq('status', 'active')
    .eq('is_fishing_trip', !!cat.fishing)
    .in('type', cat.types)
    .order('created_at', { ascending: false })
  const { data: rawBoats } = await q
  const boats = await attachRatings(supabase, (rawBoats ?? []) as any[]) as BoatWithDetails[]
  return { cat, loc, boats }
}

function faqs(cat: BoatCategory, city: string, fromPrice: number | null) {
  return [
    {
      q: `How much does ${cat.noun} ${cat.fishing ? '' : 'rental '}cost in ${city}?`.replace('  ', ' '),
      a: `${cat.label} in ${city} starts from ${fromPrice ? `€${fromPrice.toLocaleString('en')}` : 'around €230'} per trip. Final pricing depends on the boat, duration and season — every listing shows live prices and includes a licensed skipper.`,
    },
    {
      q: `Do I need a licence to ${cat.fishing ? 'join a fishing trip' : `rent a ${cat.noun}`} in ${city}?`,
      a: `No. Every ${cat.label.toLowerCase()} on BoatHire24 in ${city} comes with a licensed skipper, so you don't need any boating licence or experience.`,
    },
    {
      q: `Can I book ${cat.noun} ${cat.fishing ? 'trips' : 'rentals'} in ${city} for the same day?`,
      a: `Many ${city} boats offer instant confirmation. Check availability on each listing and book online — you'll get an immediate confirmation for instant-book boats.`,
    },
  ]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location, category } = await params
  const r = await resolve(location, category)
  if (!r || r.boats.length === 0) return { title: 'Page not found' }
  const { cat, loc } = r
  const canonical = `${BASE}/${loc.slug}/${cat.slug}`
  const n = r.boats.length
  // Clean display name — some locations store a raw geocoded address as `city`.
  const cityName = prettyCity(loc.city)
  return {
    title: `${cat.label} ${cityName} — ${n} boat${n !== 1 ? 's' : ''}`,
    description: `Compare ${n} ${cat.label.toLowerCase()} option${n !== 1 ? 's' : ''} in ${cityName}, ${loc.country}. Licensed skipper included, instant booking, real prices.`,
    alternates: { canonical },
    openGraph: { title: `${cat.label} in ${cityName}`, description: `${r.boats.length} ${cat.label.toLowerCase()} options in ${cityName}.`, type: 'website', siteName: 'BoatHire24' },
  }
}

export default async function CategoryLandingPage({ params }: Props) {
  const { location, category } = await params
  const r = await resolve(location, category)
  // Only real, populated pages exist — no thin/empty landing pages.
  if (!r || r.boats.length === 0) notFound()
  const { cat, loc, boats } = r

  const fleetPrices = boats.flatMap((b) => ((b as any).boat_pricing ?? []).map((p: any) => p.price as number)).filter((p) => p > 0)
  const fromPrice = fleetPrices.length ? Math.min(...fleetPrices) : null
  // Clean display name — some locations store a raw geocoded address as `city`.
  const cityName = prettyCity(loc.city)
  const pageFaqs = faqs(cat, cityName, fromPrice)
  const canonical = `${BASE}/${loc.slug}/${cat.slug}`

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>
      {/* ── Hero ── */}
      <section style={{ position: 'relative', padding: '72px 24px 40px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(116,207,232,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '820px', margin: '0 auto' }}>
          <a href={`/${loc.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(244,244,242,0.6)', textDecoration: 'none', marginBottom: '14px' }}>
            <MapPin style={{ width: '13px', height: '13px' }} /> {cityName}, {loc.country}
          </a>
          <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '16px' }}>
            {cat.label} <span style={{ color: gold }}>{cityName}</span>
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(244,244,242,0.62)', maxWidth: '620px', margin: '0 auto', lineHeight: 1.65 }}>
            Compare {boats.length} {cat.label.toLowerCase()} option{boats.length !== 1 ? 's' : ''} in {cityName}
            {fromPrice ? <> from <strong style={{ color: gold }}>€{fromPrice.toLocaleString('en')}</strong></> : null}. Licensed skipper included on every boat — book online with instant confirmation.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '8px 24px 96px' }}>
        <div style={{ marginBottom: '28px' }}>
          <TrustBar />
        </div>
        <div style={{ marginBottom: '40px' }}>
          <SearchBar defaultLocation={cityName} />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
          {boats.length} {cat.label.toLowerCase()} option{boats.length !== 1 ? 's' : ''} in {cityName}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {boats.map((boat) => <BoatCard key={boat.id} boat={boat} />)}
        </div>

        {/* ── FAQ (also emitted as FAQPage schema for rich results + LLM citation) ── */}
        <section style={{ marginTop: '72px', maxWidth: '760px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>{cat.label} in {cityName} — FAQ</h2>
          {pageFaqs.map((f) => (
            <details key={f.q} style={{ borderBottom: '1px solid rgba(116,207,232,0.12)', padding: '16px 0' }}>
              <summary style={{ fontSize: '15px', fontWeight: 600, cursor: 'pointer', color: '#f4f4f2' }}>{f.q}</summary>
              <p style={{ fontSize: '14px', color: 'rgba(244,244,242,0.6)', lineHeight: 1.7, marginTop: '10px' }}>{f.a}</p>
            </details>
          ))}
        </section>
      </div>

      {/* Schema.org — Service + BreadcrumbList + FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Service',
              serviceType: cat.label,
              name: `${cat.label} in ${cityName}`,
              areaServed: { '@type': 'City', name: cityName, address: { '@type': 'PostalAddress', addressCountry: loc.country } },
              provider: { '@type': 'Organization', name: 'BoatHire24', url: BASE },
              url: canonical,
              ...(fromPrice ? { offers: { '@type': 'Offer', price: fromPrice, priceCurrency: 'EUR', availability: 'https://schema.org/InStock' } } : {}),
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
                { '@type': 'ListItem', position: 2, name: `Boat Rental ${cityName}`, item: `${BASE}/${loc.slug}` },
                { '@type': 'ListItem', position: 3, name: cat.label, item: canonical },
              ],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: pageFaqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
            },
          ]),
        }}
      />
    </div>
  )
}
