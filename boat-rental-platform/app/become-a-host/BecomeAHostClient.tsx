'use client'

import Link from 'next/link'
import { BarChart3, Shield, Zap, Anchor, ArrowRight, CheckCircle2, TrendingUp, Sparkles, Camera, MessageCircle } from 'lucide-react'
import PayoutBadge from '@/components/ui/PayoutBadge'

const BENEFITS = [
  { icon: Sparkles,    title: 'We list your boats for you', desc: 'No time to upload photos and write descriptions? Send us your boat details and our team builds your listings — free.', stat: 'FREE',    statLabel: 'concierge setup' },
  { icon: BarChart3,   title: 'Earn on your terms',     desc: 'Set your own prices, block dates when you need the boat, no minimum commitment.',                                        stat: '€2,400',  statLabel: 'avg. monthly earnings' },
  { icon: Shield,      title: 'Protected bookings',     desc: 'Stripe-powered payments, verified renters, and 24/7 host support on every booking.',                                     stat: '100%',    statLabel: 'payment protection' },
  { icon: Zap,         title: 'Get bookings fast',      desc: 'Instant-book option gets you guests faster. We handle all discovery, marketing, and SEO.',                               stat: '48h',     statLabel: 'to first booking' },
  { icon: Anchor,      title: 'You keep 85%',           desc: 'BoatHire24 charges a 15% platform fee — one of the lowest in the yacht charter industry.',                                 stat: '85%',     statLabel: 'of every booking' },
]

const STEPS = [
  { num: '01', title: 'Create your listing', desc: 'Add photos, set your prices and availability. Takes about 10 minutes.' },
  { num: '02', title: 'Receive bookings',    desc: 'Guests find you via search. Approve requests or turn on instant book.' },
  { num: '03', title: 'Host the charter',   desc: 'Meet your guests at the marina. BoatHire24 handles the payments.' },
  { num: '04', title: 'Get paid',           desc: 'Earnings hit your bank account 7 days after each completed charter.' },
]

const INCLUDES = [
  'Free concierge listing setup',
  'Verified renter profiles',
  'Stripe payment protection',
  'Free listing — no upfront cost',
  'Full insurance framework',
  '24/7 host support',
  'Your own calendar management',
  '24h payouts after trip',
]

const CONCIERGE_STEPS = [
  { Icon: MessageCircle, title: 'Send us your boats',   desc: 'Photos, specs, prices — by WhatsApp, email or shared Drive. Whatever\'s easiest.' },
  { Icon: Camera,        title: 'We build the listings', desc: 'Our team writes the descriptions, sets up pricing tiers, uploads photos, picks amenities — within 48h.' },
  { Icon: CheckCircle2,  title: 'Review &amp; activate',     desc: 'You log in, check everything looks right, click activate. Listings go live immediately.' },
]

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.12)'
const goldBorder = 'rgba(116,207,232,0.22)'
const textMuted = 'rgba(244,244,242,0.55)'

