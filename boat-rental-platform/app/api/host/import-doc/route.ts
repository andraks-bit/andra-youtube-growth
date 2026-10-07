import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiAvailable } from '@/lib/ai/deepseek'
import { extractBoatsFromText } from '@/lib/import/website'
import { pdfToText } from '@/lib/import/docs'

export const runtime = 'nodejs'
export const maxDuration = 120

// PDF upload importer: operator sends a fleet PDF → extract its text → DeepSeek
// pulls out every boat → client reviews and imports. One PDF can yield many boats.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!aiAvailable()) return NextResponse.json({ error: 'AI import is not configured on this server' }, { status: 503 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No PDF uploaded' }, { status: 400 })
  if (file.size > 25_000_000) return NextResponse.json({ error: 'PDF is too large (max 25 MB)' }, { status: 400 })
  const isPdf = file.type.includes('pdf') || /\.pdf$/i.test(file.name)
  if (!isPdf) return NextResponse.json({ error: 'Please upload a PDF file' }, { status: 400 })

  try {
    const text = await pdfToText(await file.arrayBuffer())
    if (text.trim().length < 80) {
      return NextResponse.json({ error: 'Could not read text from that PDF — it may be a scan/image. Try a text-based PDF.', boats: [] }, { status: 200 })
    }
    const boats = await extractBoatsFromText(file.name, text)
    return NextResponse.json({ ok: true, boats, chars: text.length })
  } catch (e) {
    console.error('import-doc error:', e)
    return NextResponse.json({ error: `Could not read that PDF: ${(e as Error).message}`, boats: [] }, { status: 200 })
  }
}
