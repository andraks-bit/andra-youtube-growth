import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiAvailable } from '@/lib/ai/deepseek'
import { extractBoatsFromText, htmlToText } from '@/lib/import/website'
import { resolveDropboxDirect, fetchDocument, pdfToText } from '@/lib/import/docs'

export const runtime = 'nodejs'
export const maxDuration = 120

// Dropbox importer: operator shares a Dropbox link to a fleet PDF (or a doc/page)
// → download it → extract text → DeepSeek pulls out the boats → review + import.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!aiAvailable()) return NextResponse.json({ error: 'AI import is not configured on this server' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  let direct: string
  try {
    direct = resolveDropboxDirect(String(body?.url ?? ''))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  try {
    const doc = await fetchDocument(direct)
    if (doc.kind === 'pdf') {
      const text = await pdfToText(doc.bytes)
      if (text.trim().length < 80) return NextResponse.json({ error: 'That Dropbox PDF has no readable text (it may be a scan).', boats: [] }, { status: 200 })
      const boats = await extractBoatsFromText(doc.filename, text)
      return NextResponse.json({ ok: true, boats, source: doc.filename })
    }
    // HTML / plain text Dropbox Paper or doc.
    const raw = Buffer.from(doc.bytes).toString('utf-8')
    const text = doc.kind === 'html' ? htmlToText(raw, 24000) : raw
    const boats = await extractBoatsFromText(doc.filename, text)
    return NextResponse.json({ ok: true, boats, source: doc.filename })
  } catch (e) {
    console.error('import-dropbox error:', e)
    return NextResponse.json({ error: `Could not read that Dropbox link: ${(e as Error).message}`, boats: [] }, { status: 200 })
  }
}
