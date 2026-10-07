import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLandingPageEs, getLandingSlugsEs, hasEs } from '@/lib/landing/pages-es'
import { getLandingPage } from '@/lib/landing/pages'
import LandingView from '@/components/landing/LandingView'

interface Props {
  params: Promise<{ location: string }>
}

export async function generateStaticParams() {
  return getLandingSlugsEs().map((location) => ({ location }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location } = await params
  const lp = getLandingPageEs(location)
  if (!lp) return { title: 'Página no encontrada' }
  // Mirror the EN twin's canonical cluster: the ES translation of a
  // non-canonical EN variant must consolidate onto the ES canonical too,
  // and hreflang only belongs on canonical pages — alternates pointing at
  // a page whose canonical is elsewhere send Google contradictory signals.
  const canonicalEnSlug = getLandingPage(lp.slug)?.canonicalSlug || lp.slug
  const isCanonical = canonicalEnSlug === lp.slug
  return {
    title: lp.title,
    description: lp.metaDescription,
    alternates: {
      canonical: isCanonical
        ? `https://boathire24.com/es/${lp.slug}`
        : hasEs(canonicalEnSlug)
          ? `https://boathire24.com/es/${canonicalEnSlug}`
          : `https://boathire24.com/${canonicalEnSlug}`,
      ...(isCanonical ? {
        languages: {
          'en': `https://boathire24.com/${lp.slug}`,
          'es-ES': `https://boathire24.com/es/${lp.slug}`,
          'x-default': `https://boathire24.com/${lp.slug}`,
        },
      } : {}),
    },
    openGraph: {
      title: lp.title,
      description: lp.metaDescription,
      type: 'article',
      locale: 'es_ES',
      siteName: 'BoatHire24',
      ...(lp.heroImage ? { images: [{ url: lp.heroImage }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: lp.title,
      description: lp.metaDescription,
      ...(lp.heroImage ? { images: [lp.heroImage] } : {}),
    },
  }
}

export default async function EsLandingPage({ params }: Props) {
  const { location } = await params
  const lp = getLandingPageEs(location)
  if (!lp) notFound()
  return <LandingView page={lp} lang="es" />
}
