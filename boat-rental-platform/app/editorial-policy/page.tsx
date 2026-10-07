import Link from 'next/link'
import type { Metadata } from 'next'
import { AUTHORS } from '@/lib/authors'

const BASE_URL = 'https://boathire24.com'

export const metadata: Metadata = {
  title: 'Editorial policy, ownership & corrections',
  description:
    'Who owns BoatHire24, who writes for it, how we source and fact-check what we publish, how we use AI, and how to request a correction.',
  alternates: { canonical: `${BASE_URL}/editorial-policy` },
}

const section: React.CSSProperties = { maxWidth: '760px', margin: '0 auto', padding: '0 24px' }
const h2: React.CSSProperties = { fontSize: '1.35rem', fontWeight: 800, color: '#f4f4f2', margin: '44px 0 14px' }
const p: React.CSSProperties = { fontSize: '16px', lineHeight: 1.85, color: 'rgba(244,244,242,0.7)', marginBottom: '14px' }

export default function EditorialPolicyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Editorial policy, ownership & corrections',
    url: `${BASE_URL}/editorial-policy`,
    publisher: { '@id': `${BASE_URL}/#organization` },
  }

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh', paddingBottom: '88px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section style={{ ...section, paddingTop: '72px' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 800, marginBottom: '14px' }}>
          Editorial policy
        </h1>
        <p style={{ ...p, fontSize: '17px' }}>
          How BoatHire24 decides what to publish, where the facts come from, and what happens when we
          get something wrong.
        </p>

        <h2 style={h2}>Who we are</h2>
        <p style={p}>
          BoatHire24 is a boat-rental and yacht-charter marketplace founded in 2020, operating across the
          Costa del Sol, the wider Mediterranean and South-East Asia. The company is owned and run by its
          two founders, listed below. Full company background is on our{' '}
          <Link href="/about" style={{ color: '#74cfe8' }}>about page</Link>; you can reach the editorial
          desk at <a href="mailto:info@boathire24.com" style={{ color: '#74cfe8' }}>info@boathire24.com</a>{' '}
          or via our <Link href="/contact" style={{ color: '#74cfe8' }}>contact page</Link>.
        </p>

        <h2 style={h2}>Who writes here</h2>
        <p style={p}>
          Every article carries the name of a real, identifiable person who is accountable for it. We do not
          publish under invented author personas or stock pen-names. Our contributors:
        </p>
        <ul style={{ ...p, paddingLeft: '20px' }}>
          {AUTHORS.map((a) => (
            <li key={a.slug} style={{ marginBottom: '8px' }}>
              <Link href={`/authors/${a.slug}`} style={{ color: '#74cfe8', fontWeight: 600 }}>{a.name}</Link>
              {' — '}{a.role}
            </li>
          ))}
        </ul>

        <h2 style={h2}>How we use AI</h2>
        <p style={p}>
          We use AI tools to research, draft and structure articles. Nothing publishes unreviewed: a named
          member of the team checks each piece for accuracy before it goes live, and that person&apos;s name
          is the byline. We disclose this on every article rather than presenting AI-assisted work as unaided
          human reporting. AI is never used to invent facts, quotes, prices, reviews or sources.
        </p>

        <h2 style={h2}>Sourcing and fact-checking</h2>
        <p style={p}>
          Newsroom articles list their sources at the foot of the page, with links to the original material —
          port authority notices, official gazettes, marina announcements and established news outlets. Where
          we report figures from our own marketplace (prices, availability, fleet size), we say so and describe
          the period the data covers. If a claim cannot be sourced, we do not publish it.
        </p>

        <h2 style={h2}>Commercial disclosure</h2>
        <p style={p}>
          BoatHire24 earns money when someone books a boat through the platform, so we have a commercial
          interest in the subjects we cover. We flag this rather than hide it. Editorial coverage is not sold:
          operators cannot pay to appear in an article, and any sponsored or affiliate content would be
          labelled as such at the top of the page. We currently publish no sponsored content.
        </p>

        <h2 style={h2}>Corrections</h2>
        <p style={p}>
          If we publish something inaccurate, we fix it and say we did. Email{' '}
          <a href="mailto:info@boathire24.com" style={{ color: '#74cfe8' }}>info@boathire24.com</a> with the
          article URL and what is wrong. We aim to respond within two working days. Substantive corrections
          are noted at the foot of the article with the date of the change; the article&apos;s &ldquo;Updated&rdquo;
          timestamp reflects when it was last edited.
        </p>

        <h2 style={h2}>Unpublishing</h2>
        <p style={p}>
          We do not quietly delete published articles. If a story is withdrawn, the page states that it was
          withdrawn and why.
        </p>
      </section>
    </div>
  )
}
