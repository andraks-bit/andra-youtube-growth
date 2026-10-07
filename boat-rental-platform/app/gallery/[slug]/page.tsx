import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import RecommendationRail from '@/components/media/RecommendationRail'
import { MapPin, Users, Anchor, Check } from 'lucide-react'

export const revalidate = 3600

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

interface BoatExtended {
  id: string
  slug: string
  name: string
  type: string
  capacity_pax: number
  length_m: number | null
  includes_skipper: boolean
  includes_fuel: boolean
  includes_drinks: boolean
  tags: string[] | null
  locations: {
    city: string
    country: string
    slug: string
  }
  boat_features: { feature: string }[]
}

interface ImageWithBoat extends BoatImageExtended {
  boats: BoatExtended
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getImage(slug: string): Promise<ImageWithBoat | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('boat_images')
    .select(`
      *,
      boats (
        id, slug, name, type, capacity_pax, length_m,
        includes_skipper, includes_fuel, includes_drinks, tags,
        locations ( city, country, slug ),
        boat_features ( feature )
      )
    `)
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as unknown as ImageWithBoat
}

async function getRecommendations(
  currentImageId: string,
  boatType: string,
  boatTags: string[],
): Promise<ImageWithBoat[]> {
  const supabase = await createClient()

  // Fetch other images from boats of the same type, excluding current
  const { data } = await supabase
    .from('boat_images')
    .select(`
      *,
      boats!inner (
        id, slug, name, type, capacity_pax, length_m,
        includes_skipper, includes_fuel, includes_drinks, tags,
        locations ( city, country, slug ),
        boat_features ( feature )
      )
    `)
    .eq('boats.type', boatType)
    .eq('boats.status', 'active')
    .neq('id', currentImageId)
    .not('slug', 'is', null)
    .not('title', 'is', null)
    .limit(20)

  return (data ?? []) as unknown as ImageWithBoat[]
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const image = await getImage(slug)
  if (!image) return { title: 'Photo not found' }

  const title = image.title ?? image.boats.name
  const description =
    image.description ??
    `Luxury boat photo: ${title} in ${image.boats.locations.city}`

  return {
    // No brand suffix — the layout title template already appends "| BoatHire24".
    title: `${title} — Boat Gallery`,
    description,
    keywords: image.tags ?? [],
    alternates: { canonical: `https://boathire24.com/gallery/${slug}` },
    openGraph: {
      title,
      description,
      images: [{ url: image.storage_url, alt: image.alt ?? title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.storage_url],
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const image = await getImage(slug)
  if (!image) notFound()

  const boat = image.boats
  const tags = image.tags ?? []
  const boatTags = boat.tags ?? []

  const recommendations = await getRecommendations(image.id, boat.type, boatTags)

  const recItems = recommendations.map((r) => ({
    type: 'image' as const,
    slug: r.slug!,
    name: r.title ?? r.boats.name,
    imageUrl: r.storage_url,
    tags: r.tags ?? [],
    location: r.boats.locations.city,
  }))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: image.title ?? boat.name,
    description: image.description ?? '',
    contentUrl: image.storage_url,
    thumbnailUrl: image.storage_url,
    keywords: tags.join(', '),
    author: {
      '@type': 'Organization',
      name: 'BoatHire24',
    },
    about: {
      '@type': 'Product',
      name: boat.name,
      url: `https://boathire24.com/boats/${boat.slug}`,
    },
  }

  return (
    <div style={{ background: '#07101e', minHeight: '100vh' }}>
      {/* Full-width hero image */}
      <div className="relative w-full" style={{ maxHeight: '70vh', height: '70vh', background: '#0a1420' }}>
        <Image
          src={image.storage_url}
          alt={image.alt ?? image.title ?? boat.name}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        {/* Bottom fade */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, #07101e 0%, rgba(7,16,30,0.50) 40%, transparent 70%)',
          }}
        />
        {/* Breadcrumb overlay */}
        <nav
          className="absolute top-4 left-4 text-sm flex items-center gap-1.5"
          style={{ color: 'rgba(244,244,242,0.70)' }}
        >
          <Link href="/" className="hover:text-[#74cfe8] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/gallery" className="hover:text-[#74cfe8] transition-colors">Gallery</Link>
          <span>/</span>
          <span style={{ color: '#f4f4f2' }}>{image.title ?? boat.name}</span>
        </nav>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: metadata */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#f4f4f2' }}>
                {image.title ?? boat.name}
              </h1>
              {image.description && (
                <p
                  className="mt-4 text-base leading-relaxed"
                  style={{ color: 'rgba(244,244,242,0.70)' }}
                >
                  {image.description}
                </p>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className="text-sm font-semibold px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105"
                    style={{
                      background: 'rgba(116,207,232,0.12)',
                      border: '1px solid rgba(116,207,232,0.30)',
                      color: '#74cfe8',
                    }}
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right: boat info card */}
          <div>
            <div
              className="rounded-2xl p-6 space-y-4"
              style={{
                background: '#0c1828',
                border: '1px solid rgba(116,207,232,0.18)',
              }}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(244,244,242,0.45)' }}>
                Featured Boat
              </h2>
              <Link
                href={`/boats/${boat.slug}`}
                className="block text-lg font-bold hover:text-[#74cfe8] transition-colors"
                style={{ color: '#f4f4f2' }}
              >
                {boat.name}
              </Link>

              <div className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(244,244,242,0.55)' }}>
                <MapPin className="w-4 h-4 shrink-0" style={{ color: '#74cfe8' }} />
                {boat.locations.city}, {boat.locations.country}
              </div>

              <div className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(244,244,242,0.55)' }}>
                <Users className="w-4 h-4 shrink-0" style={{ color: '#74cfe8' }} />
                Up to {boat.capacity_pax} guests
              </div>

              {boat.length_m && (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(244,244,242,0.55)' }}>
                  <Anchor className="w-4 h-4 shrink-0" style={{ color: '#74cfe8' }} />
                  {boat.length_m}m
                </div>
              )}

              {/* Inclusions */}
              <div
                className="pt-4 space-y-2"
                style={{ borderTop: '1px solid rgba(116,207,232,0.12)' }}
              >
                {boat.includes_skipper && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(244,244,242,0.70)' }}>
                    <Check className="w-4 h-4 shrink-0" style={{ color: '#74cfe8' }} /> Skipper included
                  </div>
                )}
                {boat.includes_fuel && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(244,244,242,0.70)' }}>
                    <Check className="w-4 h-4 shrink-0" style={{ color: '#74cfe8' }} /> Fuel included
                  </div>
                )}
                {boat.includes_drinks && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(244,244,242,0.70)' }}>
                    <Check className="w-4 h-4 shrink-0" style={{ color: '#74cfe8' }} /> Drinks & snacks
                  </div>
                )}
                {boat.boat_features.slice(0, 4).map((f) => (
                  <div key={f.feature} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(244,244,242,0.70)' }}>
                    <Check className="w-4 h-4 shrink-0" style={{ color: '#74cfe8' }} /> {f.feature}
                  </div>
                ))}
              </div>

              <Link
                href={`/boats/${boat.slug}`}
                className="block w-full text-center py-3 rounded-xl font-semibold text-sm mt-2 transition-all duration-200 hover:brightness-110"
                style={{ background: '#74cfe8', color: '#07101e' }}
              >
                View boat & prices
              </Link>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {recItems.length > 0 && (
          <RecommendationRail items={recItems} title="More photos you may like" />
        )}
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}
