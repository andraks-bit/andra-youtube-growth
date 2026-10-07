import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — BoatHire24',
  description: 'How BoatHire24 collects, uses, and protects your personal data. Our full privacy policy under GDPR and applicable data protection law.',
  alternates: { canonical: 'https://boathire24.com/privacy' },
}

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.12)'
const goldBorder = 'rgba(116,207,232,0.22)'
const textMuted = 'rgba(244,244,242,0.60)'
const textBody = 'rgba(244,244,242,0.78)'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '48px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f4f4f2', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {title}
      </h2>
      <div style={{ fontSize: '15px', lineHeight: 1.8, color: textBody }}>
        {children}
      </div>
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: '14px' }}>{children}</p>
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul style={{ paddingLeft: '20px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</ul>
}

function Li({ children }: { children: React.ReactNode }) {
  return <li style={{ listStyleType: 'disc', color: textBody }}>{children}</li>
}

export default function PrivacyPage() {
  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '104px', paddingBottom: '64px', borderBottom: '1px solid rgba(116,207,232,0.12)' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(116,207,232,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', maxWidth: '760px', margin: '0 auto', padding: '0 24px' }}>
          <span style={{ display: 'inline-flex', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', padding: '5px 14px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, marginBottom: '20px' }}>
            Legal
          </span>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.15, marginBottom: '16px' }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: '15px', color: textMuted, lineHeight: 1.7 }}>
            Last updated: <strong style={{ color: '#f4f4f2' }}>28 May 2026</strong>
          </p>
          <p style={{ fontSize: '15px', color: textMuted, lineHeight: 1.7, marginTop: '8px' }}>
            This policy explains how BoatHire24 (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects, uses, stores, and
            protects your personal data when you use our platform at boathire24.com. Please read it carefully.
          </p>
        </div>
      </section>

      {/* ── Content ── */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '64px 24px 96px' }}>

        <Section title="1. Who we are">
          <P>
            BoatHire24 is a boat charter marketplace operated by <strong style={{ color: '#f4f4f2' }}>X24Consulting OÜ</strong>,
            a company registered in Estonia under registry code <strong style={{ color: '#f4f4f2' }}>16971898</strong>,
            with registered office at Lossi 8-3, Põltsamaa 48103, Estonia. We connect boat owners
            (&ldquo;Hosts&rdquo;) with people who want to charter boats (&ldquo;Guests&rdquo;).
            Our platform is accessible at <strong>boathire24.com</strong> and associated subdomains.
          </P>
          <P>
            For the purposes of EU data protection law (GDPR), <strong style={{ color: '#f4f4f2' }}>X24Consulting OÜ</strong>
            {' '}(trading as BoatHire24) is the <strong>data controller</strong> for personal data collected through our platform.
            Questions about this policy can be sent to{' '}
            <a href="mailto:info@boathire24.com" style={{ color: gold, textDecoration: 'none' }}>info@boathire24.com</a>.
          </P>
        </Section>

        <Section title="2. Data we collect">
          <P>We collect the following categories of personal data:</P>
          <P><strong style={{ color: '#f4f4f2' }}>Account information</strong></P>
          <Ul>
            <Li>Full name, email address, and password (hashed — we never store plain-text passwords)</Li>
            <Li>Profile photo (optional)</Li>
            <Li>Phone number (optional, used for booking communications)</Li>
            <Li>Bio and host information (if you list a boat)</Li>
          </Ul>
          <P><strong style={{ color: '#f4f4f2' }}>Booking and transaction data</strong></P>
          <Ul>
            <Li>Booking details: dates, duration, guest count, special requests</Li>
            <Li>Payment data — handled entirely by Stripe. We receive a tokenised reference only; we never see or store your full card number</Li>
            <Li>Stripe Connect payout information (for Hosts — bank details go directly to Stripe, not us)</Li>
          </Ul>
          <P><strong style={{ color: '#f4f4f2' }}>Usage data</strong></P>
          <Ul>
            <Li>Pages visited, search queries, filters applied, listings viewed</Li>
            <Li>Device type, browser, operating system, IP address</Li>
            <Li>Referral source and marketing attribution</Li>
          </Ul>
          <P><strong style={{ color: '#f4f4f2' }}>Communications</strong></P>
          <Ul>
            <Li>Messages exchanged with other users through our messaging system</Li>
            <Li>Emails sent to our support address</Li>
            <Li>Reviews and ratings you submit</Li>
          </Ul>
        </Section>

        <Section title="3. How we use your data">
          <P>We use your personal data for the following purposes:</P>
          <Ul>
            <Li><strong style={{ color: '#f4f4f2' }}>To provide the service:</strong> creating and managing your account, processing bookings, facilitating payments, connecting Guests with Hosts</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>To communicate with you:</strong> booking confirmations, receipts, host notifications, support replies, system updates</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>To improve the platform:</strong> analysing usage patterns, fixing bugs, testing new features, fraud detection</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>To comply with the law:</strong> meeting tax, anti-money-laundering, and maritime regulatory obligations</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Marketing (with your consent):</strong> sending newsletters, promotional offers, and charter inspiration — you can opt out at any time</Li>
          </Ul>
          <P>
            We rely on the following legal bases under GDPR: <strong style={{ color: '#f4f4f2' }}>contract performance</strong> (to fulfil your booking),{' '}
            <strong style={{ color: '#f4f4f2' }}>legitimate interests</strong> (platform security, fraud prevention, analytics),{' '}
            <strong style={{ color: '#f4f4f2' }}>legal obligation</strong> (tax records, regulatory compliance), and{' '}
            <strong style={{ color: '#f4f4f2' }}>consent</strong> (marketing emails, optional cookies).
          </P>
        </Section>

        <Section title="4. Sharing your data">
          <P>We share personal data only in the following circumstances:</P>
          <Ul>
            <Li><strong style={{ color: '#f4f4f2' }}>With the other party in a booking:</strong> Guests receive the Host's name and marina contact details after a confirmed booking; Hosts receive the Guest's name and booking details</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Stripe:</strong> our payment processor. Stripe processes all card and bank transactions. Their privacy policy governs how they handle your financial data</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Supabase:</strong> our database and authentication infrastructure provider. Data is stored on Supabase servers in the EU</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Resend:</strong> our transactional email provider, used for booking confirmations and notifications</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Vercel:</strong> our hosting provider. Web traffic passes through Vercel's infrastructure</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Legal authorities:</strong> if required by law, court order, or to protect the safety of users or the public</Li>
          </Ul>
          <P>We do not sell your personal data. We do not share it with advertisers or data brokers.</P>
        </Section>

        <Section title="5. Cookies">
          <P>
            We use cookies and similar tracking technologies to operate the platform and improve your experience.
            The categories we use are:
          </P>
          <Ul>
            <Li><strong style={{ color: '#f4f4f2' }}>Essential cookies:</strong> required for login sessions, booking flow, and security. Cannot be disabled</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Functional cookies:</strong> remember your preferences (language, filter settings)</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Analytics cookies:</strong> measure which pages are visited and how users navigate (with your consent)</Li>
          </Ul>
          <P>
            You can manage cookie preferences through our consent banner or your browser settings. Disabling
            non-essential cookies will not prevent you from using the platform.
          </P>
        </Section>

        <Section title="6. Data retention">
          <P>We keep your personal data for as long as necessary to provide the service and meet our legal obligations:</P>
          <Ul>
            <Li><strong style={{ color: '#f4f4f2' }}>Account data:</strong> retained while your account is active and for 2 years after account deletion (fraud prevention)</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Booking records:</strong> 7 years from the charter date (tax and financial regulatory requirements)</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Messages:</strong> 3 years from the date of the related booking</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Marketing data:</strong> until you unsubscribe or withdraw consent</Li>
          </Ul>
        </Section>

        <Section title="7. Your rights">
          <P>Under GDPR, you have the following rights regarding your personal data:</P>
          <Ul>
            <Li><strong style={{ color: '#f4f4f2' }}>Access:</strong> request a copy of the data we hold about you</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Rectification:</strong> ask us to correct inaccurate data</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Erasure:</strong> ask us to delete your data (&ldquo;right to be forgotten&rdquo;), subject to legal retention obligations</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Restriction:</strong> ask us to limit how we process your data in certain circumstances</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Portability:</strong> receive your data in a machine-readable format</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Objection:</strong> object to processing based on legitimate interests or for marketing purposes</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Withdraw consent:</strong> at any time where processing is based on consent</Li>
          </Ul>
          <P>
            To exercise any of these rights, email{' '}
            <a href="mailto:info@boathire24.com" style={{ color: gold, textDecoration: 'none' }}>info@boathire24.com</a>.
            We will respond within 30 days. You also have the right to lodge a complaint with your national data
            protection authority (in Spain: the AEPD — <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" style={{ color: gold, textDecoration: 'none' }}>aepd.es</a>).
          </P>
        </Section>

        <Section title="8. Security">
          <P>
            We implement technical and organisational measures to protect your personal data, including:
            TLS encryption for all data in transit, encrypted storage for sensitive data at rest,
            strict row-level security on our database (users can only access their own data),
            regular security reviews, and limited internal access to personal data on a need-to-know basis.
          </P>
          <P>
            No system is completely secure. If you discover a security vulnerability, please report it
            to <a href="mailto:info@boathire24.com" style={{ color: gold, textDecoration: 'none' }}>info@boathire24.com</a> immediately.
          </P>
        </Section>

        <Section title="9. International transfers">
          <P>
            Our core infrastructure (Supabase database) is hosted within the European Union. Some of our
            service providers (Stripe, Vercel, Resend) operate globally and may process data outside the EU.
            Where this occurs, we rely on Standard Contractual Clauses or equivalent safeguards approved by
            the European Commission.
          </P>
        </Section>

        <Section title="10. Children">
          <P>
            BoatHire24 is not intended for use by anyone under the age of 18. We do not knowingly collect
            personal data from children. If you believe a child has provided us with personal data, please
            contact us and we will delete it promptly.
          </P>
        </Section>

        <Section title="11. Changes to this policy">
          <P>
            We may update this Privacy Policy from time to time. We will notify registered users by email
            of any material changes and update the &ldquo;Last updated&rdquo; date above. Continued use of
            the platform after changes take effect constitutes acceptance of the revised policy.
          </P>
        </Section>

        <Section title="12. Contact">
          <P>
            For any privacy-related questions, data subject requests, or concerns:
          </P>
          <div style={{ padding: '24px', borderRadius: '14px', background: '#0c1828', border: `1px solid ${goldBorder}`, fontSize: '14px', lineHeight: 1.8, color: textBody }}>
            <strong style={{ color: '#f4f4f2' }}>BoatHire24</strong> — operated by X24Consulting OÜ<br />
            Registry code: <strong style={{ color: '#f4f4f2' }}>16971898</strong><br />
            Lossi 8-3, Põltsamaa 48103, Estonia<br />
            <a href="mailto:info@boathire24.com" style={{ color: gold, textDecoration: 'none' }}>info@boathire24.com</a>
          </div>
        </Section>

        {/* Nav to Terms */}
        <div style={{ paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/terms" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, padding: '10px 22px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, textDecoration: 'none' }}>
            Terms of Service →
          </Link>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, padding: '10px 22px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', color: 'rgba(244,244,242,0.65)', border: '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}>
            ← Back to home
          </Link>
        </div>

      </div>
    </div>
  )
}
