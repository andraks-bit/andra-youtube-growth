import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Files are already uploaded to storage by the browser (via signed URLs).
  // This endpoint only receives lightweight JSON metadata — no file bodies.
  const body = await req.json() as {
    ownerType: string
    docs: { type: string; name: string; path: string }[]
  }
  const ownerType = body.ownerType
  const docs = Array.isArray(body.docs) ? body.docs : []

  // Verify each path belongs to this user's folder (security)
  const validDocs = docs.filter((d) => typeof d.path === 'string' && d.path.startsWith(`${user.id}/`))

  if (validDocs.length === 0) {
    return NextResponse.json({ error: 'Please upload at least one document.' }, { status: 400 })
  }

  // Generate fresh signed view URLs (7 days) for the admin email
  const uploadedDocs: { type: string; name: string; path: string; signedUrl: string }[] = []
  for (const d of validDocs) {
    const { data: signed } = await supabaseAdmin.storage
      .from('verification-docs')
      .createSignedUrl(d.path, 60 * 60 * 24 * 7)
    uploadedDocs.push({ type: d.type, name: d.name, path: d.path, signedUrl: signed?.signedUrl ?? d.path })
  }

  // Save document records to DB so admin can view them later
  await supabaseAdmin.from('verification_documents').insert(
    uploadedDocs.map((doc) => ({
      user_id: user.id,
      doc_type: doc.type,
      file_name: doc.name,
      storage_path: doc.path,
    }))
  )

  // Get user profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.full_name ?? user.email ?? user.id

  // Update profile verification_status to pending
  await supabaseAdmin
    .from('profiles')
    .update({ verification_status: 'pending' })
    .eq('id', user.id)

  // Send email to admin
  const docLines = uploadedDocs
    .map((d) => `<li><strong>${d.type.replace(/_/g, ' ')}</strong>: <a href="${d.signedUrl}">${d.name}</a></li>`)
    .join('\n')

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: 'info@boathire24.com',
    subject: `[Verification] ${displayName} submitted documents`,
    html: `
      <h2>New host verification submission</h2>
      <p><strong>User:</strong> ${displayName} (${user.email})</p>
      <p><strong>User ID:</strong> ${user.id}</p>
      <p><strong>Owner type:</strong> ${ownerType}</p>
      <p><strong>Documents submitted:</strong></p>
      <ul>${docLines}</ul>
      <p>
        <a href="https://boathire24.com/admin" style="background:#74cfe8;color:#07101e;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:700;">
          Open Admin Panel →
        </a>
      </p>
      <p style="color:#888;font-size:12px;">Links expire in 7 days.</p>
    `,
  })

  return NextResponse.json({ ok: true, docs: uploadedDocs.length })
}
