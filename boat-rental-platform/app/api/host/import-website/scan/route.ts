import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiAvailable } from '@/lib/ai/deepseek'
import { assertPublicUrl, discoverCandidates, classifyBoatPages } from '@/lib/import/website'

export const runtime = 'nodejs'
export const maxDuration = 60

// Step 1 of the website importer: crawl the company site and return the pages
// that look like individual boat listings. The client then calls /extract per page.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!aiAvailable()) return NextResponse.json({ error: 'AI import is not configured on this server' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  let site: URL
  try {
    site = assertPublicUrl(String(body?.url ?? ''))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  try {
    const candidates = await discoverCandidates(site.toString())
    const pages = await classifyBoatPages(site.toString(), candidates)
    // Always offer the exact URL the host pasted — it's what they chose to
    // import from. Crucially this covers fleet / rentals / "deals" pages that
    // list MANY boats inline (no per-boat detail pages), which the classifier
    // skips. The extractor now returns every boat on such a page.
    const seed = site.toString().replace(/\/$/, '')
    if (!pages.some((u) => u.replace(/\/$/, '') === seed)) {
      pages.unshift(site.toString())
    }
    return NextResponse.json({
      ok: true,
      siteHost: site.hostname.replace(/^www\./, ''),
      pages: pages.map((url) => ({ url, title: candidates.find((c) => c.url === url)?.text || decodeURI(new URL(url).pathname) })),
    })
  } catch (e) {
    console.error('import-website scan error:', e)
    return NextResponse.json({ error: `Could not scan ${site.hostname}: ${(e as Error).message}` }, { status: 400 })
  }
}
