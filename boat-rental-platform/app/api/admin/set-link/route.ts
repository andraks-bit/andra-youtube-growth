import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Admin-only: set (or clear) a host's external website/feed URL on their profile.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!(me as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, url } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  // Normalise: empty → null (clears it); add https:// if they omitted the scheme.
  let clean: string | null = typeof url === 'string' && url.trim() ? url.trim() : null
  if (clean && !/^https?:\/\//i.test(clean)) clean = `https://${clean}`

  // Store on auth user_metadata — no schema migration needed.
  const { data: u } = await admin.auth.admin.getUserById(userId)
  const meta = (u.user?.user_metadata ?? {}) as Record<string, unknown>
  const { error } = await admin.auth.admin.updateUserById(userId, { user_metadata: { ...meta, website_url: clean } })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, website_url: clean })
}
