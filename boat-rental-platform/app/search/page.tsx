import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { attachRatings } from '@/lib/ratings'
import BoatCard from '@/components/search/BoatCard'
import Filters from '@/components/search/Filters'
import SearchBar from '@/components/search/SearchBar'
import type { BoatWithDetails } from '@/types/database'
import { MapPin, Ship } from 'lucide-react'

interface SearchPageProps {
  searchParams: Promise<{
    location?: string
    date?: string
    guests?: string
    type?: string
    capacity?: string
    instant?: string
    sort?: string
    page?: string
  }>
}

const BASE = 'https://boathire24.com'

// Cards rendered per page — the full fleet on one page shipped a 5+ MB HTML
// document. Deeper pages stay reachable through crawlable ?page=N links.
const PAGE_SIZE = 48

// Filtered /search views are near-duplicates of the dedicated landing pages, so
// they're noindex,follow — crawled for links, kept out of the index. No canonical
// on filtered views: noindex + a cross-page canonical are contradictory signals
// (a canonical says "index that instead", noindex says "index nothing").
export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const p = await searchParams
  const filtered = !!(p.location || p.type || p.guests || p.capacity || p.instant || p.date || p.sort)
  const page = Math.max(1, parseInt(p.page ?? '1', 10) || 1)
  if (!filtered) {
    if (page > 1) {
      // Deep pages keep every card crawlable (follow) but stay out of the index.
      return { title: `Explore boats & yachts worldwide — page ${page}`, robots: { index: false, follow: true } }
    }
    // No brand suffix here — the layout title template already appends "| BoatHire24".
    return { title: 'Explore boats & yachts worldwide', alternates: { canonical: `${BASE}/search` } }
  }
  return { robots: { index: false, follow: true } }
}

