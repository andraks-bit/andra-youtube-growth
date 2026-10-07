import type { Metadata } from 'next'
import Link from 'next/link'
import { LANDING_PAGES } from '@/lib/landing/pages'
import { LANDING_PAGES_ES } from '@/lib/landing/pages-es'

const gold = '#74cfe8'
const goldBorder = 'rgba(116,207,232,0.22)'

export const metadata: Metadata = {
  title: 'Alquiler de Barcos y Yates — Guías en Español',
  description:
    'Guías en español para alquilar barcos, yates y catamaranes — Marbella, Puerto Banús y destinos de todo el mundo. Patrón incluido y reserva instantánea en BoatHire24.',
  alternates: { canonical: 'https://boathire24.com/es' },
  openGraph: {
    title: 'Alquiler de Barcos y Yates — Guías en Español',
    description:
      'Guías en español para alquilar barcos, yates y catamaranes con patrón incluido.',
    type: 'website',
    locale: 'es_ES',
    siteName: 'BoatHire24',
  },
}

// Spanish hub — the crawlable entry point for the /es section (the language
// switcher is cookie+reload buttons search engines can't follow).
export default function EsHubPage() {
  // Only ES pages whose EN twin is canonical: linking to variants that
  // canonicalize elsewhere spends crawl budget on duplicate signals.
  const nonCanonicalEn = new Set(
    LANDING_PAGES.filter((p) => p.canonicalSlug && p.canonicalSlug !== p.slug).map((p) => p.slug),
  )
  const pages = LANDING_PAGES_ES
    .filter((p) => !nonCanonicalEn.has(p.slug))
    .slice()
    .sort((a, b) => a.slug.localeCompare(b.slug))

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boathire24.com' },
              { '@type': 'ListItem', position: 2, name: 'Guías en español', item: 'https://boathire24.com/es' },
            ],
          }),
        }}
      />

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid rgba(116,207,232,0.10)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#0a1a32,#071122)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(116,207,232,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '860px', margin: '0 auto', padding: '72px 24px 56px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 3rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.12, marginBottom: '14px' }}>
            Alquiler de barcos y yates <span style={{ color: gold }}>en español</span>
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(244,244,242,0.62)', maxWidth: '560px', margin: '0 auto 28px', lineHeight: 1.65 }}>
            Guías para alquilar barcos, yates y catamaranes en Marbella, Puerto Banús y destinos de todo el mundo — patrón incluido y reserva instantánea.
          </p>
          <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 28px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontWeight: 700, fontSize: '14px', textDecoration: 'none', border: `1px solid ${goldBorder}` }}>
            Ver todos los barcos
          </Link>
        </div>
      </section>

      {/* ── All Spanish guides ── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px 96px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f4f4f2', marginBottom: '18px' }}>
          Todas las guías ({pages.length})
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {pages.map((p) => (
            <Link key={p.slug} href={`/es/${p.slug}`} style={{ display: 'block', padding: '14px 16px', borderRadius: '12px', background: '#0c1828', border: '1px solid rgba(116,207,232,0.15)', textDecoration: 'none', color: '#f4f4f2', fontSize: '14px', fontWeight: 600, lineHeight: 1.4 }}>
              {p.h1 || p.title}
            </Link>
          ))}
        </div>
        <p style={{ marginTop: '28px', fontSize: '13px', color: 'rgba(244,244,242,0.45)' }}>
          ¿Prefieres inglés?{' '}
          <Link href="/" style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>
            Visita la versión en inglés
          </Link>
          {' '}·{' '}
          <Link href="/boat-rental-marbella" style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>
            Boat rental Marbella
          </Link>
        </p>
      </section>
    </div>
  )
}
