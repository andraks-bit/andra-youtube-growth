import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { openaiVisionAvailable } from '@/lib/ai/openai'
import { extractBoatsFromImageAndSite, fetchHtml, htmlToText, extractImages, assertPublicUrl } from '@/lib/import/website'

export const runtime = 'nodejs'
export const maxDuration = 120

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Scan a screenshot (+ optional website link) → GPT-4o vision reads the ad,
// website text fills gaps → draft listing(s). The screenshot is stored and
// used as the boat's photo.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!openaiVisionAvailable()) {
    return NextResponse.json({ error: 'Screenshot reading needs a vision model — ask an admin to add OPENAI_API_KEY to the server.' }, { status: 503 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No screenshot uploaded' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Please upload an image (PNG or JPG)' }, { status: 400 })
  if (file.size > 15_000_000) return NextResponse.json({ error: 'Image is too large (max 15 MB)' }, { status: 400 })

  const rawUrl = String(form?.get('url') ?? '').trim()
  const note = String(form?.get('note') ?? '').trim().slice(0, 600)

  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const dataUrl = `data:${file.type};base64,${buf.toString('base64')}`

    // Store the screenshot so it can become the listing's photo.
    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    const path = `screenshots/${user.id}-${Date.now()}.${ext}`
    let screenshotUrl = ''
    const up = await admin.storage.from('boat-images').upload(path, buf, { contentType: file.type, upsert: false })
    if (up.data) screenshotUrl = admin.storage.from('boat-images').getPublicUrl(up.data.path).data.publicUrl

    // Optional website for extra context + photos.
    let websiteText = ''
    let siteImages: string[] = []
    let siteUrl: string | null = null
    if (rawUrl) {
      try {
        const page = assertPublicUrl(rawUrl)
        siteUrl = page.toString()
        const html = await fetchHtml(siteUrl)
        websiteText = htmlToText(html)
        siteImages = extractImages(html, siteUrl).slice(0, 8)
      } catch { /* website is optional — carry on with the image only */ }
    }

    const images = [screenshotUrl, ...siteImages].filter(Boolean)
    const boats = await extractBoatsFromImageAndSite([dataUrl], siteUrl, websiteText, images, note)
    if (boats.length === 0) {
      return NextResponse.json({ error: 'Could not read a boat listing from that screenshot. Try a clearer image.', boats: [] }, { status: 200 })
    }
    return NextResponse.json({ ok: true, boats })
  } catch (e) {
    console.error('import screenshot error:', e)
    return NextResponse.json({ error: `Could not read that screenshot: ${(e as Error).message}`, boats: [] }, { status: 200 })
  }
}
