import Link from 'next/link'
import type { Metadata } from 'next'
import { ALL_POSTS } from '@/lib/blog/posts'
import { LANDING_PAGES } from '@/lib/landing/pages'

export const metadata: Metadata = {
  title: 'Boat & Yacht Charter FAQ — Marbella',
  description: 'Answers to the most common questions about renting boats and yachts in Marbella: prices, licences, skippers, what is included, best times, and how booking works.',
  alternates: { canonical: 'https://boathire24.com/faq' },
  openGraph: {
    title: 'Boat & Yacht Charter FAQ — Marbella',
    description: 'Common questions about chartering a boat in Marbella, answered.',
    type: 'website',
    siteName: 'BoatHire24',
  },
}

interface QA { q: string; a: string; href: string; source: string }

function collectFaqs(): QA[] {
  const out: QA[] = []
  const seen = new Set<string>()
  const add = (faqs: Array<{ q: string; a: string }> | undefined, href: string, source: string) => {
    for (const f of faqs ?? []) {
      const key = (f.q || '').trim().toLowerCase()
      if (!key || seen.has(key) || !f.a) continue
      seen.add(key)
      out.push({ q: f.q.trim(), a: f.a.trim(), href, source })
    }
  }
  for (const p of ALL_POSTS) add(p.faqs, `/blog/${p.slug}`, p.title)
  for (const p of LANDING_PAGES) add(p.faqs, `/${p.slug}`, p.h1 || p.title)
  return out
}

const gold = '#74cfe8'

export default function FaqHubPage() {
  const faqs = collectFaqs().slice(0, 80)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boathire24.com' },
      { '@type': 'ListItem', position: 2, name: 'FAQ', item: 'https://boathire24.com/faq' },
    ],
  }

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <section style={{ maxWidth: '820px', margin: '0 auto', padding: '88px 24px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: gold, marginBottom: '14px' }}>
          Frequently asked questions
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.12, marginBottom: '14px' }}>
          Boat &amp; yacht charter in Marbella, answered
        </h1>
        <p style={{ fontSize: '16px', color: 'rgba(244,244,242,0.6)', lineHeight: 1.65 }}>
          Everything about prices, licences, skippers, what&apos;s included, and how booking works. Browse boats at{' '}
          <Link href="/search" style={{ color: gold }}>/search</Link> or read the{' '}
          <Link href="/blog" style={{ color: gold }}>charter guides</Link>.
        </p>
      </section>

      <section style={{ maxWidth: '820px', margin: '0 auto', padding: '0 24px 96px' }}>
        {faqs.map((f, i) => (
          <details key={i} style={{ borderBottom: '1px solid rgba(116,207,232,0.12)', padding: '16px 0' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '16px', color: '#f4f4f2' }}>{f.q}</summary>
            <p style={{ marginTop: '10px', color: 'rgba(244,244,242,0.72)', lineHeight: 1.7, fontSize: '15px' }}>{f.a}</p>
            <Link href={f.href} style={{ display: 'inline-block', marginTop: '8px', fontSize: '13px', color: gold }}>
              More: {f.source} →
            </Link>
          </details>
        ))}
      </section>
    </div>
  )
}
