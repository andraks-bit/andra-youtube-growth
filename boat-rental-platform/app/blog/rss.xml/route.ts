import { NextResponse } from 'next/server'
import { ALL_POSTS } from '@/lib/blog/posts'

const BASE_URL = 'https://boathire24.com'

export const dynamic = 'force-static'
export const revalidate = 86400 // revalidate daily

export async function GET(): Promise<NextResponse> {
  const items = ALL_POSTS
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((post) => {
      const url = `${BASE_URL}/blog/${post.slug}`
      const pubDate = new Date(post.date).toUTCString()
      // Strip HTML from excerpt for RSS description
      const description = post.excerpt.replace(/<[^>]*>/g, '')
      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description><![CDATA[${description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <category><![CDATA[${post.tag}]]></category>
      <author><![CDATA[${post.author}, ${post.authorRole}]]></author>
      ${post.heroImage ? `<enclosure url="${post.heroImage}" type="image/jpeg" length="0" />` : ''}
    </item>`
    })
    .join('')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>BoatHire24 — Charter Guide &amp; Boat Reviews</title>
    <link>${BASE_URL}/blog</link>
    <description>Practical guides, destination deep-dives, and in-depth reviews of every boat in the Marbella charter fleet. Updated weekly by BoatHire24 fleet captains and charter specialists.</description>
    <language>en-gb</language>
    <managingEditor>info@boathire24.com (BoatHire24 Editorial)</managingEditor>
    <webMaster>info@boathire24.com (BoatHire24)</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>https://images.unsplash.com/photo-1528154291023-a6525fabe5b4?w=144&amp;q=80</url>
      <title>BoatHire24</title>
      <link>${BASE_URL}</link>
    </image>
    ${items}
  </channel>
</rss>`

  return new NextResponse(rss, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  })
}
