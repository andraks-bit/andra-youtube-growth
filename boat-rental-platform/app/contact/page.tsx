import type { Metadata } from 'next'
import { Mail, Clock, Ship } from 'lucide-react'
import ContactForm from '@/components/support/ContactForm'

const SUPPORT_EMAIL = 'info@boathire24.com'

export const metadata: Metadata = {
  title: 'Support & Contact — BoatHire24',
  description: 'Need help with a booking, your listing, or a payout? Email the BoatHire24 team or send us a message — we usually reply within a few hours.',
  alternates: { canonical: 'https://boathire24.com/contact' },
}

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.12)'
const goldBorder = 'rgba(116,207,232,0.22)'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const textMuted = 'rgba(244,244,242,0.60)'
const textBody = 'rgba(244,244,242,0.78)'

export default function ContactPage() {
  return (
    <div style={{ background: '#07101e', color: text, minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '104px', paddingBottom: '48px', borderBottom: '1px solid rgba(116,207,232,0.12)' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(116,207,232,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', maxWidth: '760px', margin: '0 auto', padding: '0 24px' }}>
          <span style={{ display: 'inline-flex', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', padding: '5px 14px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, marginBottom: '20px' }}>
            Support
          </span>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: text, lineHeight: 1.15, marginBottom: '16px' }}>
            How can we help?
          </h1>
          <p style={{ fontSize: '15px', color: textMuted, lineHeight: 1.7, maxWidth: '560px' }}>
            Questions about a booking, your listing, or a payout? Send us a message and the BoatHire24 team will get back to you — usually within a few hours.
          </p>
        </div>
      </section>

      {/* ── Body ── */}
      <section style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Direct contact cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '40px' }}>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', background: card, border: `1px solid ${border}`, borderRadius: '16px', textDecoration: 'none' }}
          >
            <div style={{ width: 42, height: 42, borderRadius: '12px', background: goldFaint, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Mail style={{ width: 20, height: 20, color: gold }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12px', color: textMuted, marginBottom: '2px' }}>Email us</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: text, overflow: 'hidden', textOverflow: 'ellipsis' }}>{SUPPORT_EMAIL}</div>
            </div>
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', background: card, border: `1px solid ${border}`, borderRadius: '16px' }}>
            <div style={{ width: 42, height: 42, borderRadius: '12px', background: goldFaint, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock style={{ width: 20, height: 20, color: gold }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12px', color: textMuted, marginBottom: '2px' }}>Response time</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: text }}>Within a few hours</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '18px', padding: '28px 24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: text, marginBottom: '6px' }}>Send us a message</h2>
          <p style={{ fontSize: '14px', color: textMuted, marginBottom: '24px' }}>We&apos;ll reply by email to the address you give below.</p>
          <ContactForm supportEmail={SUPPORT_EMAIL} />
        </div>

        {/* Booking-specific nudge */}
        <p style={{ fontSize: '13px', color: 'rgba(244,244,242,0.40)', textAlign: 'center', marginTop: '24px', lineHeight: 1.7 }}>
          <Ship style={{ width: 14, height: 14, color: gold, display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
          For a question about a specific trip, you can also message the host directly from your booking in <span style={{ color: textBody }}>Dashboard → Messages</span>.
        </p>
      </section>
    </div>
  )
}
