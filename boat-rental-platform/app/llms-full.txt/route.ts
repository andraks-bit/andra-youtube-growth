import { NextResponse } from 'next/server'
import { buildLlms } from '@/lib/seo/llms'

export const dynamic = 'force-dynamic'

// Full machine-readable index — concise index PLUS every landing page, for deep AI ingestion.
export async function GET(): Promise<NextResponse> {
  const body = await buildLlms({ full: true })
  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
