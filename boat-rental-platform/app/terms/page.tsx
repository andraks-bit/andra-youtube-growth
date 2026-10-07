import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — BoatHire24',
  description: 'The terms and conditions governing use of the BoatHire24 boat charter marketplace. Read before booking or listing a boat.',
  alternates: { canonical: 'https://boathire24.com/terms' },
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

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p style={{ fontSize: '15px', color: textMuted, lineHeight: 1.7 }}>
            Last updated: <strong style={{ color: '#f4f4f2' }}>28 May 2026</strong>
          </p>
          <p style={{ fontSize: '15px', color: textMuted, lineHeight: 1.7, marginTop: '8px' }}>
            By creating an account or making a booking on boathire24.com, you agree to these Terms of Service.
            Please read them carefully. If you do not agree, do not use the platform.
          </p>
        </div>
      </section>

      {/* ── Content ── */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '64px 24px 96px' }}>

        <Section title="1. About BoatHire24">
          <P>
            BoatHire24 is an online marketplace operated by <strong style={{ color: '#f4f4f2' }}>X24Consulting OÜ</strong>,
            a company registered in Estonia under registry code <strong style={{ color: '#f4f4f2' }}>16971898</strong>,
            with registered address at Lossi 8-3, Põltsamaa 48103, Estonia (&ldquo;BoatHire24&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
          </P>
          <P>
            BoatHire24 connects boat owners (&ldquo;Hosts&rdquo;) with people who wish to charter boats
            (&ldquo;Guests&rdquo;). BoatHire24 itself is not a boat operator, skipper, or charter company.
            We provide the technology platform, payment infrastructure, and support services that
            facilitate direct agreements between Hosts and Guests.
          </P>
          <P>
            These Terms govern your use of the BoatHire24 platform (the &ldquo;Service&rdquo;), accessible at
            boathire24.com and its subdomains. By using the Service you confirm you are at least 18 years
            old and legally capable of entering into binding contracts.
          </P>
        </Section>

        <Section title="2. Accounts">
          <P>
            To make a booking or list a boat you must create an account. You agree to:
          </P>
          <Ul>
            <Li>Provide accurate, current, and complete information during registration</Li>
            <Li>Maintain the security of your password and not share it with others</Li>
            <Li>Notify us immediately of any unauthorised use of your account</Li>
            <Li>Be responsible for all activity that occurs under your account</Li>
          </Ul>
          <P>
            We may suspend or terminate your account if you breach these Terms, provide false information,
            or engage in conduct that is harmful to other users or to BoatHire24.
          </P>
        </Section>

        <Section title="3. Bookings — Guests">
          <P><strong style={{ color: '#f4f4f2' }}>Making a booking</strong></P>
          <P>
            When you request or confirm a booking through BoatHire24, you are entering into a direct agreement
            with the Host for the charter of their vessel. BoatHire24 facilitates this agreement but is not a
            party to it. The Host is solely responsible for the vessel, its seaworthiness, the skipper&apos;s
            qualifications, and the delivery of the charter experience.
          </P>
          <P><strong style={{ color: '#f4f4f2' }}>Payment</strong></P>
          <P>
            Payment is processed securely by Stripe at the time of booking confirmation. The total amount
            displayed at checkout includes the charter fee and a platform service fee of{' '}
            <strong style={{ color: '#f4f4f2' }}>15%</strong>. The service fee is non-refundable except where
            stated in our Cancellation Policy below.
          </P>
          <P><strong style={{ color: '#f4f4f2' }}>Guest responsibilities</strong></P>
          <Ul>
            <Li>Arrive at the agreed departure point at the confirmed time</Li>
            <Li>Comply with the Host&apos;s and skipper&apos;s instructions at all times while on board</Li>
            <Li>Ensure the number of guests does not exceed the vessel&apos;s stated capacity</Li>
            <Li>Not bring prohibited items on board (firearms, illegal substances)</Li>
            <Li>Treat the vessel and crew with respect; you are liable for damage caused by your party</Li>
          </Ul>
        </Section>

        <Section title="4. Listings — Hosts">
          <P><strong style={{ color: '#f4f4f2' }}>Listing requirements</strong></P>
          <P>By listing a vessel on BoatHire24, you confirm and warrant that:</P>
          <Ul>
            <Li>You are the owner of the vessel or are authorised by the owner to charter it</Li>
            <Li>The vessel holds a valid maritime registration and is insured for commercial charter use</Li>
            <Li>The skipper holds a valid licence appropriate for the vessel and operating area</Li>
            <Li>All listing information — photos, specifications, pricing, inclusions — is accurate</Li>
            <Li>You will honour confirmed bookings; cancellations by Hosts may result in penalties</Li>
          </Ul>
          <P><strong style={{ color: '#f4f4f2' }}>Payouts</strong></P>
          <P>
            Hosts receive <strong style={{ color: '#f4f4f2' }}>85%</strong> of the charter fee for each completed
            booking. BoatHire24 retains a 15% platform commission. Payouts are processed via Stripe Connect
            and typically arrive in your bank account within 7 days of the completed charter date.
            Hosts must complete Stripe&apos;s identity verification to receive payouts.
          </P>
          <P><strong style={{ color: '#f4f4f2' }}>Host responsibilities</strong></P>
          <Ul>
            <Li>Maintain accurate availability calendars to avoid double bookings</Li>
            <Li>Respond to booking requests within 24 hours (for request-to-book listings)</Li>
            <Li>Ensure the vessel is in safe, clean, and seaworthy condition for every charter</Li>
            <Li>Comply with all applicable maritime safety regulations and local port authority rules</Li>
            <Li>Hold and maintain adequate insurance throughout all charters booked via BoatHire24</Li>
          </Ul>
        </Section>

        <Section title="5. Cancellation policy">
          <P>BoatHire24 operates three cancellation tiers, set by the Host per listing:</P>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
            {[
              { name: 'Flexible', rule: 'Full refund if cancelled more than 48 hours before the charter start time.' },
              { name: 'Moderate', rule: 'Full refund if cancelled more than 7 days before the charter start time. 50% refund if cancelled 3–7 days before.' },
              { name: 'Strict', rule: 'Full refund if cancelled within 48 hours of booking and at least 14 days before the charter. No refund within 14 days of the charter.' },
            ].map((t) => (
              <div key={t.name} style={{ padding: '16px 20px', borderRadius: '12px', background: '#0c1828', border: `1px solid rgba(116,207,232,0.15)` }}>
                <p style={{ fontWeight: 700, color: '#f4f4f2', marginBottom: '4px', fontSize: '14px' }}>{t.name}</p>
                <p style={{ color: textBody, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>{t.rule}</p>
              </div>
            ))}
          </div>

          <P>
            The platform service fee (15%) is non-refundable in all cases. If a Host cancels a confirmed
            booking, the Guest will receive a full refund including the service fee.
          </P>
          <P>
            In the event of adverse weather conditions that make sailing unsafe, the skipper may cancel
            the charter. BoatHire24 will work with both parties to offer a rebooking or a full refund at
            our discretion.
          </P>
        </Section>

        <Section title="6. Safety and liability">
          <P><strong style={{ color: '#f4f4f2' }}>Host liability</strong></P>
          <P>
            Hosts are solely responsible for the safety of their vessel, the competence of their crew,
            and compliance with all maritime safety regulations. BoatHire24 does not inspect vessels and
            makes no warranty regarding their condition or seaworthiness, notwithstanding our verification
            processes which are provided as a good-faith service only.
          </P>
          <P><strong style={{ color: '#f4f4f2' }}>Guest liability</strong></P>
          <P>
            Guests charter at their own risk and must follow all safety instructions given by the skipper.
            BoatHire24 recommends that Guests obtain personal travel and accident insurance prior to chartering.
            BoatHire24 is not liable for personal injury, illness, death, loss of property, or any other loss
            or damage suffered by Guests during a charter.
          </P>
          <P><strong style={{ color: '#f4f4f2' }}>BoatHire24&apos;s liability</strong></P>
          <P>
            To the maximum extent permitted by law, BoatHire24&apos;s total liability to you for any claim
            arising from use of the platform shall not exceed the platform service fee paid in the
            transaction giving rise to the claim. BoatHire24 is not liable for indirect, consequential,
            special, or punitive damages of any kind.
          </P>
        </Section>

        <Section title="7. Prohibited conduct">
          <P>You may not use BoatHire24 to:</P>
          <Ul>
            <Li>Create false, misleading, or fraudulent listings or reviews</Li>
            <Li>Circumvent the platform to make bookings or accept payments outside BoatHire24 (off-platform transactions)</Li>
            <Li>Harass, threaten, or abuse other users</Li>
            <Li>Upload content that is illegal, obscene, defamatory, or infringes third-party rights</Li>
            <Li>Attempt to gain unauthorised access to the platform or other users&apos; accounts</Li>
            <Li>Use automated tools (bots, scrapers) to access the platform without our written permission</Li>
            <Li>Use the platform for any purpose that violates applicable law</Li>
          </Ul>
          <P>
            Violation of these prohibitions may result in immediate account termination and, where applicable,
            referral to law enforcement.
          </P>
        </Section>

        <Section title="8. Reviews and content">
          <P>
            After a completed charter, both Guests and Hosts may leave reviews. Reviews must be honest,
            based on the actual experience, and comply with our community standards. We reserve the right
            to remove reviews that we determine are false, abusive, or in violation of these Terms.
          </P>
          <P>
            By submitting any content to BoatHire24 (photos, descriptions, reviews, messages), you grant us
            a non-exclusive, worldwide, royalty-free licence to use, display, and reproduce that content
            in connection with operating and promoting the platform.
          </P>
        </Section>

        <Section title="9. Intellectual property">
          <P>
            The BoatHire24 name, logo, platform design, and all original content created by us are our
            intellectual property. You may not reproduce, distribute, or create derivative works from
            our content without our prior written consent.
          </P>
        </Section>

        <Section title="10. Third-party services">
          <P>
            The platform integrates third-party services including Stripe (payments), Mapbox (maps),
            and Supabase (infrastructure). Your use of these services is also governed by their respective
            terms and privacy policies. BoatHire24 is not responsible for the practices of third-party services.
          </P>
        </Section>

        <Section title="11. Governing law and disputes">
          <P>
            These Terms are governed by the laws of Spain. Any disputes arising from or relating to
            these Terms or your use of the platform shall be subject to the exclusive jurisdiction of
            the courts of Marbella, Spain, unless mandatory consumer protection laws in your country of
            residence require otherwise.
          </P>
          <P>
            We encourage you to contact us first at{' '}
            <a href="mailto:info@boathire24.com" style={{ color: gold, textDecoration: 'none' }}>info@boathire24.com</a>{' '}
            to resolve any dispute informally before taking legal action. We commit to responding to
            complaints within 5 business days.
          </P>
        </Section>

        <Section title="12. Changes to these Terms">
          <P>
            We may update these Terms from time to time to reflect changes to the platform, legal requirements,
            or our policies. We will notify registered users by email of material changes at least 14 days
            before they take effect. Continued use of the platform after the effective date constitutes
            acceptance of the updated Terms.
          </P>
        </Section>

        <Section title="13. Contact">
          <P>For any questions about these Terms:</P>
          <div style={{ padding: '24px', borderRadius: '14px', background: '#0c1828', border: `1px solid ${goldBorder}`, fontSize: '14px', lineHeight: 1.8, color: textBody }}>
            <strong style={{ color: '#f4f4f2' }}>BoatHire24</strong><br />
            Puerto Banús, Marbella, Spain<br />
            <a href="mailto:info@boathire24.com" style={{ color: gold, textDecoration: 'none' }}>info@boathire24.com</a>
          </div>
        </Section>

        {/* Nav to Privacy */}
        <div style={{ paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/privacy" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, padding: '10px 22px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, textDecoration: 'none' }}>
            Privacy Policy →
          </Link>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, padding: '10px 22px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', color: 'rgba(244,244,242,0.65)', border: '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}>
            ← Back to home
          </Link>
        </div>

      </div>
    </div>
  )
}
