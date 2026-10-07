import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/docs?userId=xxx
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const { data: docs } = await supabaseAdmin
    .from('verification_documents')
    .select('id, doc_type, file_name, file_size, storage_path, uploaded_at')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })

  // Generate fresh signed URLs (valid 1 hour)
  const withUrls = await Promise.all(
    (docs ?? []).map(async (doc) => {
      const { data } = await supabaseAdmin.storage
        .from('verification-docs')
        .createSignedUrl(doc.storage_path, 3600)
      return { ...doc, url: data?.signedUrl ?? null }
    })
  )

  return NextResponse.json({ docs: withUrls })
}