async function getBoats(params: Awaited<SearchPageProps['searchParams']>): Promise<BoatWithDetails[]> {
  const supabase = await createClient()

  let query = supabase
    .from('boats')
    .select(`
      *,
      boat_images(*),
      boat_pricing(*),
      boat_features(*),
      locations(*),
      profiles(id, full_name, avatar_url, verification_status)
    `)
    .eq('status', 'active')  // fishing trips show here too — /fishing-trips is an additional dedicated view

  if (params.type && params.type !== 'all') {
    query = query.eq('type', params.type as any)
  }
  if (params.instant === '1') {
    query = query.eq('instant_book', true)
  }
  if (params.capacity && params.capacity !== 'any') {
    const min = Number(params.capacity)
    query = query.gte('capacity_pax', min)
    if (min === 1) query = query.lte('capacity_pax', 4)
    else if (min === 5) query = query.lte('capacity_pax', 8)
    else if (min === 9) query = query.lte('capacity_pax', 12)
  }
  if (params.guests) {
    query = query.gte('capacity_pax', Number(params.guests))
  }
  if (params.location) {
    const term = params.location.trim()
    // Match against city, country, OR the location's display name
    const { data: locations } = await supabase
      .from('locations')
      .select('id')
      .or(`city.ilike.%${term}%,country.ilike.%${term}%,name.ilike.%${term}%`)
    if (locations && locations.length > 0) {
      query = query.in('location_id', locations.map((l) => l.id))
    } else {
      // Location was searched but matched nothing — return no boats
      // (previously this fell through and showed ALL boats).
      return []
    }
  }

  // No hard 48 cap — show every active boat by default (was silently hiding
  // ~half the fleet once we passed 48 listings). Generous ceiling for safety.
  const { data, error } = await query.limit(500)
  if (error || !data) return []
  const boats = await attachRatings(supabase, (data ?? []) as any[]) as BoatWithDetails[]

  // Sort — the pills in Filters were previously a no-op.
  const minPrice = (b: BoatWithDetails) => {
    const prices = ((b as any).boat_pricing ?? []).map((p: any) => p.price as number).filter((p: number) => p > 0)
    return prices.length ? Math.min(...prices) : Number.MAX_SAFE_INTEGER // price-on-request sinks to the end
  }
  switch (params.sort) {
    case 'price_asc': boats.sort((a, b) => minPrice(a) - minPrice(b)); break
    case 'price_desc': boats.sort((a, b) => {
      const pa = minPrice(a), pb = minPrice(b)
      return (pb === Number.MAX_SAFE_INTEGER ? -1 : pb) - (pa === Number.MAX_SAFE_INTEGER ? -1 : pa)
    }); break
    case 'rating': // no review data yet — deterministic proxy: biggest/most premium first
      boats.sort((a, b) => ((b as any).length_m ?? 0) - ((a as any).length_m ?? 0)); break
    default: // recommended: newest listings first, photo-complete boats above photo-less
      boats.sort((a, b) => {
        const photos = (x: BoatWithDetails) => Math.min(((x as any).boat_images ?? []).length, 1)
        return photos(b) - photos(a) || String((b as any).created_at).localeCompare(String((a as any).created_at))
      })
  }
  return boats
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const boats = await getBoats(params)

  const hasFilters = params.location || params.type || params.capacity || params.instant || params.date

  // Server-render one page of cards; the rest sit behind crawlable ?page=N links.
  const totalPages = Math.max(1, Math.ceil(boats.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, parseInt(params.page ?? '1', 10) || 1), totalPages)
  const paged = boats.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Pagination links preserve the active filters.
  const pageHref = (n: number) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v && k !== 'page') sp.set(k, v)
    if (n > 1) sp.set('page', String(n))
    const s = sp.toString()
    return s ? `/search?${s}` : '/search'
  }

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px 80px' }}>

        {/* ── H1 ── */}
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#f4f4f2', marginBottom: '18px' }}>
          Explore boats &amp; yachts worldwide
        </h1>

        {/* ── Search bar ── */}
        <div style={{ marginBottom: '16px' }}>
          <SearchBar
            defaultLocation={params.location ?? ''}
            defaultDate={params.date ?? ''}
            defaultGuests={Number(params.guests ?? 2)}
            compact
          />
        </div>

        {/* ── Filters ── */}
        <div style={{ marginBottom: '20px' }}>
          <Suspense>
            <Filters />
          </Suspense>
        </div>

        {/* ── Result meta ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {params.location && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'rgba(244,244,242,0.50)', background: 'rgba(116,207,232,0.08)', border: '1px solid rgba(116,207,232,0.18)', borderRadius: '99px', padding: '4px 12px' }}>
              <MapPin style={{ width: '12px', height: '12px' }} />
              {params.location}
            </span>
          )}
          {params.date && (
            <span style={{ fontSize: '13px', color: 'rgba(244,244,242,0.40)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '99px', padding: '4px 12px' }}>
              {new Date(params.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#74cfe8', marginLeft: 'auto' }}>
            {boats.length} boat{boats.length !== 1 ? 's' : ''} available
          </span>
        </div>

        {/* ── Results ── */}
        {boats.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '96px', paddingBottom: '96px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(116,207,232,0.10)', border: '1px solid rgba(116,207,232,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Ship style={{ width: '32px', height: '32px', color: '#74cfe8' }} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f4f4f2', marginBottom: '12px' }}>No boats found</h2>
            <p style={{ fontSize: '15px', color: 'rgba(244,244,242,0.45)', maxWidth: '360px', margin: '0 auto 32px', lineHeight: 1.65 }}>
              Try adjusting your filters or searching a different location.
            </p>
            {hasFilters && (
              <a href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '99px', background: 'rgba(116,207,232,0.12)', border: '1px solid rgba(116,207,232,0.25)', color: '#74cfe8', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
                Clear all filters
              </a>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {paged.map((boat) => (
              <BoatCard key={boat.id} boat={boat} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ marginTop: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {page > 1 && (
              <a href={pageHref(page - 1)} style={{ padding: '12px 26px', borderRadius: '99px', fontWeight: 600, fontSize: '14px', background: '#0c1828', border: '1px solid rgba(116,207,232,0.25)', color: '#74cfe8', textDecoration: 'none' }}>
                ← Previous
              </a>
            )}
            <span style={{ fontSize: '13px', color: 'rgba(244,244,242,0.45)' }}>
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <a href={pageHref(page + 1)} style={{ padding: '12px 26px', borderRadius: '99px', fontWeight: 700, fontSize: '14px', background: '#74cfe8', color: '#07101e', textDecoration: 'none' }}>
                Next →
              </a>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
