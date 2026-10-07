/**
 * Canonical author registry.
 *
 * Every byline on the site must resolve to a REAL, verifiable person here.
 * Google News' misrepresentation policy treats invented author personas as a
 * removal-grade violation, so this file is the only place bylines may come
 * from — blog, news and the generator all read it.
 *
 * `sameAs` links are what let Google tie the byline to a real identity, so an
 * author with no public profile should not be added.
 */

export interface Author {
  slug:      string
  name:      string
  role:      string
  /** Short bio shown on the author page and in Person schema. */
  bio:       string
  /** Public profiles used as schema.org `sameAs` — the identity proof. */
  sameAs:    string[]
  image:     string
  email?:    string
}

export const AUTHORS: Author[] = [
  {
    slug: 'mardo-soo',
    name: 'Mardo Soo',
    role: 'Founder & CEO, BoatHire24',
    bio:
      'Mardo Soo founded BoatHire24 in 2020 after years building businesses at the ' +
      'intersection of technology and lifestyle. He works directly with marina operators ' +
      'and charter owners across the Costa del Sol, Turkey, Greece and Thailand, and covers ' +
      'charter pricing, marketplace supply and the commercial side of boat hire.',
    sameAs: ['https://www.linkedin.com/in/mardosoo'],
    image: 'https://drive.google.com/thumbnail?id=1gweyldTTQKZu4x_dqDQVes1D-BXAr_Hp&sz=w600',
    email: 'info@boathire24.com',
  },
  {
    slug: 'andra-kiirkivi',
    name: 'Andra Kiirkivi',
    role: 'Co-Founder, BoatHire24',
    bio:
      'Andra Kiirkivi co-founded BoatHire24 in 2020. She grew up on the Estonian coast and ' +
      'spent years in the Mediterranean charter scene before turning that experience into a ' +
      'marketplace. She covers destinations, on-board experience and guest-facing standards ' +
      'across the BoatHire24 fleet.',
    sameAs: [
      'https://www.linkedin.com/in/andrakiirkivi',
      'https://www.instagram.com/andrakiirkivi',
    ],
    image: 'https://drive.google.com/thumbnail?id=1PyxDXw278AH_l6KECsD0FF8NWZB2yUuR&sz=w600',
  },
]

export const AUTHORS_BY_NAME: Record<string, Author> = Object.fromEntries(
  AUTHORS.map((a) => [a.name, a]),
)

export function getAuthor(slugOrName: string): Author | undefined {
  return (
    AUTHORS.find((a) => a.slug === slugOrName) ??
    AUTHORS_BY_NAME[slugOrName]
  )
}

/** Person node referenced by Article/NewsArticle `author` so the byline is verifiable. */
export function authorJsonLd(author: Author) {
  return {
    '@type': 'Person',
    '@id': `https://boathire24.com/authors/${author.slug}#person`,
    name: author.name,
    url: `https://boathire24.com/authors/${author.slug}`,
    jobTitle: author.role,
    image: author.image,
    sameAs: author.sameAs,
    worksFor: { '@id': 'https://boathire24.com/#organization' },
  }
}

/**
 * Disclosure shown under every AI-assisted byline. Google permits AI-assisted
 * content; it does not permit passing it off as unaided human reporting, so the
 * disclosure is what keeps a real byline honest.
 */
export const AI_DISCLOSURE =
  'Researched and drafted with AI assistance, then reviewed and published by the BoatHire24 team.'
