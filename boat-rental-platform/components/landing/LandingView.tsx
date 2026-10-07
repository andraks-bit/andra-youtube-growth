import Link from 'next/link'
import Image from 'next/image'
import { MapPin } from 'lucide-react'
import TrustBar from '@/components/ui/TrustBar'
import BoatCard from '@/components/search/BoatCard'
import { createClient } from '@/lib/supabase/server'
import { attachRatings } from '@/lib/ratings'
import { prettyCity } from '@/lib/pretty-city'
import type { LandingPage } from '@/lib/landing/pages'
import { hasEs } from '@/lib/landing/pages-es'
import type { BoatWithDetails } from '@/types/database'

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.12)'
const goldBorder = 'rgba(116,207,232,0.22)'

const deaccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

// Resolve a landing page's target city to a real inventory location so the page
// shows bookable boats + a city-filtered CTA instead of dumping high-intent
// visitors into an unfiltered /search. Conservative: only matches a location that
// HAS active boats and whose city name (or slug) appears as a whole token in the
// page's slug/keyword — a miss shows no boats rather than the wrong city's boats.
interface ResolvedInventory { loc: { id: string; slug: string; city: string; country: string }; boats: BoatWithDetails[] }
async function resolveInventory(page: LandingPage): Promise<ResolvedInventory | null> {
  try {
    const supabase = await createClient()
    const { data: locs } = await supabase.from('locations').select('id, slug, city, country')
    const locations = (locs ?? []) as { id: string; slug: string; city: string; country: string }[]
    if (!locations.length) return null

    // Match against the structured slug + keyword only (never the h1 prose) — prose
    // like "…for a nice sunset" would false-match common-word cities (Nice, Side…).
    const hay = ' ' + deaccent(`${page.slug} ${page.keyword ?? ''}`.toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim() + ' '
    // Collect every location whose city/slug appears as a whole token, scored by
    // token length (most specific wins).
    const matches: { loc: typeof locations[number]; score: number }[] = []
    for (const loc of locations) {
      let score = 0
      for (const cand of [prettyCity(loc.city), loc.slug.replace(/-mr[a-z0-9]+$/i, '')]) {
        const token = deaccent(cand.toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim()
        if (token.length < 4) continue
        if (hay.includes(' ' + token + ' ')) score = Math.max(score, token.length)
      }
      if (score) matches.push({ loc, score })
    }
    if (!matches.length) return null
    matches.sort((a, b) => b.score - a.score)

    // Prefer the best-scoring match that actually has active inventory — stops a
    // same-named 0-boat location (e.g. an empty "Corfu" shell) from shadowing the
    // live one. Try the top few by score.
    for (const { loc } of matches.slice(0, 4)) {
      const { data: rawBoats } = await supabase
        .from('boats')
        .select(`*, boat_images(*), boat_pricing(*), boat_features(*), locations(*), profiles(id, full_name, avatar_url, verification_status)`)
        .eq('location_id', loc.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6)
      if (rawBoats && rawBoats.length) {
        const boats = await attachRatings(supabase, rawBoats as any[]) as BoatWithDetails[]
        return { loc, boats }
      }
    }
    return null
  } catch {
    return null
  }
}

// LandingView is shared by the EN (/[location]) and ES (/es/[location]) routes,
// which reuse identical English slugs — so the boat-section chrome is localized
// here by the `lang` prop the ES route passes.
const LABELS = {
  en: { region: 'Verified boats · Licensed skippers', available: 'Available boats in', seeAll: 'See all boats in', browse: 'Browse boats in', browseAll: 'Browse all boats' },
  es: { region: 'Barcos verificados · Patrón incluido', available: 'Barcos disponibles en', seeAll: 'Ver todos los barcos en', browse: 'Ver barcos en', browseAll: 'Ver todos los barcos' },
}

export default async function LandingView({ page, lang = 'en' }: { page: LandingPage; lang?: 'en' | 'es' }) {
  const inv = await resolveInventory(page)
  const t = LABELS[lang] ?? LABELS.en
  const basePath = lang === 'es' ? '/es' : ''
  // ES bodies are translated from EN and keep EN-shaped internal links
  // (href="/{slug}/") — rewrite them to the ES twin so the Spanish section
  // interlinks itself instead of leaking every click back to the EN pages.
  const bodyHtml = lang === 'es'
    ? (page.intro + page.bodyHtml).replace(/href="\/([a-z0-9-]+)\/?"/g, (m, slug) =>
        hasEs(slug) ? `href="/es/${slug}"` : m)
    : page.intro + page.bodyHtml
  const faqJsonLd = page.faqs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: page.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: lang === 'es' ? 'Inicio' : 'Home', item: `https://boathire24.com${basePath}` },
      { '@type': 'ListItem', position: 2, name: page.h1 || page.title, item: `https://boathire24.com${basePath}/${page.slug}` },
    ],
  }

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {/* ── Hero ── */}
      <section style={{ position: 'relative', height: '340px', overflow: 'hidden' }}>
        {page.heroImage ? (
          <Image src={page.heroImage} alt={page.h1} fill priority sizes="100vw" style={{ objectFit: 'cover', opacity: 0.42 }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#0a1a32,#071122)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(7,16,30,0.3) 0%, rgba(7,16,30,0.78) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(116,207,232,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(244,244,242,0.65)', marginBottom: '14px' }}>
            <MapPin style={{ width: '13px', height: '13px' }} /> {inv ? `${prettyCity(inv.loc.city)}, ${inv.loc.country}` : t.region}
          </div>
          <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 3rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.12, marginBottom: '12px', maxWidth: '780px' }}>
            {page.h1}
          </h1>
        </div>
      </section>

      {/* ── Available boats (real inventory for this destination) ── */}
      {inv && (
        <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '44px 24px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f4f4f2' }}>{t.available} {prettyCity(inv.loc.city)}</h2>
            <Link href={`/${inv.loc.slug}`} style={{ fontSize: '13px', fontWeight: 600, color: gold, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {t.seeAll} {prettyCity(inv.loc.city)} →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {inv.boats.map((b) => <BoatCard key={b.id} boat={b} />)}
          </div>
        </section>
      )}

      {/* ── Body ── */}
      <article style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 40px' }}>
        <div
          className="landing-prose"
          style={{ fontSize: '16px', lineHeight: 1.75, color: 'rgba(244,244,242,0.82)' }}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

        {page.faqs?.length ? (
          <section style={{ marginTop: '48px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f4f4f2', marginBottom: '20px' }}>Frequently asked questions</h2>
            {page.faqs.map((f, i) => (
              <details key={i} style={{ borderBottom: '1px solid rgba(116,207,232,0.12)', padding: '14px 0' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#f4f4f2', fontSize: '15px' }}>{f.q}</summary>
                <p style={{ marginTop: '10px', color: 'rgba(244,244,242,0.7)', lineHeight: 1.7, fontSize: '15px' }}>{f.a}</p>
              </details>
            ))}
          </section>
        ) : null}
      </article>

      {/* All-inclusive / escrow trust bar */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 24px 8px' }}>
        <TrustBar />
      </div>

      {/* ── CTA ── */}
      <section style={{ borderTop: '1px solid rgba(116,207,232,0.10)', background: goldFaint }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f4f4f2', marginBottom: '10px' }}>Ready to get on the water?</h2>
          <p style={{ fontSize: '15px', color: 'rgba(244,244,242,0.55)', marginBottom: '24px' }}>Browse verified boats — licensed skipper always included.</p>
          <Link href={inv ? `/${inv.loc.slug}` : '/search'} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 28px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontWeight: 700, fontSize: '14px', textDecoration: 'none', border: `1px solid ${goldBorder}` }}>
            {inv ? `${t.browse} ${prettyCity(inv.loc.city)}` : t.browseAll}
          </Link>
        </div>
      </section>

      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
      {inv && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: `Boats in ${prettyCity(inv.loc.city)}`,
              numberOfItems: inv.boats.length,
              itemListElement: inv.boats.map((b, i) => ({ '@type': 'ListItem', position: i + 1, url: `https://boathire24.com/boats/${b.slug}`, name: b.name })),
            }),
          }}
        />
      )}
    </div>
  )
}
