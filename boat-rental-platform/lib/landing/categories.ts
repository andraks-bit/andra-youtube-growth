// Boat-type "category" landing pages: /{city}/{category} e.g. /marbella/catamaran-rental.
// These capture the highest-intent long-tail queries ("catamaran rental marbella")
// that a generic /search?type= filter can never rank for.

export interface BoatCategory {
  slug: string          // URL segment, e.g. "catamaran-rental"
  label: string         // "Catamaran rental"
  noun: string          // "catamaran" — for prose
  types: string[]       // boats.type values this category covers
  fishing?: boolean     // list fishing trips (is_fishing_trip) instead of regular fleet
}

export const CATEGORIES: BoatCategory[] = [
  { slug: 'yacht-charter',       label: 'Yacht charter',        noun: 'yacht',        types: ['motor_yacht', 'luxury'] },
  { slug: 'motor-yacht-rental',  label: 'Motor yacht rental',   noun: 'motor yacht',  types: ['motor_yacht'] },
  { slug: 'catamaran-rental',    label: 'Catamaran rental',     noun: 'catamaran',    types: ['catamaran'] },
  { slug: 'sailing-boat-rental', label: 'Sailing boat rental',  noun: 'sailing boat', types: ['sailing'] },
  { slug: 'speedboat-rental',    label: 'Speedboat rental',     noun: 'speedboat',    types: ['speedboat'] },
  { slug: 'rib-rental',          label: 'RIB rental',           noun: 'RIB',          types: ['rib'] },
  { slug: 'jet-ski-rental',      label: 'Jet ski rental',       noun: 'jet ski',      types: ['jet_ski'] },
  { slug: 'gulet-charter',       label: 'Gulet charter',        noun: 'gulet',        types: ['gulet'] },
  { slug: 'fishing-charter',     label: 'Fishing charter',      noun: 'fishing trip', types: ['fishing'], fishing: true },
]

export function getCategory(slug: string): BoatCategory | undefined {
  return CATEGORIES.find((c) => c.slug === slug)
}

export function categorySlugs(): string[] {
  return CATEGORIES.map((c) => c.slug)
}
