/**
 * BoatHire24 newsroom store.
 *
 * This is deliberately NOT the same content type as `lib/blog`. The blog holds
 * evergreen commercial guides; Google News indexes timely reporting, and mixing
 * the two is what gets a publication rejected.
 *
 * Rules for anything added here:
 *   1. It must be time-bound — something that happened, changed or was announced
 *      on a specific date. "Best time to charter in Marbella" is a guide, not news.
 *   2. `sources` must be non-empty and every URL must be real and reachable.
 *      Unsourced claims do not go in the newsroom.
 *   3. `author` must match a name in `lib/authors.ts`.
 */

export interface NewsSource {
  title:     string
  url:       string
  publisher?: string
}

export interface NewsArticle {
  slug:            string
  title:           string
  /** One-sentence dek shown under the headline and used as the schema description. */
  standfirst:      string
  /** Newsroom section, e.g. 'Marinas & ports', 'Regulation', 'Charter market'. */
  section:         string
  /** ISO 8601 with offset — Google News requires a precise publication time. */
  datePublished:   string
  dateModified:    string
  author:          string
  heroImage:       string
  /** HTML body. */
  content:         string
  /** Where the facts came from. Required — see rule 2 above. */
  sources:         NewsSource[]
  /** Free-text place the story concerns, e.g. 'Marbella, Spain'. */
  location?:       string
  metaDescription?: string
}

/** Hand-written newsroom items. */
export const NEWS: NewsArticle[] = []

/** Items produced by scripts/generate_news.py. */
import AUTO_NEWS from './auto-news.json'

export const ALL_NEWS: NewsArticle[] = [...NEWS, ...(AUTO_NEWS as NewsArticle[])].sort(
  (a, b) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime(),
)

export function getNewsArticle(slug: string): NewsArticle | undefined {
  return ALL_NEWS.find((n) => n.slug === slug)
}

export function getNewsSlugs(): string[] {
  return ALL_NEWS.map((n) => n.slug)
}

/**
 * Articles eligible for the Google News sitemap. Google only reads the last two
 * days from a news sitemap and caps it at 1000 URLs, so anything older is noise.
 */
export function recentNews(hours = 48, limit = 1000): NewsArticle[] {
  const cutoff = Date.now() - hours * 3600 * 1000
  return ALL_NEWS.filter((n) => {
    const t = Date.parse(n.datePublished)
    return !isNaN(t) && t >= cutoff
  }).slice(0, limit)
}
