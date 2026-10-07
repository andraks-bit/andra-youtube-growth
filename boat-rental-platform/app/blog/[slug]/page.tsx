import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react'
// ChevronLeft kept for potential back-nav use; Clock+User used in hero meta
import { getAllPost, getAllPostSlugs, ALL_POSTS } from '@/lib/blog/posts'
import { getAuthor, authorJsonLd, AI_DISCLOSURE } from '@/lib/authors'
import ReadingProgress from '@/components/blog/ReadingProgress'
import type { Metadata } from 'next'

type Post = (typeof ALL_POSTS)[number]

// Topical related posts: shared tag + shared meaningful title/slug tokens (location
// names like "marbella"/"phuket" survive; generic boat words are stopped). Replaces
// the old slice(0,2) that dead-ended every one of ~400 articles into the same 2.
const REL_STOP = new Set(['boat', 'boats', 'yacht', 'yachts', 'charter', 'charters', 'rental', 'rentals', 'hire', 'guide', 'guides', 'best', 'the', 'and', 'for', 'with', 'your', 'how', 'what', 'when', 'where', 'from', 'into', 'trip', 'trips', 'day', 'days', 'tips', 'rent', 'renting'])
function relatedPosts(post: Post, all: Post[], n = 4): Post[] {
  const toks = (s: string) => new Set((s.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length > 3 && !REL_STOP.has(w)))
  const base = toks(`${post.slug} ${post.title}`)
  return all
    .filter((p) => p.slug !== post.slug)
    .map((p) => {
      const t = toks(`${p.slug} ${p.title}`)
      let overlap = 0
      base.forEach((w) => { if (t.has(w)) overlap++ })
      return { p, score: overlap * 2 + (p.tag === post.tag ? 1 : 0) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.p)
}

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getAllPost(slug)
  if (!post) return { title: 'Article not found' }
  // og:article:published_time must be ISO 8601 — post.date is human-readable ("May 12, 2026").
  const publishedISO = (() => { const t = Date.parse(post.date); return isNaN(t) ? undefined : new Date(t).toISOString() })()
  return {
    title: post.title,
    description: post.metaDescription ?? post.excerpt,
    alternates: { canonical: `https://boathire24.com/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.metaDescription ?? post.excerpt,
      images: [{ url: post.heroImage, width: 1400, height: 700, alt: post.title }],
      type: 'article',
      authors: [post.author],
      publishedTime: publishedISO,
      siteName: 'BoatHire24',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.metaDescription ?? post.excerpt,
      images: [post.heroImage],
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getAllPost(slug)
  if (!post) notFound()

  const related = relatedPosts(post, ALL_POSTS, 4)
  const postAuthor = getAuthor(post.author)

  const publishedISO = (() => { const t = Date.parse(post.date); return isNaN(t) ? post.date : new Date(t).toISOString() })()
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.heroImage,
    datePublished: publishedISO,
    dateModified: publishedISO,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://boathire24.com/blog/${post.slug}` },
    // Point at the /authors Person node so the byline resolves to a real,
    // publicly verifiable identity rather than a bare name string.
    author: postAuthor
      ? authorJsonLd(postAuthor)
      : { '@type': 'Person', name: post.author, jobTitle: post.authorRole },
    // Reference the site-wide Organization entity emitted from layout.tsx.
    publisher: { '@id': 'https://boathire24.com/#organization' },
  }

  const faqJsonLd = post.faqs && post.faqs.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.a,
          },
        })),
      }
    : null

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boathire24.com' },
      { '@type': 'ListItem', position: 2, name: 'Charter Guide', item: 'https://boathire24.com/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: `https://boathire24.com/blog/${post.slug}` },
    ],
  }

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2' }}>
      <ReadingProgress />

      {/* JSON-LD: Article */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      {/* JSON-LD: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* JSON-LD: FAQPage (only when faqs exist) */}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* Hero */}
      <div className="relative" style={{ height: '480px', background: '#0a1420' }}>
        <Image src={post.heroImage} alt={post.title} fill priority sizes="100vw" className="object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(7,16,30,0.20) 0%, rgba(7,16,30,0.70) 50%, rgba(7,16,30,0.96) 85%, #07101e 100%)' }}
        />
        <div className="relative z-10 container h-full flex flex-col justify-end pb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs mb-5" aria-label="Breadcrumb" style={{ color: 'rgba(244,244,242,0.45)' }}>
            <Link href="/" className="hover:text-[#74cfe8] transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3 opacity-40" />
            <Link href="/blog" className="hover:text-[#74cfe8] transition-colors">Charter Guide</Link>
            <ChevronRight className="w-3 h-3 opacity-40" />
            <span style={{ color: 'rgba(244,244,242,0.65)' }}>{post.tag}</span>
          </nav>
          <span className="eyebrow mb-4 w-fit">{post.tag}</span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-snug max-w-3xl mb-4" style={{ color: '#f4f4f2' }}>
            {post.title}
          </h1>
          {/* Meta row below heading */}
          <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'rgba(244,244,242,0.55)' }}>
            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{post.author}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{post.readTime}</span>
            <span style={{ color: 'rgba(244,244,242,0.35)' }}>{post.date}</span>
          </div>
        </div>
      </div>

      {/* Sticky floating book button */}
      <div
        className="sticky top-[68px] z-40"
        style={{
          background: 'rgba(7,16,30,0.92)',
          borderBottom: '1px solid rgba(116,207,232,0.10)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div className="container py-2.5 flex items-center justify-between gap-4">
          <p className="text-xs hidden sm:block truncate" style={{ color: 'rgba(244,244,242,0.45)' }}>
            {post.author} · {post.readTime} · {post.date}
          </p>
          <Link
            href="/search"
            className="ml-auto text-xs font-bold px-5 py-2 rounded-full transition-all hover:scale-[1.03]"
            style={{
              background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)',
              color: '#07101e',
              boxShadow: '0 4px 14px rgba(116,207,232,0.28)',
            }}
          >
            Book a charter →
          </Link>
        </div>
      </div>

      {/* Article body */}
      <div className="container py-14">
        <div className="max-w-2xl mx-auto">

          {/* Excerpt lead */}
          <p
            className="text-xl leading-relaxed mb-10 pb-10"
            style={{ color: 'rgba(244,244,242,0.72)', borderBottom: '1px solid rgba(116,207,232,0.15)' }}
          >
            {post.excerpt}
          </p>

          {/* Content */}
          <div
            className="prose-dark"
            style={{ color: 'rgba(244,244,242,0.72)' }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Boat-specific CTA (only when boatSlug is set) */}
          {post.boatSlug && (
            <div
              className="my-10 p-6 rounded-2xl flex items-center justify-between gap-6"
              style={{
                background: 'linear-gradient(135deg, #0e1e35 0%, #0c1828 100%)',
                border: '1px solid rgba(116,207,232,0.30)',
              }}
            >
              <div>
                <p className="font-bold text-base" style={{ color: '#f4f4f2' }}>Ready to book this charter?</p>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(244,244,242,0.55)' }}>Check live availability and instant pricing</p>
              </div>
              <Link
                href={`/boats/${post.boatSlug}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap"
                style={{ background: '#74cfe8', color: '#07101e' }}
              >
                View boat &amp; book →
              </Link>
            </div>
          )}

          {/* FAQ section (only when faqs exist) */}
          {post.faqs && post.faqs.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold mb-6" style={{ color: '#f4f4f2' }}>Frequently Asked Questions</h2>
              <div className="space-y-4">
                {post.faqs.map((faq, i) => (
                  <details
                    key={i}
                    className="group rounded-xl p-5"
                    style={{ background: '#0c1828', border: '1px solid rgba(116,207,232,0.15)' }}
                  >
                    <summary
                      className="font-semibold cursor-pointer list-none flex justify-between items-center"
                      style={{ color: '#f4f4f2' }}
                    >
                      {faq.q}
                      <span className="ml-4 text-[#74cfe8] group-open:rotate-180 transition-transform">▾</span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(244,244,242,0.65)' }}>{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Author card */}
          <div
            className="mt-14 p-6 flex items-center gap-5"
            style={{
              background: '#0c1828',
              border: '1px solid rgba(116,207,232,0.18)',
              borderRadius: '14px',
            }}
          >
            <div
              className="w-14 h-14 rounded-full shrink-0 flex items-center justify-center text-xl font-bold"
              style={{ background: 'rgba(116,207,232,0.15)', color: '#74cfe8' }}
            >
              {post.author[0]}
            </div>
            <div>
              <div className="font-semibold" style={{ color: '#f4f4f2' }}>
                {postAuthor
                  ? <Link href={`/authors/${postAuthor.slug}`} style={{ color: '#f4f4f2', textDecoration: 'none' }}>{post.author}</Link>
                  : post.author}
              </div>
              <div className="text-sm" style={{ color: 'rgba(244,244,242,0.50)' }}>{post.authorRole}</div>
              <div className="text-xs mt-2" style={{ color: 'rgba(244,244,242,0.38)' }}>{AI_DISCLOSURE}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <section
          className="section-sm"
          style={{ borderTop: '1px solid rgba(116,207,232,0.12)' }}
        >
          <div className="container">
            <h2 className="text-2xl font-bold mb-8" style={{ color: '#f4f4f2' }}>Related articles</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex gap-4 p-5 transition-all"
                  style={{
                    background: '#0c1828',
                    border: '1px solid rgba(116,207,232,0.18)',
                    borderRadius: '14px',
                  }}
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0" style={{ background: '#0a1420' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.heroImage} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#74cfe8' }}>{p.tag}</span>
                    <h3 className="font-bold text-sm leading-snug mt-1 group-hover:text-[#74cfe8] transition-colors" style={{ color: '#f4f4f2' }}>{p.title}</h3>
                    <div className="text-xs mt-2 flex items-center gap-1 group-hover:text-[#f4f4f2] transition-colors" style={{ color: 'rgba(116,207,232,0.60)' }}>
                      Read <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  )
}
