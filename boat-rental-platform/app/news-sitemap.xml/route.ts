import { NextResponse } from 'next/server'
import { recentNews } from '@/lib/news/posts'

const BASE_URL = 'https://boathire24.com'

/**
 * Google News sitemap.
 *
 * Distinct from the main sitemap: Google only reads articles published in the
 * last 2 days from here and caps the file at 1000 URLs, so `recentNews()`
 * enforces both. Revalidates every 5 minutes because a news sitemap that lags
 * the newsroom is worse than none at all.
 */
export const revalidate = 300

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(): Promise<NextResponse> {
  const items = recentNews()
    .map(
      (n) => `
  <url>
    <loc>${BASE_URL}/news/${n.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>BoatHire24</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${n.datePublished}</news:publication_date>
      <news:title>${xmlEscape(n.title)}</news:title>
    </news:news>
    <lastmod>${n.dateModified}</lastmod>
  </url>`,
    )
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${items}
</urlset>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    },
  })
}
