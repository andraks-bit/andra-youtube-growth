import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BoatCard from '@/components/search/BoatCard'
import MediaCard from '@/components/media/MediaCard'
import type { BoatWithDetails } from '@/types/database'

export const revalidate = 3600

const PAGE_SIZE = 48

// ─── Types ────────────────────────────────────────────────────────────────────

interface BoatImageExtended {
  id: string
  boat_id: string
  storage_url: string
  alt: string | null
  sort_order: number
  is_hero: boolean
  slug: string | null
  title: string | null
  description: string | null
  tags: string[] | null
  media_type: string | null
  video_url: string | null
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>
}): Promise<Metadata> {
  const { tag } = await params
  const label = decodeURIComponent(tag)
  return {
    // No brand suffix — the layout title template already appends "| BoatHire24".
    title: `#${label} — Boats & Photos`,
    description: `Browse all boats and gallery photos tagged with "${label}" on BoatHire24. Find luxury yachts, catamarans, speedboats and more.`,
    keywords: [label, 'marbella', 'boat rental', 'yacht charter'],
    // Tag pages are empty shells until the boats.tags migration lands — keep
    // them crawlable but out of the index so they don't dilute the domain.
    robots: { index: false, follow: true },
    openGraph: {
      title: `#${label} — BoatHire24`,
      description: `All boats and photos tagged "${label}"`,
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { tag } = await params
  const { page: pageParam } = await searchParams
  const label = decodeURIComponent(tag)
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()

  // Fetch boats with this tag
  const { data: boatsRaw } = await supabase
    .from('boats')
    .select(`
      *,
      boat_images(*),
      boat_pricing(*),
      boat_features(*),
      locations(*),
      profiles(id, full_name, avatar_url, verification_status)
    `)
    .eq('status', 'active')
    .contains('tags', [label])
    .range(offset, offset + PAGE_SIZE - 1)

  // Fetch images with this tag
  const { data: imagesRaw } = await supabase
    .from('boat_images')
    .select('*')
    .contains('tags', [label])
    .not('slug', 'is', null)
    .not('title', 'is', null)
    .range(offset, offset + PAGE_SIZE - 1)

  const boats = (boatsRaw ?? []) as unknown as BoatWithDetails[]
  const images = (imagesRaw ?? []) as BoatImageExtended[]

  const totalResults = boats.length + images.length

  if (page === 1 && totalResults === 0) notFound()

  // Interleave boats and images in an alternating grid
  type GridItem =
    | { kind: 'boat'; data: BoatWithDetails }
    | { kind: 'image'; data: BoatImageExtended }

  const gridItems: GridItem[] = []
  const maxLen = Math.max(boats.length, images.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < boats.length) gridItems.push({ kind: 'boat', data: boats[i] })
    if (i < images.length) gridItems.push({ kind: 'image', data: images[i] })
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `#${label}`,
    description: `Boats and photos tagged "${label}"`,
    numberOfItems: totalResults,
    itemListElement: boats.slice(0, 10).map((b, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Product',
        name: b.name,
        url: `https://boathire24.com/boats/${b.slug}`,
      },
    })),
  }

  return (
    <div style={{ background: '#07101e', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero area */}
        <div className="mb-10">
          <nav className="text-sm flex items-center gap-1.5 mb-4" style={{ color: 'rgba(244,244,242,0.45)' }}>
            <Link href="/" className="hover:text-[#74cfe8] transition-colors">Home</Link>
            <span>/</span>
            <Link href="/tags" className="hover:text-[#74cfe8] transition-colors">Tags</Link>
            <span>/</span>
            <span style={{ color: '#f4f4f2' }}>#{label}</span>
          </nav>

          <h1 className="text-4xl font-bold" style={{ color: '#f4f4f2' }}>
            <span style={{ color: '#74cfe8' }}>#</span>
            {label}
          </h1>
          {totalResults > 0 && (
            <p className="mt-2 text-base" style={{ color: 'rgba(244,244,242,0.55)' }}>
              {totalResults} result{totalResults !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Grid */}
        {gridItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {gridItems.map((item) => {
              if (item.kind === 'boat') {
                return <BoatCard key={`boat-${item.data.id}`} boat={item.data} />
              }
              const img = item.data
              return (
                <MediaCard
                  key={`img-${img.id}`}
                  slug={img.slug!}
                  storageUrl={img.storage_url}
                  title={img.title!}
                  tags={img.tags ?? []}
                  boatName=""
                  boatSlug=""
                  alt={img.alt ?? undefined}
                />
              )
            })}
          </div>
        ) : (
          <p style={{ color: 'rgba(244,244,242,0.45)' }}>No results found for this tag.</p>
        )}

        {/* Pagination */}
        <div className="mt-12 flex items-center justify-between">
          {page > 1 ? (
            <Link
              href={`/tags/${tag}?page=${page - 1}`}
              className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:brightness-110"
              style={{ background: '#0c1828', border: '1px solid rgba(116,207,232,0.25)', color: '#74cfe8' }}
            >
              Previous
            </Link>
          ) : (
            <span />
          )}

          {totalResults === PAGE_SIZE && (
            <Link
              href={`/tags/${tag}?page=${page + 1}`}
              className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:brightness-110"
              style={{ background: '#74cfe8', color: '#07101e' }}
            >
              Load more
            </Link>
          )}
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
