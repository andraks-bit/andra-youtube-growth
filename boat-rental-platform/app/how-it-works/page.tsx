import Link from 'next/link'
import { Search, CreditCard, Anchor, Star, Ship, Shield, ArrowRight, CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'How BoatHire24 Works — Instant Boat Charter Booking',
  description: 'The simplest way to book a boat charter or list your vessel. Instant booking, licensed skippers, secure payments. No hidden fees, no hassle.',
  alternates: { canonical: 'https://boathire24.com/how-it-works' },
  openGraph: {
    title: 'How BoatHire24 Works — Instant Boat Charter Booking',
    description: 'Search, book, and sail in three steps. Licensed skippers, secure Stripe payments, free cancellation.',
    url: 'https://boathire24.com/how-it-works',
    type: 'website',
    siteName: 'BoatHire24',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How BoatHire24 Works',
    description: 'The simplest way to book a verified boat charter.',
  },
}

const RENTER_STEPS = [
  { num: '01', icon: Search,     title: 'Search & discover',   desc: 'Browse boats by destination, date, boat type, and group size. Read verified reviews from real guests.' },
  { num: '02', icon: CreditCard, title: 'Book & pay securely', desc: 'Choose instant book or send a request. Pay by card — Stripe holds your money in escrow until the day of your trip.' },
  { num: '03', icon: Anchor,     title: 'Set sail',            desc: 'Meet your licensed captain at the marina. Skipper, fuel, drinks, and safety gear are all included.' },
  { num: '04', icon: Star,       title: 'Review your trip',    desc: 'After your charter, leave an honest review to help future guests find the perfect boat.' },
]

const HOST_STEPS = [
  { icon: Ship,    title: 'List your boat',  desc: 'Create a listing in minutes. Set your own prices, availability, and house rules.',                            badge: 'Free' },
  { icon: Shield,  title: 'We handle guests', desc: 'BoatHire24 verifies renters, handles payments, and provides 24/7 support for you and your guests.',           badge: 'Hands-off' },
  { icon: CreditCard, title: 'Get paid',      desc: 'Earnings are transferred to your bank account 7 days after each completed charter. BoatHire24 takes a flat 15% commission — you keep 85%.', badge: '85% yours' },
]

const FAQS = [
  { q: 'How much does BoatHire24 cost?', a: 'Booking is free for renters — the price you see on a listing is the all-inclusive price you pay, with no service fees added at checkout. Hosts pay a flat 15% commission per completed booking and keep 85% of every charter.' },
  { q: 'How are payments protected?', a: 'All payments are processed by Stripe and held in escrow until 24 hours after your charter day. If the host cancels for any reason, your full payment is returned automatically.' },
  { q: 'When do hosts get paid?', a: 'Earnings are transferred to the host’s bank account 7 days after each completed charter — 85% of the booking total, with BoatHire24’s 15% commission already deducted.' },
  { q: 'Is a skipper included in every charter?', a: 'Yes — every charter booked through BoatHire24 includes a licensed skipper as standard, plus fuel, drinks, and safety gear.' },
]

// Structured data: the booking flow as HowTo + the money/escrow facts as FAQPage.
const HOWTO_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to book a boat charter on BoatHire24',
  description: 'Search verified boats, book securely with Stripe-escrowed payments, and set sail with a licensed skipper — in four steps.',
  step: RENTER_STEPS.map((s, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: s.title,
    text: s.desc,
  })),
}

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

const RENTER_INCLUDES = [
  'Licensed skipper on every boat',
  'Fuel included in all charters',
  'Drinks & light snacks on board',
  'Full insurance coverage',
  'Free cancellation (flexible policy)',
]

/* ── shared tokens ── */
const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.12)'
const goldBorder = 'rgba(116,207,232,0.22)'
const textMuted = 'rgba(244,244,242,0.55)'
const card = { background: '#0c1828', border: `1px solid ${goldBorder}`, borderRadius: '18px' }

