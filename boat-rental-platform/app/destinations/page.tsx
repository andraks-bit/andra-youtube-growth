import type { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Compass, Anchor, Ship, Fish } from 'lucide-react'
import TrustBar from '@/components/ui/TrustBar'
import { prettyCity } from '@/lib/pretty-city'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'All boat rental destinations worldwide',
  description:
    'Browse every BoatHire24 destination — compare verified boats, yachts and catamarans with licensed skippers across 60+ cities in Spain, Thailand, Turkey, Greece, Croatia, Italy and beyond.',
  alternates: { canonical: 'https://boathire24.com/destinations' },
}

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.12)'
const goldBorder = 'rgba(116,207,232,0.22)'
const card = '#0c1828'

interface Row { location_id: string | null; locations: { slug: string; city: string; country: string } | null }
interface City { slug: string; city: string; country: string; count: number }

export default async function DestinationsPage() {
  // Raw REST fetch (not the cookie-based server client) so this page stays
  // statically ISR-cached — createClient() awaits cookies(), which would force
  // per-request dynamic rendering and defeat `export const revalidate = 3600`.
  // (Same fix as the homepage's getTopDestinations.)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/boats?select=location_id,locations(slug,city,country)&status=eq.active&limit=5000`,
    { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` }, next: { revalidate: 3600 } },
  )
  const rows = (res.ok ? await res.json() : []) as Row[]

  // Aggregate live boat counts per location, then group by country.
  const byLoc = new Map<string, City>()
  for (const r of rows) {
    const l = r.locations
    if (!l?.slug) continue
    const e = byLoc.get(l.slug) ?? { slug: l.slug, city: l.city, country: l.country, count: 0 }
    e.count++
    byLoc.set(l.slug, e)
  }
  const grouped = Object.entries(
    [...byLoc.values()].reduce((acc, c) => {
      (acc[c.country] ??= []).push(c)
      return acc
    }, {} as Record<string, City[]>),
  )
    .map(([country, cities]) => ({ country, cities: cities.sort((a, b) => b.count - a.count), total: cities.reduce((s, c) => s + c.count, 0) }))
    .sort((a, b) => b.total - a.total)

  const totalBoats = [...byLoc.values()].reduce((s, c) => s + c.count, 0)
  const totalCities = byLoc.size

  const experiences = [
    { href: '/boat-tours', Icon: Ship, label: 'Boat tours & cruises' },
    { href: '/fishing-trips', Icon: Fish, label: 'Fishing trips & charters' },
    { href: '/jet-ski-marbella', Icon: Anchor, label: 'Jet ski rental — Marbella' },
  ]

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>
      {/* ── Hero ── */}
      <section style={{ position: 'relative', padding: '64px 24px 36px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(116,207,232,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: gold, background: goldFaint, border: `1px solid ${goldBorder}`, padding: '5px 14px', borderRadius: '99px', marginBottom: '18px' }}>
            <Compass style={{ width: 13, height: 13 }} /> Destinations
          </div>
          <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '14px' }}>
            Boat rental <span style={{ color: gold }}>destinations</span> worldwide
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(244,244,242,0.62)', maxWidth: '620px', margin: '0 auto', lineHeight: 1.65 }}>
            {totalBoats} verified boats across {totalCities} {totalCities === 1 ? 'city' : 'cities'} — every charter includes a licensed skipper. Pick a destination to compare live prices and book online.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '8px 24px 56px' }}>
        <TrustBar style={{ marginBottom: '40px' }} />

        {/* ── Cities grouped by country ── */}
        {grouped.map(({ country, cities, total }) => (
          <section key={country} style={{ marginBottom: '44px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f4f4f2' }}>{country}</h2>
              <span style={{ fontSize: '13px', color: 'rgba(244,244,242,0.42)' }}>{total} boat{total !== 1 ? 's' : ''} · {cities.length} {cities.length === 1 ? 'city' : 'cities'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {cities.map((c) => (
                <Link key={c.slug} href={`/${c.slug}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '14px 16px', borderRadius: '12px', background: card, border: '1px solid rgba(116,207,232,0.15)', textDecoration: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <MapPin style={{ width: 14, height: 14, color: gold, flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prettyCity(c.city)}</span>
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: gold, background: goldFaint, borderRadius: '99px', padding: '2px 9px', flexShrink: 0 }}>{c.count}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {grouped.length === 0 && (
          <p style={{ textAlign: 'center', color: 'rgba(244,244,242,0.5)', padding: '40px 0' }}>Destinations are loading — check back shortly.</p>
        )}

        {/* ── Explore by experience ── */}
        <section style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '36px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f4f4f2', marginBottom: '18px' }}>Explore by experience</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {experiences.map(({ href, Icon, label }) => (
              <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderRadius: '12px', background: card, border: `1px solid ${goldBorder}`, textDecoration: 'none' }}>
                <Icon style={{ width: 18, height: 18, color: gold, flexShrink: 0 }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f2' }}>{label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Schema.org — ItemList of destinations (crawlable hierarchy signal) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'BoatHire24 boat rental destinations',
            numberOfItems: totalCities,
            itemListElement: [...byLoc.values()].map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: `Boat Rental ${prettyCity(c.city)}`,
              url: `https://boathire24.com/${c.slug}`,
            })),
          }),
        }}
      />
    </div>
  )
}
