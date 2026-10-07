// Single source of truth for the headline fleet numbers (active boats and
// destinations). Every surface that quotes a count — homepage hero + stats bar,
// footer CTA, homepage meta/OG description, OG images, sitemap video
// descriptions — reads from here so the site never contradicts itself
// (previously: hero said 62, footer said 48, meta said 20+, sitemap said 45+).

export interface SiteStats { boats: number; destinations: number }

// Last-verified live counts (2026-07-18) — used only if the live query fails.
export const FALLBACK_STATS: SiteStats = { boats: 412, destinations: 62 }

export async function getSiteStats(): Promise<SiteStats> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/boats?select=location_id&status=eq.active`,
      { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` }, next: { revalidate: 3600 } },
    )
    if (!res.ok) return FALLBACK_STATS
    const rows: { location_id: string | null }[] = await res.json()
    if (!rows.length) return FALLBACK_STATS
    const destinations = new Set(rows.map((r) => r.location_id).filter(Boolean)).size
    return { boats: rows.length, destinations }
  } catch {
    return FALLBACK_STATS
  }
}

// Shared description for the hero reel — used by both the homepage VideoObject
// schema and the sitemap <video:video> entry so the two never drift apart.
export function heroVideoDescription(destinations: number): string {
  return `Charter motor yachts, catamarans and speedboats with BoatHire24 across Marbella and ${destinations} destinations — licensed skippers included.`
}
