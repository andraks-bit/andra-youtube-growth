import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { headers } from 'next/headers'
import './globals.css'
import SiteNav from '@/components/nav/SiteNav'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import PayoutBadge from '@/components/ui/PayoutBadge'
import AmbientSoundToggle from '@/components/ui/AmbientSoundToggle'
import { getLocale, isRTL } from '@/lib/i18n/locale'
import { t } from '@/lib/i18n/translations'
import { getSiteStats } from '@/lib/site-stats'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: 'dark',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://boathire24.com'),
  title: {
    default: 'BoatHire24 — Rent Boats & Yachts Worldwide',
    template: '%s | BoatHire24',
  },
  description:
    'Find and book verified boats, yachts, catamarans and sailing boats worldwide. Licensed skippers, instant booking, secure payments. No surprises.',
  keywords: ['boat rental', 'yacht charter', 'boat hire', 'Marbella', 'Ibiza', 'Miami'],
  authors: [{ name: 'BoatHire24', url: 'https://boathire24.com' }],
  creator: 'BoatHire24',
  publisher: 'BoatHire24',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'BoatHire24',
    locale: 'en_GB',
    images: [{
      url: '/opengraph-image',
      width: 1200,
      height: 630,
      alt: 'BoatHire24 — Rent Boats & Yachts Worldwide',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@boathire24',
    creator: '@boathire24',
    images: ['/opengraph-image'],
  },
  verification: {
    google: [
      'X2eUUZ7APRJWlW1WksThzh6ylZRQstup7K7PLNHJpY0',
      'QSfSombLmS6Op_4Kz1ypx07X70NuivcXYeoTkoAKLNQ',
    ],
    other: {
      'msvalidate.01': 'CF4FA3F0F1CEAC43E77E46C1D522ABCF',
    },
  },
  alternates: {
    types: {
      'application/rss+xml': 'https://boathire24.com/blog/rss.xml',
    },
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const tr = t(locale)
  // URL beats cookie for <html lang>: crawlers carry no locale cookie, so
  // /es/* pages must declare lang="es" from the path alone. proxy.ts stamps
  // the x-path-locale header on /es routes.
  const pathLocale = (await headers()).get('x-path-locale')
  const htmlLang = pathLocale === 'es' ? 'es' : locale
  const rtl = pathLocale === 'es' ? false : isRTL(locale)
  // Live fleet counts for the footer CTA — same source of truth as the hero.
  const stats = await getSiteStats()
  return (
    <html lang={htmlLang} dir={rtl ? 'rtl' : 'ltr'} className="h-full">
      <body className="h-full flex flex-col antialiased" style={{ background: '#07101e' }}>
        {/* ── Google Analytics (GA4) ── */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-PGT6ZGK9Z2"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-PGT6ZGK9Z2');`}
        </Script>
        {/* ── Sitewide structured data (Organization + WebSite) ── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://boathire24.com/#organization',
                  name: 'BoatHire24',
                  legalName: 'X24Consulting OÜ',
                  taxID: '16971898',
                  url: 'https://boathire24.com',
                  logo: 'https://boathire24.com/brand-logo.jpg',
                  description: 'Boat and yacht charter marketplace — book verified boats with licensed skippers in Marbella and beyond.',
                  areaServed: 'Marbella, Costa del Sol, Spain',
                  email: 'info@boathire24.com',
                  contactPoint: {
                    '@type': 'ContactPoint',
                    contactType: 'customer support',
                    email: 'info@boathire24.com',
                    telephone: '+358400406194',
                    availableLanguage: ['English', 'Spanish'],
                  },
                  address: {
                    '@type': 'PostalAddress',
                    streetAddress: 'Lossi 8-3',
                    addressLocality: 'Põltsamaa',
                    postalCode: '48103',
                    addressCountry: 'EE',
                  },
                  sameAs: ['https://blog.boathire24.com', 'https://boathire24guides.wordpress.com', 'https://www.instagram.com/boathire24', 'https://x.com/boathire24'],
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://boathire24.com/#website',
                  url: 'https://boathire24.com',
                  name: 'BoatHire24',
                  publisher: { '@id': 'https://boathire24.com/#organization' },
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: { '@type': 'EntryPoint', urlTemplate: 'https://boathire24.com/search?q={search_term_string}' },
                    'query-input': 'required name=search_term_string',
                  },
                },
              ],
            }),
          }}
        />
        <SiteNav />
        <AmbientSoundToggle />
        <main className="flex-1">{children}</main>

        {/* ── Footer ── */}
        <footer style={{ background: 'linear-gradient(180deg, #070f1c 0%, #040c16 100%)', borderTop: '1px solid rgba(116,207,232,0.15)' }}>

          {/* ── CTA strip ── */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="container" style={{ paddingTop: '52px', paddingBottom: '52px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#74cfe8' }}>{tr.footer.ctaEyebrow}</p>
                <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.15, maxWidth: '560px' }}>
                  {tr.footer.ctaTitle}&nbsp;<span style={{ color: '#74cfe8' }}>{tr.footer.ctaTitleHighlight}</span>
                </h2>
                <p style={{ fontSize: '15px', color: 'rgba(244,244,242,0.50)', maxWidth: '420px', lineHeight: 1.6 }}>
                  {tr.footer.ctaSub.replace('{boats}', String(stats.boats)).replace('{destinations}', String(stats.destinations))}
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#74cfe8', color: '#07101c', fontWeight: 700, fontSize: '14px', padding: '13px 26px', borderRadius: '50px', textDecoration: 'none' }}>
                    {tr.footer.ctaBtn}
                  </Link>
                  <Link href="/become-a-host" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', color: 'rgba(244,244,242,0.75)', fontWeight: 600, fontSize: '14px', padding: '13px 26px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.18)', textDecoration: 'none' }}>
                    {tr.footer.ctaBtnSecondary}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── Main footer grid ── */}
          <div className="container" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '40px' }}>

              {/* Brand */}
              <div style={{ gridColumn: 'span 2' }}>
                <Link href="/" style={{ display: 'inline-flex', marginBottom: '16px' }}>
                  <Logo size={56} />
                </Link>
                <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'rgba(244,244,242,0.48)', marginBottom: '24px', maxWidth: '260px' }}>
                  {tr.footer.tagline}
                </p>

                {/* Contact chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  <a href="https://wa.me/358400406194" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600, padding: '10px 16px', borderRadius: '50px', background: 'rgba(37,211,102,0.10)', color: '#5edb8a', border: '1px solid rgba(37,211,102,0.25)', textDecoration: 'none', width: 'fit-content' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {tr.footer.whatsapp}
                  </a>
                  <a href="mailto:info@boathire24.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600, padding: '10px 16px', borderRadius: '50px', background: 'rgba(116,207,232,0.08)', color: '#74cfe8', border: '1px solid rgba(116,207,232,0.22)', textDecoration: 'none', width: 'fit-content' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    info@boathire24.com
                  </a>
                  <a
                    href="https://www.instagram.com/boathire24"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Follow @BoatHire24 on Instagram"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      padding: '2px',
                      borderRadius: '50px',
                      background: 'linear-gradient(135deg, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
                      textDecoration: 'none',
                      width: 'fit-content',
                      boxShadow: '0 4px 16px rgba(214,36,159,0.32), 0 2px 8px rgba(253,89,73,0.20)',
                    }}
                  >
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 16px',
                      borderRadius: '50px',
                      background: 'linear-gradient(180deg, rgba(7,16,30,0.95) 0%, rgba(7,16,30,0.92) 100%)',
                      color: '#f4f4f2',
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '22px',
                        height: '22px',
                        borderRadius: '7px',
                        background: 'linear-gradient(135deg, #FED576 0%, #F47133 30%, #BC3081 65%, #4C63D2 100%)',
                        flexShrink: 0,
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="2" width="20" height="20" rx="5"/>
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                          <line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/>
                        </svg>
                      </span>
                      <span style={{ letterSpacing: '-0.01em' }}>@BoatHire24</span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '50px',
                        background: 'linear-gradient(135deg, #fd5949, #d6249f)',
                        color: '#fff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginLeft: '-2px',
                      }}>
                        Follow
                      </span>
                    </span>
                  </a>
                </div>

                {/* Trust badges */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {tr.footer.trustBadges.map((badge) => (
                    <span key={badge} style={{ fontSize: '11px', color: 'rgba(244,244,242,0.40)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50px', padding: '5px 10px' }}>
                      {badge}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: '10px' }}>
                  <PayoutBadge size="sm" />
                </div>
              </div>

              {/* Explore */}
              <div>
                <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#74cfe8', marginBottom: '20px' }}>{tr.footer.explore}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '13px' }}>
                  {[
                    { href: '/search', label: tr.footer.links.allBoats },
                    { href: '/marbella', label: tr.footer.links.marbella },
                    { href: '/how-it-works', label: tr.footer.links.howItWorks },
                    { href: '/blog', label: tr.footer.links.charterGuide },
                    { href: '/news', label: tr.footer.links.newsroom },
                    { href: '/search?type=luxury', label: tr.footer.links.luxuryYachts },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} style={{ fontSize: '13px', color: 'rgba(244,244,242,0.50)', textDecoration: 'none', transition: 'color 0.15s' }} className="hover:text-[#74cfe8]">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Destinations */}
              <div>
                <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#74cfe8', marginBottom: '20px' }}>Destinations</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '13px' }}>
                  {[
                    { href: '/destinations', label: 'All destinations' },
                    { href: '/marbella', label: 'Marbella' },
                    { href: '/boat-tours', label: 'Boat tours' },
                    { href: '/fishing-trips', label: 'Fishing trips' },
                    { href: '/jet-ski-marbella', label: 'Jet ski rental' },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} style={{ fontSize: '13px', color: 'rgba(244,244,242,0.50)', textDecoration: 'none', transition: 'color 0.15s' }} className="hover:text-[#74cfe8]">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Host */}
              <div>
                <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#74cfe8', marginBottom: '20px' }}>{tr.footer.forHosts}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '13px' }}>
                  {[
                    { href: '/become-a-host', label: tr.footer.hostLinks.listYourBoat },
                    { href: '/host', label: tr.footer.hostLinks.hostDashboard },
                    { href: '/host/calendar', label: tr.footer.hostLinks.manageCalendar },
                    { href: '/host/earnings', label: tr.footer.hostLinks.earnings },
                    { href: '/host/onboarding', label: tr.footer.hostLinks.stripeSetup },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} style={{ fontSize: '13px', color: 'rgba(244,244,242,0.50)', textDecoration: 'none', transition: 'color 0.15s' }} className="hover:text-[#74cfe8]">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#74cfe8', marginBottom: '20px' }}>{tr.footer.company}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '13px' }}>
                  {[
                    { href: '/about', label: tr.footer.companyLinks.about },
                    { href: '/contact', label: tr.footer.companyLinks.contact },
                    { href: '/blog', label: tr.footer.companyLinks.blog },
                    { href: '/privacy', label: tr.footer.companyLinks.privacy },
                    { href: '/terms', label: tr.footer.companyLinks.terms },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} style={{ fontSize: '13px', color: 'rgba(244,244,242,0.50)', textDecoration: 'none', transition: 'color 0.15s' }} className="hover:text-[#74cfe8]">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ── Legal bar ── */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="container" style={{ paddingTop: '20px', paddingBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  { href: '/terms', label: 'Terms' },
                  { href: '/privacy', label: 'Privacy' },
                  { href: '/cookies', label: 'Cookies' },
                  // Google News expects ownership, authorship and corrections
                  // policy to be reachable from every page.
                  { href: '/editorial-policy', label: 'Editorial policy' },
                  { href: '/contact', label: 'Support' },
                  // Crawlable entry into the Spanish section — the language
                  // switcher is cookie+reload buttons Google can't follow.
                  { href: '/es', label: 'Español' },
                ].map((l) => (
                  <Link key={l.href} href={l.href} style={{ fontSize: '11px', color: 'rgba(244,244,242,0.30)', textDecoration: 'none' }} className="hover:text-[#74cfe8]">
                    {l.label}
                  </Link>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(244,244,242,0.25)', textAlign: 'center' }}>
                © {new Date().getFullYear()} BoatHire24. {tr.footer.rights} · {tr.footer.securedBy} · {tr.footer.skippersIncluded}
              </p>

              {/* ── Company registration details ── */}
              <div style={{ marginTop: '4px', padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '560px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(116,207,232,0.65)', textTransform: 'uppercase', letterSpacing: '0.10em', textAlign: 'center', margin: '0 0 6px' }}>
                  Operated by
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(244,244,242,0.45)', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
                  <strong style={{ color: 'rgba(244,244,242,0.65)' }}>X24Consulting OÜ</strong>
                  &nbsp;·&nbsp; Registry code <strong style={{ color: 'rgba(244,244,242,0.65)' }}>16971898</strong>
                  &nbsp;·&nbsp; Lossi 8-3, Põltsamaa 48103, Estonia
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
