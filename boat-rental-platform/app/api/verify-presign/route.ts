import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Returns a signed upload URL per document so the browser can upload files
// DIRECTLY to Supabase Storage, bypassing Vercel's 4.5MB request-body limit.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { files } = await req.json() as { files: { type: string; ext: string }[] }
  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: 'No files' }, { status: 400 })
  }

  const ALLOWED = ['passport', 'company_registration', 'boat_registration', 'marina_contract', 'boat_insurance']
  const out: { type: string; path: string; token: string }[] = []

  for (const f of files) {
    if (!ALLOWED.includes(f.type)) continue
    const ext = (f.ext || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'pdf'
    const path = `${user.id}/${f.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
    const { data, error } = await supabaseAdmin.storage
      .from('verification-docs')
      .createSignedUploadUrl(path)
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Could not create upload URL' }, { status: 500 })
    }
    out.push({ type: f.type, path: data.path, token: data.token })
  }

  return NextResponse.json({ uploads: out })
}
