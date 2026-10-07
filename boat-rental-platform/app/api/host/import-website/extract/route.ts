import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiAvailable } from '@/lib/ai/deepseek'
import { assertPublicUrl, fetchHtml, extractBoatsFromPage } from '@/lib/import/website'

export const runtime = 'nodejs'
export const maxDuration = 60

// Step 2 of the website importer: fetch ONE boat page and extract structured
// listing data (specs, prices, photos) with the LLM. Called once per page.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!aiAvailable()) return NextResponse.json({ error: 'AI import is not configured on this server' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  let page: URL
  try {
    page = assertPublicUrl(String(body?.url ?? ''))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  const note = String(body?.note ?? '').trim().slice(0, 600)

  try {
    const html = await fetchHtml(page.toString())
    const boats = await extractBoatsFromPage(page.toString(), html, note)
    return NextResponse.json({ ok: true, boats })
  } catch (e) {
    console.error('import-website extract error:', e)
    return NextResponse.json({ error: (e as Error).message, boats: [] }, { status: 200 })
  }
}