export default function BecomeAHostClient() {
  return (
    <div style={{ background: '#07101e', color: '#f4f4f2' }}>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '100px', paddingBottom: '88px' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 90% 60% at 60% 0%, rgba(116,207,232,0.12) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.025, backgroundImage: 'linear-gradient(rgba(116,207,232,1) 1px, transparent 1px), linear-gradient(90deg, rgba(116,207,232,1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />

        <div style={{ position: 'relative', maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ maxWidth: '600px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, padding: '6px 16px', borderRadius: '99px', marginBottom: '28px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}` }}>
              <TrendingUp style={{ width: '13px', height: '13px' }} /> Earn from your boat today
            </div>

            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '22px', color: '#f4f4f2' }}>
              Turn your boat into{' '}
              <span style={{ color: gold }}>consistent income</span>
            </h1>

            <p style={{ fontSize: '17px', lineHeight: 1.7, marginBottom: '20px', color: textMuted }}>
              List on BoatHire24 and reach thousands of verified guests every month.
              Free to start — you keep 85% of every booking.
            </p>

            <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '36px', color: '#fbbf24', fontWeight: 600 }}>
              ✨ <strong>No time to upload?</strong> Send us your boats — <span style={{ textDecoration: 'underline' }}>we list them for you, free</span>.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/host/listings/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', borderRadius: '99px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', boxShadow: '0 8px 32px rgba(116,207,232,0.32)', textDecoration: 'none' }}>
                List my boat — it&apos;s free <ArrowRight style={{ width: '16px', height: '16px' }} />
              </Link>
              <Link href="/how-it-works" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', borderRadius: '99px', fontSize: '15px', fontWeight: 600, border: `1px solid ${goldBorder}`, color: 'rgba(244,244,242,0.80)', background: 'transparent', textDecoration: 'none' }}>
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Payout SLA strip ── */}
      <div style={{ borderTop: '1px solid rgba(34,197,94,0.12)', background: 'rgba(34,197,94,0.04)', padding: '14px 24px', display: 'flex', justifyContent: 'center' }}>
        <PayoutBadge />
      </div>

      {/* ── Stats bar ── */}
      <div style={{ borderTop: `1px solid rgba(116,207,232,0.10)`, borderBottom: `1px solid rgba(116,207,232,0.10)`, background: 'rgba(116,207,232,0.04)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { value: '17',      label: 'Boats listed' },
            { value: '€2.4k',  label: 'Avg. monthly earn' },
            { value: '85%',    label: 'Payout rate' },
            { value: '7 days', label: 'To get paid' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '22px', fontWeight: 700, color: gold, marginBottom: '4px' }}>{s.value}</p>
              <p style={{ fontSize: '12px', color: 'rgba(244,244,242,0.42)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Benefits ── */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '88px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <span style={{ display: 'inline-flex', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', padding: '5px 14px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, marginBottom: '16px' }}>
            Why BoatHire24
          </span>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.25rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.2 }}>
            Everything you need to earn from your boat
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {BENEFITS.map((b) => (
            <div key={b.title} style={{ padding: '28px', borderRadius: '18px', display: 'flex', gap: '20px', background: '#0c1828', border: `1px solid ${goldBorder}` }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: goldFaint, flexShrink: 0 }}>
                <b.icon style={{ width: '20px', height: '20px', color: gold }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#f4f4f2' }}>{b.title}</h3>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: gold }}>{b.stat}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(244,244,242,0.35)' }}>{b.statLabel}</p>
                  </div>
                </div>
                <p style={{ fontSize: '13px', lineHeight: 1.7, color: textMuted, margin: 0 }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Concierge Listing Service (NEW) ── */}
      <section style={{ maxWidth: '1000px', margin: '88px auto 0', padding: '0 24px' }}>
        <div style={{
          position: 'relative',
          borderRadius: '24px',
          padding: '52px 44px',
          background: 'linear-gradient(135deg, #1a1208 0%, #0e1828 100%)',
          border: '2px solid',
          borderImage: 'linear-gradient(135deg,#fde68a,#fbbf24,#74cfe8,#92400e) 1',
          overflow: 'hidden',
        }}>
          {/* Glow */}
          <div aria-hidden style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: '40px', alignItems: 'flex-start' }}>

            {/* Left: pitch */}
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.14em', padding: '6px 14px', borderRadius: '99px', background: 'linear-gradient(135deg, #fbbf24, #74cfe8)', color: '#1a1208', marginBottom: '20px', boxShadow: '0 4px 14px rgba(251,191,36,0.32)' }}>
                <Sparkles style={{ width: 13, height: 13 }} /> 100% Free Setup
              </span>

              <h2 style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.4rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: '16px' }}>
                Too busy to list your boats?<br/>
                <span style={{ background: 'linear-gradient(135deg,#fde68a 0%, #fbbf24 50%, #74cfe8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  We&apos;ll do it for you.
                </span>
              </h2>

              <p style={{ fontSize: '15px', color: 'rgba(244,244,242,0.70)', lineHeight: 1.65, marginBottom: '20px' }}>
                Most operators don&apos;t have 2 hours per boat to upload photos, write descriptions and set up pricing. So we built a <strong style={{ color: '#fbbf24' }}>free concierge listing service</strong>:
              </p>

              <p style={{ fontSize: '14px', color: 'rgba(244,244,242,0.55)', lineHeight: 1.6, marginBottom: '24px' }}>
                Send us your boats — photos, specs, prices — and our team creates polished listings on your account within 48 hours. You just sign up, review, and click activate.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Link
                  href="/signup?next=/become-a-host"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 26px', borderRadius: '99px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #fbbf24, #74cfe8, #92400e)', color: '#1a1208', textDecoration: 'none', boxShadow: '0 8px 24px rgba(116,207,232,0.30)' }}
                >
                  Sign up &amp; we&apos;ll list for you <ArrowRight style={{ width: 15, height: 15 }} />
                </Link>
                <a
                  href="https://wa.me/358400406194?text=Hi%2C%20I%27d%20like%20BoatHire24%20to%20list%20my%20boats%20for%20me%20%28concierge%20service%29"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: '99px', fontSize: '14px', fontWeight: 700, background: 'rgba(37,211,102,0.10)', border: '1px solid rgba(37,211,102,0.28)', color: '#5edb8a', textDecoration: 'none' }}
                >
                  💬 WhatsApp us
                </a>
              </div>

              <p style={{ fontSize: '12px', color: 'rgba(244,244,242,0.35)', marginTop: '14px' }}>
                ⚡ Average turnaround: 48h · No fees, no minimum boats
              </p>
            </div>

            {/* Right: 3 steps */}
            <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {CONCIERGE_STEPS.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', padding: '18px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(116,207,232,0.18)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#fbbf24,#74cfe8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(251,191,36,0.30)' }}>
                    <step.Icon style={{ width: 18, height: 18, color: '#1a1208' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.12em' }}>STEP {i + 1}</span>
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f4f4f2', marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: step.title }} />
                    <p style={{ fontSize: '13px', color: 'rgba(244,244,242,0.60)', lineHeight: 1.55, margin: 0 }} dangerouslySetInnerHTML={{ __html: step.desc }} />
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── 4-step process ── */}
      <section style={{ padding: '88px 24px', background: 'rgba(116,207,232,0.03)', borderTop: `1px solid rgba(116,207,232,0.10)`, borderBottom: `1px solid rgba(116,207,232,0.10)`, marginTop: '88px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <span style={{ display: 'inline-flex', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', padding: '5px 14px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, marginBottom: '16px' }}>
              The process
            </span>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.25rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.2 }}>
              From listing to payout in 4 steps
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px' }}>
            {STEPS.map((step, i) => (
              <div key={step.num} style={{ position: 'relative' }}>
                {i < STEPS.length - 1 && (
                  <div style={{ display: 'none', position: 'absolute', top: '20px', left: '100%', width: '100%', height: '1px', background: 'rgba(116,207,232,0.18)', zIndex: 0 }} className="connector-line" />
                )}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, marginBottom: '18px' }}>
                    {step.num}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#f4f4f2', marginBottom: '8px' }}>{step.title}</h3>
                  <p style={{ fontSize: '13px', lineHeight: 1.7, color: textMuted, margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How & when you get paid ── */}
      <section style={{ maxWidth: '980px', margin: '0 auto', padding: '88px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', padding: '5px 14px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, marginBottom: '16px' }}>
            💸 Payments &amp; payouts
          </span>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.25rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.2, marginBottom: '12px' }}>
            How &amp; when you get paid
          </h2>
          <p style={{ fontSize: '16px', color: textMuted, maxWidth: '560px', margin: '0 auto', lineHeight: 1.6 }}>
            Every guest pays <strong style={{ color: '#f4f4f2' }}>100% upfront</strong>. BoatHire24 securely holds the funds and pays you out — <strong style={{ color: gold }}>24 hours after check-in / trip start</strong>.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

          {/* Standard Operators */}
          <div style={{ position: 'relative', borderRadius: '18px', padding: '32px 28px', background: '#0c1828', border: `1px solid ${goldBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '20px' }}>⚓</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f4f4f2', margin: 0 }}>Standard Operators</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(244,244,242,0.45)', margin: '0 0 22px' }}>Every new host starts here</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { t: 'Customer pays 100% upfront', s: 'Booking is confirmed only once paid in full.' },
                { t: 'BoatHire24 holds the funds', s: 'Held securely in escrow via Stripe until the trip.' },
                { t: 'You’re paid 24h after check-in', s: 'Payout released to your bank a day after the trip starts.' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: goldFaint, border: `1px solid ${goldBorder}`, color: gold, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '12px', fontWeight: 700, marginTop: '1px' }}>✓</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f4f4f2' }}>{row.t}</div>
                    <div style={{ fontSize: '13px', color: textMuted, lineHeight: 1.55, marginTop: '2px' }}>{row.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Operators */}
          <div style={{ position: 'relative', borderRadius: '18px', padding: '32px 28px', background: 'linear-gradient(135deg, #1a1208 0%, #0e1828 100%)', border: '2px solid', borderImage: 'linear-gradient(135deg,#fde68a,#fbbf24,#74cfe8,#92400e) 1', overflow: 'hidden' }}>
            <div aria-hidden style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(251,191,36,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '20px' }}>🛡️</span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f4f4f2', margin: 0 }}>Verified Operators</h3>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 9px', borderRadius: '99px', background: 'linear-gradient(135deg,#fbbf24,#74cfe8)', color: '#1a1208', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Trusted</span>
              </div>
              <p style={{ fontSize: '13px', color: '#fbbf24', margin: '0 0 22px', fontWeight: 600 }}>Unlocked after your first completed booking</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { t: 'Customer pays 100% upfront', s: 'Same secure upfront payment for every booking.' },
                  { t: 'Funds may be released before departure', s: 'Faster access to your money — ahead of the trip.' },
                  { t: 'Reserved for trusted partners', s: 'For operators with a proven booking track record.' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg,#fbbf24,#74cfe8)', color: '#1a1208', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '12px', fontWeight: 800, marginTop: '1px' }}>✓</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#f4f4f2' }}>{row.t}</div>
                      <div style={{ fontSize: '13px', color: 'rgba(244,244,242,0.65)', lineHeight: 1.55, marginTop: '2px' }}>{row.s}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '20px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)', fontSize: '12px', color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⭐ Minimum 1 completed booking required to qualify
              </div>
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(244,244,242,0.35)', marginTop: '24px', lineHeight: 1.6 }}>
          All payouts are processed via Stripe directly to your connected bank account. BoatHire24 keeps a 15% platform commission — you receive 85% of every booking.
        </p>
      </section>

      {/* ── CTA block ── */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '88px 24px' }}>
        <div style={{ borderRadius: '22px', padding: '44px', background: 'linear-gradient(135deg,#0e1e35,#0c1828)', border: `1px solid ${goldBorder}` }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '44px' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '20px', color: gold }}>
                Platform includes — for every host
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {INCLUDES.map((item) => (
                  <span key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(244,244,242,0.75)' }}>
                    <CheckCircle2 style={{ width: '16px', height: '16px', flexShrink: 0, color: gold }} />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '18px', color: '#f4f4f2', marginBottom: '8px' }}>Ready to start earning?</p>
              <p style={{ fontSize: '14px', color: textMuted, marginBottom: '24px' }}>Create your listing in under 10 minutes.</p>
              <Link href="/host/listings/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 28px', borderRadius: '99px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', boxShadow: '0 6px 24px rgba(116,207,232,0.28)', textDecoration: 'none' }}>
                List my boat <ArrowRight style={{ width: '15px', height: '15px' }} />
              </Link>
              <p style={{ fontSize: '12px', color: 'rgba(244,244,242,0.30)', marginTop: '10px' }}>Free to list · No commitment</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
