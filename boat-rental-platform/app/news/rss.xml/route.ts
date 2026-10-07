import { NextResponse } from 'next/server'
import { ALL_NEWS } from '@/lib/news/posts'

const BASE_URL = 'https://boathire24.com'

// Google News Publisher Center can take a feed as the content source, so this
// mirrors the newsroom rather than the evergreen blog feed at /blog/rss.xml.
export const revalidate = 300

export async function GET(): Promise<NextResponse> {
  const items = ALL_NEWS.slice(0, 50)
    .map((n) => {
      const url = `${BASE_URL}/news/${n.slug}`
      return `
    <item>
      <title><![CDATA[${n.title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description><![CDATA[${n.standfirst}]]></description>
      <pubDate>${new Date(n.datePublished).toUTCString()}</pubDate>
      <category><![CDATA[${n.section}]]></category>
      <dc:creator><![CDATA[${n.author}]]></dc:creator>
      ${n.heroImage ? `<enclosure url="${n.heroImage}" type="image/jpeg" length="0" />` : ''}
    </item>`
    })
    .join('')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>BoatHire24 Newsroom</title>
    <link>${BASE_URL}/news</link>
    <description>Marina, regulation and charter-market news from BoatHire24.</description>
    <language>en-gb</language>
    <managingEditor>info@boathire24.com (BoatHire24 Editorial)</managingEditor>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/news/rss.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`

  return new NextResponse(rss, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    },
  })
}
