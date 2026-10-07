import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getNewsArticle, getNewsSlugs, ALL_NEWS } from '@/lib/news/posts'
import { getAuthor, authorJsonLd, AI_DISCLOSURE } from '@/lib/authors'

const BASE_URL = 'https://boathire24.com'

export function generateStaticParams() {
  return getNewsSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = getNewsArticle(slug)
  if (!article) return { title: 'Article not found' }
  return {
    title: article.title,
    description: article.metaDescription ?? article.standfirst,
    alternates: { canonical: `${BASE_URL}/news/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.metaDescription ?? article.standfirst,
      images: [{ url: article.heroImage, width: 1400, height: 700, alt: article.title }],
      type: 'article',
      authors: [article.author],
      publishedTime: article.datePublished,
      modifiedTime: article.dateModified,
      section: article.section,
      siteName: 'BoatHire24',
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.metaDescription ?? article.standfirst,
      images: [article.heroImage],
    },
  }
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getNewsArticle(slug)
  if (!article) notFound()

  const author = getAuthor(article.author)
  const more = ALL_NEWS.filter((n) => n.slug !== article.slug).slice(0, 4)

  const newsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title.slice(0, 110), // Google caps headline at 110 chars
    description: article.standfirst,
    image: [article.heroImage],
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    articleSection: article.section,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/news/${article.slug}` },
    author: author
      ? authorJsonLd(author)
      : { '@type': 'Organization', name: 'BoatHire24', '@id': `${BASE_URL}/#organization` },
    publisher: { '@id': `${BASE_URL}/#organization` },
    ...(article.location ? { contentLocation: { '@type': 'Place', name: article.location } } : {}),
    ...(article.sources.length
      ? { citation: article.sources.map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url })) }
      : {}),
    isAccessibleForFree: true,
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'News', item: `${BASE_URL}/news` },
      { '@type': 'ListItem', position: 3, name: article.title, item: `${BASE_URL}/news/${article.slug}` },
    ],
  }

  const published = new Date(article.datePublished)
  const modified = new Date(article.dateModified)
  const fmt = (d: Date) =>
    d.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <article style={{ maxWidth: '760px', margin: '0 auto', padding: '64px 24px 0' }}>
        <Link href="/news" style={{ fontSize: '13px', color: '#74cfe8', textDecoration: 'none' }}>← Newsroom</Link>

        <div style={{ marginTop: '22px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#74cfe8' }}>
          {article.section}{article.location ? ` · ${article.location}` : ''}
        </div>

        <h1 style={{ fontSize: 'clamp(1.9rem, 4.5vw, 2.9rem)', fontWeight: 800, lineHeight: 1.15, margin: '12px 0 16px' }}>
          {article.title}
        </h1>

        <p style={{ fontSize: '18px', lineHeight: 1.7, color: 'rgba(244,244,242,0.72)', marginBottom: '20px' }}>
          {article.standfirst}
        </p>

        <div style={{ fontSize: '13px', color: 'rgba(244,244,242,0.5)', paddingBottom: '20px', borderBottom: '1px solid rgba(116,207,232,0.14)' }}>
          By{' '}
          {author
            ? <Link href={`/authors/${author.slug}`} style={{ color: '#74cfe8', textDecoration: 'none' }}>{article.author}</Link>
            : article.author}
          {' · '}
          <time dateTime={article.datePublished}>Published {fmt(published)}</time>
          {article.dateModified !== article.datePublished && (
            <> · <time dateTime={article.dateModified}>Updated {fmt(modified)}</time></>
          )}
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={article.heroImage}
          alt={article.title}
          style={{ width: '100%', borderRadius: '16px', margin: '28px 0', display: 'block' }}
        />

        <div
          className="prose-news"
          style={{ fontSize: '17px', lineHeight: 1.85, color: 'rgba(244,244,242,0.82)' }}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Sources — every newsroom item must show where the facts came from. */}
        <section style={{ marginTop: '44px', padding: '22px 24px', background: '#0c1828', border: '1px solid rgba(116,207,232,0.18)', borderRadius: '14px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>Sources</h2>
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: 1.9, color: 'rgba(244,244,242,0.62)' }}>
            {article.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: '#74cfe8' }}>{s.title}</a>
                {s.publisher ? ` — ${s.publisher}` : ''}
              </li>
            ))}
          </ol>
          <p style={{ marginTop: '14px', fontSize: '12px', color: 'rgba(244,244,242,0.38)' }}>
            {AI_DISCLOSURE} Spotted an error?{' '}
            <Link href="/editorial-policy" style={{ color: '#74cfe8' }}>Tell us and we&apos;ll correct it</Link>.
          </p>
        </section>
      </article>

      {more.length > 0 && (
        <section style={{ maxWidth: '760px', margin: '0 auto', padding: '52px 24px 88px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px' }}>More from the newsroom</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {more.map((n) => (
              <Link key={n.slug} href={`/news/${n.slug}`} style={{ display: 'block', padding: '18px 20px', background: '#0c1828', border: '1px solid rgba(116,207,232,0.14)', borderRadius: '14px', textDecoration: 'none' }}>
                <div style={{ fontSize: '12px', color: '#74cfe8', marginBottom: '6px' }}>{n.section} · {n.datePublished.slice(0, 10)}</div>
                <div style={{ fontWeight: 700, color: '#f4f4f2' }}>{n.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
