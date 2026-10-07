import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TagChip from '@/components/media/TagChip'

export const revalidate = 3600

// ─── Tag groupings ─────────────────────────────────────────────────────────────

const LOCATION_TAGS = [
  'marbella', 'puerto-banus', 'costa-del-sol', 'malaga', 'estepona',
  'nerja', 'fuengirola', 'benalmadena', 'gibraltar', 'tarifa',
]

const TYPE_TAGS = [
  'motor-yacht', 'catamaran', 'sailing', 'speedboat', 'luxury-yacht',
  'rib', 'fishing', 'gulet', 'superyacht', 'inflatable',
]

const EXPERIENCE_TAGS = [
  'luxury', 'sunset-cruise', 'corporate', 'wedding', 'bachelor-party',
  'family-friendly', 'snorkeling', 'fishing-trip', 'island-hopping',
  'romantic', 'overnight', 'party-boat', 'whale-watching', 'watersports',
]

function getGroup(tag: string): 'location' | 'type' | 'experience' | 'other' {
  if (LOCATION_TAGS.includes(tag)) return 'location'
  if (TYPE_TAGS.includes(tag)) return 'type'
  if (EXPERIENCE_TAGS.includes(tag)) return 'experience'
  return 'other'
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TagStat {
  tag: string
  total_count: number
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Browse by Tag',
  robots: { index: false, follow: true },
  description:
    'Explore all boat rental categories: luxury yachts, catamarans, sunset cruises, family trips, and more. Find your perfect Marbella charter by tag.',
  openGraph: {
    title: 'Browse by Tag — BoatHire24',
    description: 'Discover boats and photos by category on BoatHire24.',
  },
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function getTagStats(): Promise<TagStat[]> {
  const supabase = await createClient()

  // Try the materialized view first
  const { data: viewData, error: viewError } = await supabase
    .from('tag_stats' as any)
    .select('tag, total_count')
    .order('total_count', { ascending: false })
    .limit(200)

  if (!viewError && viewData && (viewData as any[]).length > 0) {
    return viewData as TagStat[]
  }

  // Fallback: aggregate inline from boats + boat_images
  const [{ data: boatData }, { data: imageData }] = await Promise.all([
    supabase.from('boats').select('tags').eq('status', 'active'),
    supabase.from('boat_images').select('tags').not('tags', 'is', null),
  ])

  const counts: Record<string, number> = {}

  const addTags = (tagsField: string[] | null) => {
    if (!tagsField) return
    for (const tag of tagsField) {
      if (tag) counts[tag] = (counts[tag] ?? 0) + 1
    }
  }

  ;(boatData ?? []).forEach((row: any) => addTags(row.tags))
  ;(imageData ?? []).forEach((row: any) => addTags(row.tags))

  return Object.entries(counts)
    .map(([tag, total_count]) => ({ tag, total_count }))
    .sort((a, b) => b.total_count - a.total_count)
    .slice(0, 200)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TagsIndexPage() {
  const stats = await getTagStats()

  // Group tags
  const grouped: Record<string, TagStat[]> = {
    location: [],
    type: [],
    experience: [],
    other: [],
  }

  for (const stat of stats) {
    grouped[getGroup(stat.tag)].push(stat)
  }

  const sections: Array<{ key: string; label: string; color: string }> = [
    { key: 'location', label: 'Locations', color: '#4fa8d5' },
    { key: 'type', label: 'Boat types', color: '#74cfe8' },
    { key: 'experience', label: 'Experiences', color: '#7eb88a' },
    { key: 'other', label: 'More tags', color: 'rgba(244,244,242,0.55)' },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Boat Rental Tags',
    description: 'Browse all categories and tags for boat rentals in Marbella',
    numberOfItems: stats.length,
    itemListElement: stats.slice(0, 20).map((s, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Thing',
        name: s.tag,
        url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/tags/${encodeURIComponent(s.tag)}`,
      },
    })),
  }

  return (
    <div style={{ background: '#07101e', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <nav className="text-sm flex items-center gap-1.5 mb-4" style={{ color: 'rgba(244,244,242,0.45)' }}>
            <Link href="/" className="hover:text-[#74cfe8] transition-colors">Home</Link>
            <span>/</span>
            <span style={{ color: '#f4f4f2' }}>Browse by tag</span>
          </nav>
          <h1 className="text-4xl font-bold" style={{ color: '#f4f4f2' }}>Browse by tag</h1>
          <p className="mt-3 text-base" style={{ color: 'rgba(244,244,242,0.55)' }}>
            Explore {stats.length} categories across boats, yachts, and gallery photos.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map(({ key, label, color }) => {
            const items = grouped[key]
            if (items.length === 0) return null
            return (
              <section key={key}>
                <h2
                  className="text-sm font-bold uppercase tracking-widest mb-5"
                  style={{ color }}
                >
                  {label}
                </h2>
                <div className="flex flex-wrap gap-3">
                  {items.map((stat) => (
                    <TagChip key={stat.tag} tag={stat.tag} count={stat.total_count} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}
