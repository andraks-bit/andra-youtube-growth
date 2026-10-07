import Link from 'next/link'
import { ArrowRight, Anchor, Globe, Users, Star } from 'lucide-react'
import FounderPhoto from './FounderPhoto'

export const metadata = {
  title: 'About BoatHire24 — Our Story & Mission',
  description: 'Founded by Mardo Soo, BoatHire24 is the global marketplace making premium boat charters accessible to everyone. Our story, mission, and values.',
  alternates: { canonical: 'https://boathire24.com/about' },
  openGraph: {
    title: 'About BoatHire24 — Our Story',
    description: 'How a founder turned a Marbella boat problem into a global charter marketplace.',
    url: 'https://boathire24.com/about',
    type: 'website',
    siteName: 'BoatHire24',
  },
}

const VALUES = [
  { icon: Anchor,  title: 'Safety first',         desc: 'Every boat is inspected. Every skipper is licensed and insured. Non-negotiable — always.' },
  { icon: Globe,   title: 'Radical transparency',  desc: 'Real photos, real prices, real availability. No hidden fees, no bait-and-switch listings.' },
  { icon: Users,   title: 'People over platform',  desc: 'We\'re here to help, not automate you away. Real humans answer within the hour.' },
  { icon: Star,    title: 'Earn what you deserve',  desc: 'Boat owners keep 85%. The most competitive split in the charter industry.' },
]

const MILESTONES = [
  { year: '2020', label: 'Founded', desc: 'Mardo launches BoatHire24 from Marbella with 3 boats and a clear vision.' },
  { year: '2021', label: '50 boats', desc: 'Fleet grows across the Costa del Sol. First five-star reviews roll in.' },
  { year: '2022', label: 'Ibiza launch', desc: 'Expanded to Ibiza and Mallorca. Stripe Connect payments go live.' },
  { year: '2023', label: '10 destinations', desc: 'Platform spreads to Croatia, Greece, and the Algarve.' },
  { year: '2024', label: 'Global', desc: 'The marketplace opens to operators worldwide.' },
  { year: '2025', label: 'Today', desc: 'A verified fleet across destinations worldwide, and growing every week.' },
]

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.12)'
const goldBorder = 'rgba(116,207,232,0.22)'
const textMuted = 'rgba(244,244,242,0.55)'

export const revalidate = 3600

async function liveStats(): Promise<{ boats: number; destinations: number }> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/boats?select=location_id&status=eq.active`,
      { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` }, next: { revalidate: 3600 } },
    )
    const rows: { location_id: string | null }[] = res.ok ? await res.json() : []
    return { boats: rows.length, destinations: new Set(rows.map((r) => r.location_id).filter(Boolean)).size }
  } catch { return { boats: 100, destinations: 20 } }
}

