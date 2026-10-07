import autoEsRaw from './auto-landing-es.json'
import type { LandingPage } from './pages'

// Spanish (es) translations of the keyword landing pages, same slugs as the EN
// versions. Populated by scripts/translate_es.py.
export const LANDING_PAGES_ES: LandingPage[] = autoEsRaw as LandingPage[]

export function getLandingPageEs(slug: string): LandingPage | undefined {
  return LANDING_PAGES_ES.find((p) => p.slug === slug)
}

export function getLandingSlugsEs(): string[] {
  return LANDING_PAGES_ES.map((p) => p.slug)
}

export function hasEs(slug: string): boolean {
  return LANDING_PAGES_ES.some((p) => p.slug === slug)
}
