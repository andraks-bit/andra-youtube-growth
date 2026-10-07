import { Metadata } from 'next'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { attachRatings } from '@/lib/ratings'
import BoatCard from '@/components/search/BoatCard'
import { MapPin, ShieldCheck, Zap, Anchor, Waves } from 'lucide-react'
import type { BoatWithDetails } from '@/types/database'

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.12)'
const goldBorder = 'rgba(116,207,232,0.22)'
const card = '#0c1828'

export const metadata: Metadata = {
  title: 'Jet Ski Rental in Marbella — Sea-Doo Hire from Puerto Banús',
  description:
    'Rent a Sea-Doo jet ski in Marbella, launching from Puerto Banús. Self-drive, no licence needed. From €250/hour — life jackets, fuel & briefing included.',
  alternates: { canonical: 'https://boathire24.com/jet-ski-marbella' },
  openGraph: {
    title: 'Jet Ski Rental in Marbella — Sea-Doo Hire from Puerto Banús',
    description: 'Self-drive Sea-Doo GTX & GTI jet skis from Puerto Banús. No licence needed. From €250/hour.',
    type: 'article',
    siteName: 'BoatHire24',
  },
}

const FAQS = [
  { q: 'Do I need a licence to rent a jet ski in Marbella?', a: 'No. Our jet skis are rented under Spanish licence-free rules — you self-drive after a short safety briefing. Just bring a valid ID; minimum-age rules apply.' },
  { q: 'How much does a jet ski cost?', a: '€250 for 1 hour, €450 for 2 hours, then €200 for each additional hour. Fuel, life jackets, briefing, insurance and VAT are all included.' },
  { q: 'How many people can ride?', a: 'Up to 3 riders on a Sea-Doo GTX or GTI depending on combined weight. Two adults is the comfortable norm.' },
  { q: 'Where do the jet skis launch from?', a: 'Puerto Banús — the most central marina on the Marbella coast. From there you can ride the Golden Mile past Marbella Club and Puente Romano.' },
]

export default async function JetSkiMarbellaPage() {
  const supabase = await createClient()
  const { data: rawBoats } = await supabase
    .from('boats')
    .select(`*, boat_images(*), boat_pricing(*), boat_features(*), locations(*), profiles(id, full_name, avatar_url, verification_status)`)
    .eq('type', 'jet_ski')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const boats = await attachRatings(supabase, (rawBoats ?? []) as any[]) as BoatWithDetails[]
  const heroImg =
    (boats[0]?.boat_images?.find((i: any) => i.is_hero)?.storage_url) ||
    boats[0]?.boat_images?.[0]?.storage_url

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>
      {/* ── Hero ── */}
      <section style={{ position: 'relative', height: '460px', overflow: 'hidden' }}>
        {heroImg ? (
          <Image src={heroImg} alt="Jet ski rental in Marbella — Sea-Doo from Puerto Banús" fill priority sizes="100vw" style={{ objectFit: 'cover', opacity: 0.5 }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#0a1a32,#071122)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(7,16,30,0.35) 0%, rgba(7,16,30,0.82) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(116,207,232,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: gold, background: goldFaint, border: `1px solid ${goldBorder}`, borderRadius: '99px', padding: '6px 14px', marginBottom: '18px' }}>
            <MapPin style={{ width: 13, height: 13 }} /> Puerto Banús · Marbella
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5.5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.08, marginBottom: '16px' }}>
            Jet Ski Rental in <span style={{ color: gold }}>Marbella</span>
          </h1>
          <p style={{ fontSize: '17px', color: 'rgba(244,244,242,0.72)', maxWidth: '610px', lineHeight: 1.6, marginBottom: '28px' }}>
            Ride a Sea-Doo GTX or GTI along the Golden Mile — self-drive, no licence needed. From <strong style={{ color: '#f4f4f2' }}>€250/hour</strong>, life jackets &amp; fuel included.
          </p>
          <a href="#jet-skis" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 30px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontWeight: 800, fontSize: '15px', textDecoration: 'none', boxShadow: '0 6px 22px rgba(116,207,232,0.30)' }}>
            See the jet skis ↓
          </a>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div style={{ borderBottom: '1px solid rgba(116,207,232,0.10)', background: 'rgba(116,207,232,0.04)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '22px 24px', display: 'flex', gap: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { value: 'From €250', label: 'per hour' },
            { value: 'No licence', label: 'self-drive' },
            { value: 'Sea-Doo', label: 'GTX & GTI' },
            { value: 'Puerto Banús', label: 'launch point' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: gold, marginBottom: '2px' }}>{s.value}</p>
              <p style={{ fontSize: '12px', color: 'rgba(244,244,242,0.42)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Listings ── */}
      <div id="jet-skis" style={{ maxWidth: '1100px', margin: '0 auto', padding: '56px 24px 40px', scrollMarginTop: '90px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Available jet skis</h2>
        <p style={{ fontSize: '15px', color: 'rgba(244,244,242,0.5)', marginBottom: '28px' }}>
          Book instantly — €250 / 1h · €450 / 2h · +€200 each additional hour.
        </p>
        {boats.length === 0 ? (
          <div style={{ background: card, border: `1px solid ${goldBorder}`, borderRadius: '16px', padding: '40px', textAlign: 'center', color: 'rgba(244,244,242,0.55)' }}>
            Jet skis are coming online shortly — check back soon.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {boats.map((boat) => (
              <BoatCard key={boat.id} boat={boat} />
            ))}
          </div>
        )}
      </div>

      {/* ── Why ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 24px 56px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px', textAlign: 'center' }}>Why ride with BoatHire24</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '18px' }}>
          {[
            { Icon: ShieldCheck, t: 'No licence required', d: 'Self-drive under Spanish licence-free rules after a short safety briefing.' },
            { Icon: Zap, t: 'Powerful Sea-Doos', d: 'Stable 3-seater GTX & GTI jet skis — easy for first-timers, fun for everyone.' },
            { Icon: Anchor, t: 'Launch from Puerto Banús', d: 'The most central pickup on the Marbella coast — ride the Golden Mile.' },
            { Icon: Waves, t: 'Everything included', d: 'Life jackets, fuel, briefing, insurance & VAT — no surprises at the marina.' },
          ].map((f) => (
            <div key={f.t} style={{ background: card, border: `1px solid ${goldBorder}`, borderRadius: '16px', padding: '22px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: goldFaint, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <f.Icon style={{ width: 18, height: 18, color: gold }} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>{f.t}</h3>
              <p style={{ fontSize: '13px', color: 'rgba(244,244,242,0.55)', lineHeight: 1.6 }}>{f.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ── */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 24px 96px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px', textAlign: 'center' }}>Jet ski rental — FAQ</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FAQS.map((f) => (
            <div key={f.q} style={{ background: card, border: `1px solid ${goldBorder}`, borderRadius: '14px', padding: '18px 20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f4f4f2', marginBottom: '8px' }}>{f.q}</h3>
              <p style={{ fontSize: '14px', color: 'rgba(244,244,242,0.6)', lineHeight: 1.65, margin: 0 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Schema.org */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            serviceType: 'Jet ski rental',
            name: 'Jet Ski Rental in Marbella',
            areaServed: { '@type': 'Place', name: 'Marbella, Puerto Banús, Spain' },
            provider: { '@type': 'Organization', name: 'BoatHire24', url: 'https://boathire24.com' },
            offers: { '@type': 'Offer', price: '250', priceCurrency: 'EUR', description: '1 hour self-drive Sea-Doo jet ski hire' },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }),
        }}
      />
    </div>
  )
}
