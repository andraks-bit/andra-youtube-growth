import { NextResponse } from 'next/server'
import { buildLlms } from '@/lib/seo/llms'

export const dynamic = 'force-dynamic'

// Concise machine-readable index for LLMs / AI search (the heavy full landing-page list
// lives at /llms-full.txt).
export async function GET(): Promise<NextResponse> {
  const body = await buildLlms({ full: false })
  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
