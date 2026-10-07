import Link from 'next/link'
import type { Metadata } from 'next'
import { ALL_NEWS } from '@/lib/news/posts'

const BASE_URL = 'https://boathire24.com'

export const metadata: Metadata = {
  title: 'Newsroom — Boating & charter news',
  description:
    'Timely reporting on marinas, charter regulation, licensing and the boat-rental market across the Costa del Sol, the Mediterranean and beyond.',
  alternates: {
    canonical: `${BASE_URL}/news`,
    types: { 'application/rss+xml': `${BASE_URL}/news/rss.xml` },
  },
  openGraph: {
    title: 'BoatHire24 Newsroom',
    description: 'Marina, regulation and charter-market news.',
    type: 'website',
    siteName: 'BoatHire24',
  },
}

export default function NewsIndexPage() {
  const [lead, ...rest] = ALL_NEWS

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'BoatHire24 Newsroom',
    url: `${BASE_URL}/news`,
    description: 'Timely reporting on marinas, charter regulation and the boat-rental market.',
    publisher: { '@id': `${BASE_URL}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: ALL_NEWS.slice(0, 30).map((n, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${BASE_URL}/news/${n.slug}`,
        name: n.title,
      })),
    },
  }

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />

      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '72px 24px 0' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, marginBottom: '12px' }}>Newsroom</h1>
        <p style={{ fontSize: '17px', lineHeight: 1.75, color: 'rgba(244,244,242,0.65)', maxWidth: '620px' }}>
          Marina works, licensing and regulation changes, season dates and charter-market shifts —
          reported as they happen, with sources on every story. For evergreen how-to material see the{' '}
          <Link href="/blog" style={{ color: '#74cfe8' }}>charter guide</Link>.
        </p>
        <p style={{ marginTop: '14px', fontSize: '13px', color: 'rgba(244,244,242,0.42)' }}>
          <Link href="/editorial-policy" style={{ color: '#74cfe8' }}>Editorial policy</Link>
          {' · '}
          <a href="/news/rss.xml" style={{ color: '#74cfe8' }}>RSS</a>
        </p>
      </section>

      {ALL_NEWS.length === 0 ? (
        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px 88px' }}>
          <div style={{ padding: '32px', background: '#0c1828', border: '1px solid rgba(116,207,232,0.16)', borderRadius: '16px', color: 'rgba(244,244,242,0.6)' }}>
            The newsroom is being set up. Stories will appear here shortly.
          </div>
        </section>
      ) : (
        <>
          <section style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px 0' }}>
            <Link href={`/news/${lead.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lead.heroImage} alt={lead.title} style={{ width: '100%', borderRadius: '16px', display: 'block', marginBottom: '20px' }} />
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#74cfe8', marginBottom: '8px' }}>
                {lead.section} · {lead.datePublished.slice(0, 10)}
              </div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.1rem)', fontWeight: 800, lineHeight: 1.2, color: '#f4f4f2', marginBottom: '10px' }}>{lead.title}</h2>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: 'rgba(244,244,242,0.62)' }}>{lead.standfirst}</p>
            </Link>
          </section>

          <section style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px 88px' }}>
            <div style={{ display: 'grid', gap: '14px' }}>
              {rest.map((n) => (
                <Link key={n.slug} href={`/news/${n.slug}`} style={{ display: 'block', padding: '22px 24px', background: '#0c1828', border: '1px solid rgba(116,207,232,0.14)', borderRadius: '14px', textDecoration: 'none' }}>
                  <div style={{ fontSize: '12px', color: '#74cfe8', marginBottom: '8px' }}>{n.section} · {n.datePublished.slice(0, 10)}</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#f4f4f2', marginBottom: '6px' }}>{n.title}</div>
                  <div style={{ fontSize: '14px', lineHeight: 1.65, color: 'rgba(244,244,242,0.55)' }}>{n.standfirst}</div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
