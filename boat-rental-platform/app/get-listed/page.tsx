import type { Metadata } from 'next'
import GetListedClient from './GetListedClient'

export const metadata: Metadata = {
  title: 'Get your boats listed — BoatHire24',
  description: 'Charter operators & boat owners: list your fleet on BoatHire24 for free. Keep 100% of your price — we add our commission on top and bring you bookings from renters worldwide.',
  alternates: { canonical: 'https://boathire24.com/get-listed' },
  openGraph: {
    title: 'Get your boats listed — BoatHire24',
    description: 'List your fleet for free. Keep 100% of your price — we add our margin on top and bring you bookings.',
    url: 'https://boathire24.com/get-listed',
    type: 'website',
  },
}

export default async function GetListedPage({ searchParams }: { searchParams: Promise<{ src?: string; ref?: string }> }) {
  const sp = await searchParams
  return <GetListedClient source={sp.src || sp.ref} />
}
