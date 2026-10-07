// Real per-boat rating + review count, merged onto a list of boats.
// Read from the boats_with_stats view as a SEPARATE columnar query (not
// `from('boats_with_stats')` directly) so the pages keep their nested embeds
// (boat_images / boat_pricing / locations) — PostgREST embedding doesn't work on
// a view. List cards + list-page JSON-LD already consume avg_rating/review_count;
// they were just hardcoded to 0 everywhere except the boat detail page.
export async function attachRatings<T extends { id: string }>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  boats: T[],
): Promise<(T & { avg_rating: number; review_count: number })[]> {
  if (!boats || boats.length === 0) return boats as (T & { avg_rating: number; review_count: number })[]
  const ids = boats.map((b) => b.id)
  const { data } = await supabase.from('boats_with_stats').select('id, avg_rating, review_count').in('id', ids)
  const stats = new Map<string, { avg_rating: number | string; review_count: number }>(
    ((data ?? []) as { id: string; avg_rating: number | string; review_count: number }[]).map((r) => [r.id, r]),
  )
  return boats.map((b) => {
    const s = stats.get(b.id)
    return { ...b, avg_rating: Number(s?.avg_rating ?? 0), review_count: Number(s?.review_count ?? 0) }
  })
}
