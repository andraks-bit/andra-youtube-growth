import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookie Policy — BoatHire24',
  description: 'How BoatHire24 uses cookies and similar technologies on boathire24.com, and how you can control them.',
  alternates: { canonical: 'https://boathire24.com/cookies' },
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

export default function CookiesPage() {
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
            Cookie Policy
          </h1>
          <p style={{ fontSize: '15px', color: textMuted, lineHeight: 1.7 }}>
            Last updated: <strong style={{ color: '#f4f4f2' }}>7 June 2026</strong>
          </p>
          <p style={{ fontSize: '15px', color: textMuted, lineHeight: 1.7, marginTop: '8px' }}>
            This policy explains how BoatHire24 uses cookies and similar technologies on boathire24.com, and the
            choices you have. It should be read alongside our <Link href="/privacy" style={{ color: gold }}>Privacy Policy</Link>.
          </p>
        </div>
      </section>

      {/* ── Content ── */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '64px 24px 96px' }}>

        <Section title="1. What are cookies?">
          <P>
            Cookies are small text files placed on your device when you visit a website. They let a site remember
            your actions and preferences — such as staying signed in — over time, and help it run securely and
            reliably. We also use similar technologies, such as browser local storage, for the same purposes. In
            this policy we refer to all of them as &ldquo;cookies&rdquo;.
          </P>
        </Section>

        <Section title="2. How we use cookies">
          <P>We use cookies in the following categories:</P>
          <P>
            <strong style={{ color: '#f4f4f2' }}>Strictly necessary</strong> — required for the platform to
            function. They keep you signed in, secure your session, help prevent fraud and cross-site request
            forgery, and route traffic. The Service cannot work properly without them, so they cannot be switched off.
          </P>
          <P>
            <strong style={{ color: '#f4f4f2' }}>Functional</strong> — remember your preferences, such as your
            chosen language, so we can give you a more consistent experience.
          </P>
          <P>
            <strong style={{ color: '#f4f4f2' }}>Analytics &amp; performance</strong> — where used, these help us
            understand how visitors use the platform (which pages are viewed, where errors occur) so we can improve
            it. This information is aggregated and does not identify you personally.
          </P>
        </Section>

        <Section title="3. Cookies set by third parties">
          <P>Some cookies are set by trusted services we rely on to run the platform:</P>
          <Ul>
            <Li><strong style={{ color: '#f4f4f2' }}>Stripe</strong> — processes payments and prevents fraud. Stripe may set cookies when you view a listing or pay for a booking.</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Supabase</strong> — our authentication and database provider, used to keep you securely signed in.</Li>
            <Li><strong style={{ color: '#f4f4f2' }}>Embedded content</strong> — pages that embed external content (for example social media or maps) may allow those providers to set their own cookies.</Li>
          </Ul>
          <P>
            We do not control cookies set by third parties. Please refer to each provider&apos;s own cookie and
            privacy notices for details.
          </P>
        </Section>

        <Section title="4. Managing your cookies">
          <P>
            You can control and delete cookies through your browser settings. Most browsers let you block or remove
            cookies, or warn you before one is set — the exact steps differ by browser, so check its help pages.
          </P>
          <P>
            Please note that blocking strictly necessary cookies will stop core features — such as signing in and
            booking — from working correctly.
          </P>
        </Section>

        <Section title="5. Changes to this policy">
          <P>
            We may update this Cookie Policy from time to time to reflect changes in the technologies we use or for
            legal reasons. Any changes will be posted on this page with a revised &ldquo;Last updated&rdquo; date.
          </P>
        </Section>

        <Section title="6. Contact us">
          <P>
            Questions about how we use cookies? Email us at{' '}
            <a href="mailto:info@boathire24.com" style={{ color: gold }}>info@boathire24.com</a> or reach us through our{' '}
            <Link href="/contact" style={{ color: gold }}>support page</Link>.
          </P>
        </Section>

      </div>
    </div>
  )
}
