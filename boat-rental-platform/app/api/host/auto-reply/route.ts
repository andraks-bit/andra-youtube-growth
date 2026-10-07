import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Read / set the host's automatic-inquiry-replies preference (default: on).
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await admin.from('profiles').select('auto_reply_enabled').eq('id', user.id).single()
  if (error) return NextResponse.json({ enabled: true, configurable: false }) // column missing → default on
  return NextResponse.json({ enabled: (data as any)?.auto_reply_enabled !== false, configurable: true })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const enabled = body?.enabled !== false
  const { error } = await admin.from('profiles').update({ auto_reply_enabled: enabled } as any).eq('id', user.id)
  if (error) return NextResponse.json({ error: 'Could not save the setting' }, { status: 500 })
  return NextResponse.json({ ok: true, enabled })
}
