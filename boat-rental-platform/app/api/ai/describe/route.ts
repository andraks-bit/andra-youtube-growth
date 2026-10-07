import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiAvailable, aiJson } from '@/lib/ai/deepseek'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM = `You write boat-rental listing copy for BoatHire24, a worldwide charter marketplace.
Style: warm, conversational, second person ("you"), British English. No em-dashes, no exclamation
marks, no clichés like "look no further" or "nestled". Plain honest copy a real owner would write.
NEVER invent facts that were not provided (no made-up speeds, engines, awards, crew counts or prices).
If a detail is missing, simply do not mention it.
Return JSON: {"tagline": string, "description": string}.
tagline: one catchy line, max 90 characters, no full stop.
description: 130-220 words, 2-3 short paragraphs separated by a blank line. Cover the experience on
board, who the boat suits (groups, families, couples), and what is included if provided.`

// Generates a tagline + description from boat facts. Used by the listing wizard
// ("Generate with AI") and by the website importer to fill thin descriptions.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!aiAvailable()) return NextResponse.json({ error: 'AI is not configured on this server' }, { status: 503 })

  const b = await req.json().catch(() => ({}))
  const name = String(b?.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Give the boat a name first' }, { status: 400 })

  const facts: string[] = [`Name: ${name}`]
  const add = (label: string, v: unknown) => {
    const s = String(v ?? '').trim()
    if (s && s !== '0' && s !== 'null' && s !== 'undefined') facts.push(`${label}: ${s}`)
  }
  add('Type', b.type ? String(b.type).replace(/_/g, ' ') : '')
  add('Length (m)', b.lengthM)
  add('Max guests', b.capacityPax)
  add('Cabins', b.cabins)
  add('Builder', b.builder)
  add('Year', b.modelYear)
  add('Departure port / marina', b.departurePort)
  add('Location', b.locationName)
  if (b.includesSkipper) facts.push('Skipper included')
  if (b.includesFuel) facts.push('Fuel included')
  if (b.includesDrinks) facts.push('Drinks included')
  if (Array.isArray(b.features) && b.features.length) facts.push(`Features: ${b.features.slice(0, 20).join(', ')}`)
  if (typeof b.existingDescription === 'string' && b.existingDescription.trim()) {
    facts.push(`Existing notes from the owner (rewrite, keep all facts): ${b.existingDescription.trim().slice(0, 2000)}`)
  }

  try {
    const out = await aiJson<{ tagline?: string; description?: string }>(SYSTEM, facts.join('\n'), { maxTokens: 900 })
    const tagline = String(out.tagline ?? '').trim().slice(0, 200)
    const description = String(out.description ?? '').trim()
    if (!description) throw new Error('empty description')
    return NextResponse.json({ tagline, description })
  } catch (e) {
    console.error('ai/describe error:', e)
    return NextResponse.json({ error: 'Could not generate a description right now. Try again.' }, { status: 502 })
  }
}
