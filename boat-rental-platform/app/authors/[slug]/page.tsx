import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { AUTHORS, getAuthor, authorJsonLd, AI_DISCLOSURE } from '@/lib/authors'
import { ALL_POSTS } from '@/lib/blog/posts'
import { ALL_NEWS } from '@/lib/news/posts'

const BASE_URL = 'https://boathire24.com'

export function generateStaticParams() {
  return AUTHORS.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const author = getAuthor(slug)
  if (!author) return { title: 'Author not found' }
  return {
    // Role already ends in "BoatHire24" and the root layout appends "| BoatHire24".
    title: `${author.name} — ${author.role.replace(/,?\s*BoatHire24$/, '')}`,
    description: author.bio.slice(0, 160),
    alternates: { canonical: `${BASE_URL}/authors/${author.slug}` },
    openGraph: {
      title: `${author.name} — ${author.role}`,
      description: author.bio.slice(0, 200),
      type: 'profile',
      images: [{ url: author.image, alt: author.name }],
      siteName: 'BoatHire24',
    },
  }
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const author = getAuthor(slug)
  if (!author) notFound()

  const news = ALL_NEWS.filter((n) => n.author === author.name)
  const posts = ALL_POSTS.filter((p) => p.author === author.name).slice(0, 24)

  const profileJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: authorJsonLd(author),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Authors', item: `${BASE_URL}/authors` },
      { '@type': 'ListItem', position: 3, name: author.name, item: `${BASE_URL}/authors/${author.slug}` },
    ],
  }

  const card: React.CSSProperties = {
    background: '#0c1828',
    border: '1px solid rgba(116,207,232,0.14)',
    borderRadius: '14px',
    padding: '18px 20px',
    textDecoration: 'none',
    display: 'block',
  }

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '72px 24px 0' }}>
        <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={author.image}
            alt={author.name}
            width={120}
            height={120}
            style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(116,207,232,0.25)' }}
          />
          <div style={{ flex: 1, minWidth: '240px' }}>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '6px' }}>{author.name}</h1>
            <p style={{ color: '#74cfe8', fontWeight: 600, marginBottom: '16px' }}>{author.role}</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {author.sameAs.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="me noopener noreferrer"
                  style={{ fontSize: '13px', fontWeight: 600, padding: '8px 16px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', color: 'rgba(244,244,242,0.7)', border: '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}
                >
                  {new URL(url).hostname.replace('www.', '')}
                </a>
              ))}
            </div>
          </div>
        </div>

        <p style={{ marginTop: '28px', fontSize: '16px', lineHeight: 1.8, color: 'rgba(244,244,242,0.72)' }}>{author.bio}</p>

        <p style={{ marginTop: '18px', fontSize: '13px', lineHeight: 1.7, color: 'rgba(244,244,242,0.42)' }}>
          {AI_DISCLOSURE} See our{' '}
          <Link href="/editorial-policy" style={{ color: '#74cfe8' }}>editorial policy</Link> for how we
          research, source and correct what we publish.
        </p>
      </section>

      {news.length > 0 && (
        <section style={{ maxWidth: '860px', margin: '0 auto', padding: '52px 24px 0' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '18px' }}>Latest news</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {news.map((n) => (
              <Link key={n.slug} href={`/news/${n.slug}`} style={card}>
                <div style={{ fontSize: '12px', color: '#74cfe8', marginBottom: '6px' }}>{n.section} · {n.datePublished.slice(0, 10)}</div>
                <div style={{ fontWeight: 700, color: '#f4f4f2' }}>{n.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section style={{ maxWidth: '860px', margin: '0 auto', padding: '52px 24px 88px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '18px' }}>Guides by {author.name}</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {posts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} style={card}>
                <div style={{ fontSize: '12px', color: 'rgba(244,244,242,0.45)', marginBottom: '6px' }}>{p.tag} · {p.date}</div>
                <div style={{ fontWeight: 700, color: '#f4f4f2' }}>{p.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
