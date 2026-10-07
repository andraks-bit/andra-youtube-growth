import type { Metadata } from 'next'
import AffiliateClient from './AffiliateClient'

export const metadata: Metadata = {
  title: 'Affiliate program — earn 5% commission | BoatHire24',
  description: 'Send us boat rental bookings and earn a 5% commission on every completed trip. Free to join — apply in under a minute.',
  alternates: { canonical: 'https://boathire24.com/affiliate' },
  openGraph: {
    title: 'Affiliate program — earn 5% commission | BoatHire24',
    description: 'Send us boat rental bookings and earn a 5% commission on every completed trip.',
    url: 'https://boathire24.com/affiliate',
    type: 'website',
  },
}

export default async function AffiliatePage({ searchParams }: { searchParams: Promise<{ src?: string; ref?: string }> }) {
  const sp = await searchParams
  return <AffiliateClient source={sp.src || sp.ref} />
}