export default function HowItWorksPage() {
  return (
    <div style={{ background: '#07101e', color: '#f4f4f2' }}>

      {/* JSON-LD: HowTo (booking flow) + FAQPage */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(HOWTO_JSONLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '100px', paddingBottom: '80px' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(116,207,232,0.10) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', maxWidth: '680px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, padding: '6px 18px', borderRadius: '99px', marginBottom: '28px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}` }}>
            Simple · Secure · Trusted
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 800, marginBottom: '20px', lineHeight: 1.12, color: '#f4f4f2' }}>
            How <span style={{ color: gold }}>BoatHire24</span> works
          </h1>
          <p style={{ fontSize: '17px', color: textMuted, lineHeight: 1.7, marginBottom: '36px' }}>
            The simplest way to book a verified boat charter — or earn money listing yours.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 30px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontWeight: 700, fontSize: '14px', textDecoration: 'none', boxShadow: '0 6px 24px rgba(116,207,232,0.28)' }}>
              Find a boat <ArrowRight style={{ width: '15px', height: '15px' }} />
            </Link>
            <Link href="/become-a-host" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 30px', borderRadius: '99px', border: `1px solid ${goldBorder}`, color: 'rgba(244,244,242,0.80)', fontWeight: 600, fontSize: '14px', textDecoration: 'none', background: 'transparent' }}>
              List my boat
            </Link>
          </div>
        </div>
      </section>

      {/* ── Gold divider ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(116,207,232,0.25), transparent)' }} />
      </div>

      {/* ── For Renters ── */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '88px 24px 0' }}>

        {/* Centered heading */}
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '5px 14px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, marginBottom: '16px' }}>
            For renters
          </span>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.25rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.2 }}>
            Book in 3 minutes, sail the same day
          </h2>
        </div>

        {/* Steps grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {RENTER_STEPS.map((step) => (
            <div key={step.num} style={{ ...card, position: 'relative', padding: '28px 24px 30px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <span style={{ position: 'absolute', top: '14px', right: '18px', fontSize: '2.8rem', fontWeight: 900, lineHeight: 1, userSelect: 'none', color: 'rgba(116,207,232,0.07)' }}>
                {step.num}
              </span>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: goldFaint, flexShrink: 0 }}>
                <step.icon style={{ width: '20px', height: '20px', color: gold }} />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#f4f4f2' }}>{step.title}</h3>
              <p style={{ fontSize: '13px', lineHeight: 1.7, color: textMuted, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Always included */}
        <div style={{ borderRadius: '18px', padding: '28px 32px', marginBottom: '44px', background: 'rgba(116,207,232,0.06)', border: `1px solid ${goldBorder}` }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '18px', color: gold }}>
            Always included — every charter
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 36px' }}>
            {RENTER_INCLUDES.map((item) => (
              <span key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(244,244,242,0.78)' }}>
                <CheckCircle2 style={{ width: '16px', height: '16px', flexShrink: 0, color: gold }} />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gold divider ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(116,207,232,0.25), transparent)' }} />
      </div>

      {/* ── For Hosts ── */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '88px 24px' }}>

        {/* Centered heading */}
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '5px 14px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, marginBottom: '16px' }}>
            For hosts
          </span>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.25rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.2 }}>
            Your boat earns while you keep the keys
          </h2>
        </div>

        {/* Host steps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '36px' }}>
          {HOST_STEPS.map((step) => (
            <div key={step.title} style={{ ...card, padding: '28px 24px 30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: goldFaint }}>
                  <step.icon style={{ width: '20px', height: '20px', color: gold }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}` }}>
                  {step.badge}
                </span>
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#f4f4f2', marginBottom: '8px' }}>{step.title}</h3>
                <p style={{ fontSize: '13px', lineHeight: 1.7, color: textMuted, margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Host CTA block */}
        <div style={{ borderRadius: '20px', padding: '36px 40px', background: 'linear-gradient(135deg,#0e1e35,#0c1828)', border: `1px solid ${goldBorder}`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '18px', color: '#f4f4f2', marginBottom: '6px' }}>Start earning from your boat</p>
            <p style={{ fontSize: '14px', color: textMuted, margin: 0 }}>Free to list · You keep 85% · Payout in 7 days</p>
          </div>
          <Link href="/become-a-host" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', borderRadius: '99px', fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', boxShadow: '0 6px 24px rgba(116,207,232,0.28)', textDecoration: 'none' }}>
            Start hosting <ArrowRight style={{ width: '16px', height: '16px' }} />
          </Link>
        </div>
      </section>

      {/* ── Gold divider ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(116,207,232,0.25), transparent)' }} />
      </div>

      {/* ── FAQ (server-rendered — mirrors the FAQPage JSON-LD above) ── */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '88px 24px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.25rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.2 }}>
            Frequently asked questions
          </h2>
        </div>
        <div style={{ display: 'grid', gap: '14px' }}>
          {FAQS.map((faq) => (
            <div key={faq.q} style={{ ...card, padding: '24px 28px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#f4f4f2', marginBottom: '8px' }}>{faq.q}</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: textMuted, margin: 0 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
