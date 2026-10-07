// Canonical slug helpers for boat listings.
//
// Old scheme: `slugify(name)-<base36 timestamp>` → e.g. `ruby-mqw3g8il`.
// The random suffix carried zero keyword value and looked like tracking cruft
// to search engines and LLM retrievers. New scheme is human-readable and
// keyword-rich: `<city>-<builder>-<name>` with duplicate words removed.
//   "Ruby" · Sunseeker · Puerto Banús  → puerto-banus-sunseeker-ruby
//   "51 Foot Catamaran" · — · Marbella → marbella-51-foot-catamaran

export function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Build the base (pre-collision) slug from a boat's stable, query-relevant
// fields. Words already present earlier in the slug are dropped so a builder
// that also appears in the name isn't repeated.
export function buildBoatSlug(input: {
  city?: string | null
  builder?: string | null
  name?: string | null
}): string {
  const seen = new Set<string>()
  const parts: string[] = []
  for (const raw of [input.city, input.builder, input.name]) {
    if (!raw) continue
    const words = slugify(raw).split('-').filter((w) => w && !seen.has(w))
    if (words.length === 0) continue
    words.forEach((w) => seen.add(w))
    parts.push(words.join('-'))
  }
  let slug = parts.join('-')
  // Keep it lean (~60 chars) — trim at a hyphen boundary, never mid-word.
  if (slug.length > 60) slug = slug.slice(0, 60).replace(/-[^-]*$/, '')
  return slug || 'boat'
}

// Resolve a unique slug given a base and a predicate that reports whether a
// candidate is already taken (by a *different* boat). Appends -2, -3, …
export async function uniqueBoatSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base
  let n = 1
  while (await isTaken(candidate)) {
    n += 1
    candidate = `${base}-${n}`
  }
  return candidate
}
