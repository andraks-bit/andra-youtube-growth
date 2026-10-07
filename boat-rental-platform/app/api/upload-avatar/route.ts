import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
  }

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const path = `${user.id}/avatar-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { data, error } = await supabaseAdmin.storage
    .from('avatars')
    .upload(path, buffer, { contentType: file.type || 'image/jpeg', upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(data.path)
  const avatarUrl = urlData.publicUrl

  // Save to profile + auth metadata
  await supabaseAdmin.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)
  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, avatar_url: avatarUrl },
  })

  return NextResponse.json({ url: avatarUrl })
}
