import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { attachRatings } from '@/lib/ratings'
import BoatCard from '@/components/search/BoatCard'
import FishingSearch from '@/components/search/FishingSearch'
import type { BoatWithDetails } from '@/types/database'

export const metadata: Metadata = {
  title: 'Fishing trips & charters — BoatHire24',
  description: 'Book guided fishing trips and sport-fishing charters worldwide. Licensed skippers, tackle included. Search by location and group size.',
  alternates: { canonical: 'https://boathire24.com/fishing-trips' },
}

interface PageProps {
  searchParams: Promise<{ location?: string; guests?: string }>
}

async function getFishingTrips(params: Awaited<PageProps['searchParams']>): Promise<BoatWithDetails[]> {
  const supabase = await createClient()
  let query = supabase
    .from('boats')
    .select(`*, boat_images(*), boat_pricing(*), boat_features(*), locations(*), profiles(id, full_name, avatar_url, verification_status)`)
    .eq('status', 'active')
    .eq('is_fishing_trip', true)

  if (params.guests) query = query.gte('capacity_pax', Number(params.guests))

  if (params.location) {
    const term = params.location.trim()
    const { data: locs } = await supabase.from('locations').select('id')
      .or(`city.ilike.%${term}%,country.ilike.%${term}%,name.ilike.%${term}%`)
    if (locs && locs.length) query = query.in('location_id', locs.map((l) => l.id))
    else return []
  }

  const { data, error } = await query.limit(500)
  if (error || !data) return []
  return await attachRatings(supabase, (data ?? []) as any[]) as BoatWithDetails[]
}

export default async function FishingTripsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const trips = await getFishingTrips(params)

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>
      {/* Hero + search */}
      <div style={{ background: 'linear-gradient(135deg,#0c1927 0%,#0e2040 50%,#0c1927 100%)', borderBottom: '1px solid rgba(116,207,232,0.18)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 20px 40px', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#74cfe8', background: 'rgba(116,207,232,0.10)', border: '1px solid rgba(116,207,232,0.22)', padding: '5px 14px', borderRadius: '99px', marginBottom: '16px' }}>🎣 Fishing trips</span>
          <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
            Guided <span style={{ color: '#74cfe8' }}>fishing trips</span> & charters
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(244,244,242,0.62)', lineHeight: 1.6, margin: '0 auto 26px', maxWidth: '560px' }}>
            Sport-fishing charters with licensed skippers and tackle included. Pick your destination and group size.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <FishingSearch defaultLocation={params.location ?? ''} defaultGuests={Number(params.guests ?? 2)} />
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 20px 90px' }}>
        <p style={{ fontSize: '14px', color: 'rgba(244,244,242,0.55)', marginBottom: '20px' }}>
          {trips.length} fishing {trips.length === 1 ? 'trip' : 'trips'}{params.location ? ` in ${params.location}` : ''}
        </p>
        {trips.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(116,207,232,0.18)', borderRadius: '16px', padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎣</div>
            <p style={{ fontWeight: 700, fontSize: '17px', margin: '0 0 6px' }}>No fishing trips found{params.location ? ` in ${params.location}` : ''}</p>
            <p style={{ color: 'rgba(244,244,242,0.55)', fontSize: '14px', margin: 0 }}>Try a different destination or fewer guests.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {trips.map((b) => <BoatCard key={b.id} boat={b} />)}
          </div>
        )}
      </div>
    </div>
  )
}
