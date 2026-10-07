'use client'

import { useState } from 'react'
import BankDetailsForm, { type PayoutMethod } from './BankDetailsForm'
import { CreditCard, Banknote, Shield, ArrowRight, Landmark, Zap, Check } from 'lucide-react'

const gold = '#74cfe8'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

const FEATURES = [
  { Icon: CreditCard, title: 'Secure card processing', desc: 'Guests pay by card — you get paid automatically after each booking.' },
  { Icon: Banknote,   title: 'Direct bank payouts',    desc: 'Earnings transferred to your bank a few days after the charter date.' },
  { Icon: Shield,     title: 'Stripe-powered security', desc: 'Industry-leading fraud protection and compliance built in.' },
]

export default function PayoutTabs({ payoutMethod, stripeUrl }: { payoutMethod: PayoutMethod; stripeUrl: string | null }) {
  const [tab, setTab] = useState<'bank' | 'stripe'>('bank')

  return (
    <div>
      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: '5px', padding: '5px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px' }}>
        {/* Bank account */}
        <button
          onClick={() => setTab('bank')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '11px 10px', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 700,
            border: 'none', whiteSpace: 'nowrap',
            background: tab === 'bank' ? 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)' : 'transparent',
            color: tab === 'bank' ? '#07101e' : muted,
            boxShadow: tab === 'bank' ? '0 2px 12px rgba(116,207,232,0.30)' : 'none',
          }}
        >
          <Landmark style={{ width: 15, height: 15 }} />
          Bank account
          {payoutMethod && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: tab === 'bank' ? '#07101e' : '#22c55e', flexShrink: 0 }} />
          )}
        </button>

        {/* Stripe */}
        <button
          onClick={() => setTab('stripe')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '11px 10px', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 700,
            border: 'none', whiteSpace: 'nowrap',
            background: tab === 'stripe' ? 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)' : 'transparent',
            color: tab === 'stripe' ? '#07101e' : muted,
            boxShadow: tab === 'stripe' ? '0 2px 12px rgba(116,207,232,0.30)' : 'none',
          }}
        >
          <Zap style={{ width: 15, height: 15 }} />
          Stripe
          {!stripeUrl && (
            <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 6px', borderRadius: '99px', background: tab === 'stripe' ? 'rgba(7,16,30,0.18)' : 'rgba(245,158,11,0.15)', color: tab === 'stripe' ? '#07101e' : '#fbbf24', border: tab === 'stripe' ? '1px solid rgba(7,16,30,0.25)' : '1px solid rgba(245,158,11,0.30)' }}>
              Soon
            </span>
          )}
        </button>
      </div>

      {/* ── Bank account tab ── */}
      {tab === 'bank' && <BankDetailsForm initial={payoutMethod} />}

      {/* ── Stripe tab ── */}
      {tab === 'stripe' && (
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '20px', padding: '26px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '24px' }}>
            {FEATURES.map((item) => (
              <div key={item.title} style={{ display: 'flex', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(116,207,232,0.10)', border: '1px solid rgba(116,207,232,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.Icon style={{ width: 18, height: 18, color: gold }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: text, fontSize: '14px', marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ fontSize: '13px', color: muted, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {stripeUrl ? (
            <a
              href={stripeUrl}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', borderRadius: '99px', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', fontSize: '15px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 18px rgba(116,207,232,0.25)' }}
            >
              Set up with Stripe <ArrowRight style={{ width: 16, height: 16 }} />
            </a>
          ) : (
            <div style={{ padding: '18px 20px', borderRadius: '14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '17px' }}>⚡</span>
                <span style={{ fontWeight: 700, color: '#fbbf24', fontSize: '14px' }}>Instant card payouts — coming soon</span>
              </div>
              <p style={{ fontSize: '13px', color: muted, lineHeight: 1.6, margin: '0 0 12px' }}>
                We&apos;re finalising automated card payouts via Stripe. In the meantime, use the{' '}
                <strong style={{ color: text }}>Bank account</strong>{' '}tab — we&apos;ll pay your earnings by bank transfer after each charter.
              </p>
              <button
                onClick={() => setTab('bank')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '99px', background: 'rgba(116,207,232,0.10)', border: '1px solid rgba(116,207,232,0.30)', color: gold, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                <Landmark style={{ width: 14, height: 14 }} /> Add bank account instead
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
