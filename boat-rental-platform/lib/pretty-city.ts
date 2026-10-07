// Display-only cleanup for location.city values. 37 of 62 locations still carry a
// raw geocoded address as their `city` (e.g. "Mallorca, Avinguda s'Almudaina, 8,
// 07157 Port d'Andratx, Illes B") pending the one-time prod data normalizer (an
// owner task). Taking the first address segment yields the real city for those and
// leaves already-clean names untouched. Slugs are never derived from this — links
// always use the real locations.slug so they keep resolving.
export function prettyCity(city: string | null | undefined): string {
  if (!city) return ''
  const first = city.split(',')[0].trim()
  return first || city.trim()
}
