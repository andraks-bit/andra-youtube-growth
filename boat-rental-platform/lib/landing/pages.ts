import autoLandingRaw from './auto-landing.json'

export interface LandingPage {
  slug:            string   // single path segment, e.g. "yacht-charter-puerto-banus"
  title:           string
  metaDescription: string
  h1:              string
  keyword:         string
  intro:           string   // HTML
  bodyHtml:        string   // HTML body (h2/p/ul/table/details)
  heroImage?:      string
  faqs?:           Array<{ q: string; a: string }>
  date:            string   // ISO date
  canonicalSlug?:  string   // if set, this page canonicalizes to another (dedup)
}

// Auto-generated keyword landing pages (appended daily by scripts/generate_content.py).
export const LANDING_PAGES: LandingPage[] = autoLandingRaw as LandingPage[]

export function getLandingPage(slug: string): LandingPage | undefined {
  return LANDING_PAGES.find((p) => p.slug === slug)
}

export function getLandingSlugs(): string[] {
  return LANDING_PAGES.map((p) => p.slug)
}
