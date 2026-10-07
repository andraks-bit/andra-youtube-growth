import type { Metadata } from 'next'
import ListYourBoatClient from './ListYourBoatClient'

type SearchParams = { city?: string; op?: string; ref?: string; lang?: string }

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const sp = await searchParams
  const city = sp.city?.toString().trim()
  const title = city
    ? `List your ${city} boat on BoatHire24 — earn from worldwide bookings`
    : 'List your boat on BoatHire24 — earn from worldwide bookings'
  const description = city
    ? `Reach thousands of verified renters looking for boats in ${city}. Free listing, 85% to you, payments via Stripe. Set up in 10 minutes.`
    : 'Reach thousands of verified renters worldwide. Free listing, 85% to you, payments via Stripe. Set up in 10 minutes.'
  return { title, description }
}

export default async function ListYourBoatPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  return (
    <ListYourBoatClient
      city={sp.city?.toString() || ''}
      operatorDomain={sp.op?.toString() || ''}
      isOutreach={(sp.ref?.toString() || '') === 'outreach'}
      lang={(sp.lang?.toString() || 'en') as 'en' | 'es' | 'fr' | 'it' | 'pt'}
    />
  )
}