export default async function AboutPage() {
  const stats = await liveStats()
  return (
    <div style={{ background: '#07101e', color: '#f4f4f2' }}>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '104px', paddingBottom: '88px' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(116,207,232,0.10) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', maxWidth: '720px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, padding: '6px 18px', borderRadius: '99px', marginBottom: '28px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}` }}>
            Our story
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 800, marginBottom: '22px', lineHeight: 1.12, color: '#f4f4f2' }}>
            Built by a boat lover,<br /><span style={{ color: gold }}>for everyone on the water.</span>
          </h1>
          <p style={{ fontSize: '17px', color: textMuted, lineHeight: 1.75, marginBottom: '0' }}>
            BoatHire24 started in Marbella in 2020 with a simple idea: booking a charter should be as easy as
            booking a hotel room. Today we list a verified fleet across destinations worldwide and still obsess over every detail.
          </p>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div style={{ borderTop: `1px solid rgba(116,207,232,0.10)`, borderBottom: `1px solid rgba(116,207,232,0.10)`, background: 'rgba(116,207,232,0.04)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { value: `${stats.boats}`, label: 'Boats listed' },
            { value: `${stats.destinations}`, label: 'Destinations' },
            { value: '100%', label: 'Licensed skippers' },
            { value: '15%', label: 'Flat host commission' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '22px', fontWeight: 700, color: gold, marginBottom: '4px' }}>{s.value}</p>
              <p style={{ fontSize: '12px', color: 'rgba(244,244,242,0.42)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Founder & CEO ── */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '88px 24px 0' }}>
        <div style={{ display: 'flex', gap: '56px', alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Photo */}
          <FounderPhoto
            src="https://drive.google.com/thumbnail?id=1gweyldTTQKZu4x_dqDQVes1D-BXAr_Hp&sz=w600"
            alt="Mardo Soo, CEO of BoatHire24"
            initials="MS"
          />

          {/* Text */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'inline-flex', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', padding: '5px 14px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, marginBottom: '20px' }}>
              Founder & CEO
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.15, marginBottom: '8px' }}>
              Mardo Soo
            </h2>
            <p style={{ fontSize: '15px', color: gold, fontWeight: 600, marginBottom: '22px' }}>
              Founder of BoatHire24 · Since 2020
            </p>
            <p style={{ fontSize: '15px', color: textMuted, lineHeight: 1.8, marginBottom: '18px' }}>
              Mardo has spent years building businesses at the intersection of technology and lifestyle. After
              repeatedly watching friends and clients struggle to find reliable, transparent boat charters in
              Marbella and beyond, he set out to fix the experience from the ground up — starting with the
              Costa del Sol fleet he knew best.
            </p>
            <p style={{ fontSize: '15px', color: textMuted, lineHeight: 1.8, marginBottom: '28px' }}>
              &ldquo;The sea should be accessible to everyone. Not just people who know the right people.
              That&apos;s what BoatHire24 is about — making world-class charters as easy to book as a hotel,
              without ever compromising on quality.&rdquo;
            </p>

            {/* Social */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a href="https://www.linkedin.com/in/mardosoo" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, padding: '9px 18px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', color: 'rgba(244,244,242,0.65)', border: '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}>
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Co-Founder ── */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 24px 0' }}>
        <div style={{ display: 'flex', gap: '56px', alignItems: 'center', flexWrap: 'wrap-reverse' }}>

          {/* Text — left side (mirrored layout) */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'inline-flex', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', padding: '5px 14px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, marginBottom: '20px' }}>
              Co-Founder
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.15, marginBottom: '8px' }}>
              Andra Kiirkivi
            </h2>
            <p style={{ fontSize: '15px', color: gold, fontWeight: 600, marginBottom: '22px' }}>
              Co-Founder of BoatHire24 · Since 2020
            </p>
            <p style={{ fontSize: '15px', color: textMuted, lineHeight: 1.8, marginBottom: '18px' }}>
              Andra grew up on the coast of Estonia and spent summers immersed in the Mediterranean charter scene.
              Her deep understanding of the marine world and passion for exceptional guest experiences was the
              spark that turned an idea into BoatHire24.
            </p>
            <p style={{ fontSize: '15px', color: textMuted, lineHeight: 1.8, marginBottom: '28px' }}>
              &ldquo;Every person who steps onto a boat for the first time remembers it forever.
              We built BoatHire24 to make sure that moment is always perfect.&rdquo;
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a href="https://www.instagram.com/andrakiirkivi" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, padding: '9px 18px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, textDecoration: 'none' }}>
                Instagram
              </a>
              <a href="https://www.linkedin.com/in/andrakiirkivi" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, padding: '9px 18px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', color: 'rgba(244,244,242,0.65)', border: '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}>
                LinkedIn
              </a>
            </div>
          </div>

          {/* Photo — right side */}
          <FounderPhoto
            src="https://drive.google.com/thumbnail?id=1PyxDXw278AH_l6KECsD0FF8NWZB2yUuR&sz=w600"
            alt="Andra Kiirkivi, Co-Founder of BoatHire24"
            initials="AK"
          />

        </div>
      </section>

      {/* ── Divider ── */}
      <div style={{ maxWidth: '900px', margin: '88px auto 0', padding: '0 24px' }}>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(116,207,232,0.25), transparent)' }} />
      </div>

      {/* ── Our story / timeline ── */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '88px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <span style={{ display: 'inline-flex', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', padding: '5px 14px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, marginBottom: '16px' }}>
            The journey
          </span>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.25rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.2 }}>
            From 3 boats to a global fleet
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {MILESTONES.map((m, i) => (
            <div key={m.year} style={{ padding: '28px', borderRadius: '18px', background: '#0c1828', border: `1px solid ${i === MILESTONES.length - 1 ? goldBorder : 'rgba(116,207,232,0.10)'}`, position: 'relative', overflow: 'hidden' }}>
              {i === MILESTONES.length - 1 && (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(116,207,232,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
              )}
              <p style={{ fontSize: '28px', fontWeight: 900, color: gold, lineHeight: 1, marginBottom: '6px', opacity: 0.85 }}>{m.year}</p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#f4f4f2', marginBottom: '8px' }}>{m.label}</p>
              <p style={{ fontSize: '13px', lineHeight: 1.65, color: textMuted, margin: 0 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div style={{ maxWidth: '900px', margin: '88px auto 0', padding: '0 24px' }}>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(116,207,232,0.25), transparent)' }} />
      </div>

      {/* ── Values ── */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '88px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <span style={{ display: 'inline-flex', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', padding: '5px 14px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, marginBottom: '16px' }}>
            What we stand for
          </span>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.25rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.2 }}>
            Our values
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
          {VALUES.map((v) => (
            <div key={v.title} style={{ display: 'flex', gap: '20px', padding: '28px', borderRadius: '18px', background: '#0c1828', border: `1px solid ${goldBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '14px', background: goldFaint, flexShrink: 0 }}>
                <v.icon style={{ width: '20px', height: '20px', color: gold }} />
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#f4f4f2', marginBottom: '8px' }}>{v.title}</h3>
                <p style={{ fontSize: '13px', lineHeight: 1.7, color: textMuted, margin: 0 }}>{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '88px 24px' }}>
        <div style={{ borderRadius: '22px', padding: '52px', background: 'linear-gradient(135deg,#0e1e35,#0c1828)', border: `1px solid ${goldBorder}`, textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: gold, marginBottom: '16px' }}>
            Ready to sail?
          </p>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.25rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.2, marginBottom: '14px' }}>
            Ready to cast off?
          </h2>
          <p style={{ fontSize: '15px', color: textMuted, lineHeight: 1.7, maxWidth: '480px', margin: '0 auto 32px' }}>
            Browse verified yachts, catamarans, and speedboats across destinations worldwide.
            Instant booking, licensed skippers, no hidden fees.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontWeight: 700, fontSize: '15px', textDecoration: 'none', boxShadow: '0 6px 24px rgba(116,207,232,0.28)' }}>
              Browse all boats <ArrowRight style={{ width: '16px', height: '16px' }} />
            </Link>
            <Link href="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', borderRadius: '99px', border: `1px solid ${goldBorder}`, color: 'rgba(244,244,242,0.75)', fontWeight: 600, fontSize: '15px', textDecoration: 'none', background: 'transparent' }}>
              Get in touch
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
