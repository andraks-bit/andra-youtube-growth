'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, ChevronLeft, CheckCircle, Users, Calendar, Ship, MessageSquare, Mail, Phone, Briefcase } from 'lucide-react'

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.10)'
const goldBorder = 'rgba(116,207,232,0.22)'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const INPUT = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  background: '#0a1523',
  border: `1px solid ${goldBorder}`,
  color: text,
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

export default function CorporatePage() {
  const [form, setForm] = useState({
    company: '',
    contact_name: '',
    email: '',
    phone: '',
    event_date: '',
    guests: '',
    boats_needed: '',
    event_type: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company || !form.email || !form.event_date || !form.guests) {
      setError('Please fill in all required fields.')
      return
    }
    setError('')
    setSubmitting(true)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error: dbErr } = await supabase.from('corporate_inquiries').insert({
        company_name: form.company,
        contact_name: form.contact_name,
        email: form.email,
        phone: form.phone || null,
        event_date: form.event_date,
        guests_count: parseInt(form.guests) || null,
        boats_needed: parseInt(form.boats_needed) || null,
        event_type: form.event_type || null,
        message: form.message || null,
        status: 'new',
      })

      // If table doesn't exist yet, still show success
      if (dbErr && !dbErr.message.includes('does not exist')) {
        throw new Error(dbErr.message)
      }

      setSubmitted(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ background: '#07101e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', color: text }}>
        <div style={{ textAlign: 'center', maxWidth: '460px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle style={{ width: 36, height: 36, color: '#22c55e' }} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '12px' }}>Enquiry received!</h1>
          <p style={{ fontSize: '15px', color: muted, lineHeight: 1.65, marginBottom: '32px' }}>
            Thank you for your corporate charter enquiry. Our team will review your requirements and get back to you within 4 business hours.
          </p>
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '20px', marginBottom: '28px', textAlign: 'left' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: gold, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: '12px' }}>Your enquiry summary</p>
            {[
              { label: 'Company', value: form.company },
              { label: 'Event date', value: form.event_date },
              { label: 'Guests', value: form.guests },
              { label: 'Boats needed', value: form.boats_needed || 'Not specified' },
              { label: 'Contact', value: form.email },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '13px', color: muted }}>{item.label}</span>
                <span style={{ fontSize: '13px', color: text, fontWeight: 600, textAlign: 'right' }}>{item.value}</span>
              </div>
            ))}
          </div>
          <Link href="/host/fleet" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', background: goldFaint, border: `1px solid ${goldBorder}`, color: gold, fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
            ← Fleet Manager
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 20px 80px' }}>

        <Link href="/host/fleet" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: muted, textDecoration: 'none', marginBottom: '28px' }}>
          <ChevronLeft style={{ width: 15, height: 15 }} /> Fleet Manager
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '36px' }}>
          <div style={{ width: 52, height: 52, borderRadius: '14px', background: goldFaint, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 style={{ width: 24, height: 24, color: gold }} />
          </div>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '4px' }}>Corporate charter enquiry</h1>
            <p style={{ fontSize: '14px', color: muted }}>Multi-boat events, team outings, and luxury group charters</p>
          </div>
        </div>

        {/* Value props */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '36px' }}>
          {[
            { Icon: Ship,          label: 'Multi-boat packages',  desc: 'Charter 2–10+ boats for one event' },
            { Icon: Users,         label: 'Groups up to 200+',    desc: 'Split across multiple vessels' },
            { Icon: Briefcase,     label: 'Dedicated coordinator', desc: 'Single point of contact' },
            { Icon: CheckCircle,   label: 'Custom itineraries',   desc: 'Tailored to your requirements' },
          ].map((item) => (
            <div key={item.label} style={{ padding: '16px', borderRadius: '12px', background: card, border: `1px solid ${border}` }}>
              <item.Icon style={{ width: 16, height: 16, color: gold, marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', fontWeight: 700, color: text, marginBottom: '3px' }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: muted }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Briefcase style={{ width: 16, height: 16, color: gold }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: text }}>Company details</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <Field label="Company name *">
                <input required value={form.company} onChange={set('company')} placeholder="Acme Corp" style={INPUT} />
              </Field>
              <Field label="Your name">
                <input value={form.contact_name} onChange={set('contact_name')} placeholder="Jane Smith" style={INPUT} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <Field label="Email *">
                <input required type="email" value={form.email} onChange={set('email')} placeholder="jane@company.com" style={{ ...INPUT, display: 'flex', alignItems: 'center' }} />
              </Field>
              <Field label="Phone">
                <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+34 600 000 000" style={INPUT} />
              </Field>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Calendar style={{ width: 16, height: 16, color: gold }} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: text }}>Event details</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <Field label="Event date *">
                  <input required type="date" value={form.event_date} onChange={set('event_date')} style={INPUT} />
                </Field>
                <Field label="Total guests *">
                  <input required type="number" min="1" max="1000" value={form.guests} onChange={set('guests')} placeholder="e.g. 60" style={INPUT} />
                </Field>
                <Field label="Boats needed">
                  <input type="number" min="1" max="20" value={form.boats_needed} onChange={set('boats_needed')} placeholder="e.g. 4" style={INPUT} />
                </Field>
              </div>

              <Field label="Event type">
                <select value={form.event_type} onChange={set('event_type')} style={INPUT}>
                  <option value="">Select event type…</option>
                  <option value="corporate_party">Corporate party</option>
                  <option value="team_building">Team building</option>
                  <option value="client_entertainment">Client entertainment</option>
                  <option value="product_launch">Product launch</option>
                  <option value="incentive_trip">Incentive trip</option>
                  <option value="conference_transfer">Conference / transfer</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>

            <Field label="Additional requirements">
              <textarea
                value={form.message}
                onChange={set('message')}
                rows={4}
                placeholder="Describe your requirements — catering preferences, preferred marinas, specific boat types, any special requests…"
                style={{ ...INPUT, resize: 'vertical' as const, lineHeight: 1.6 }}
              />
            </Field>

            {error && (
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 28px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '14px', fontWeight: 700, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, boxShadow: '0 4px 18px rgba(116,207,232,0.22)' }}
              >
                <MessageSquare style={{ width: 15, height: 15 }} />
                {submitting ? 'Sending enquiry…' : 'Send enquiry'}
              </button>
              <p style={{ fontSize: '12px', color: 'rgba(244,244,242,0.30)' }}>We reply within 4 business hours</p>
            </div>

          </div>
        </form>

        {/* Direct contact */}
        <div style={{ marginTop: '24px', padding: '20px', borderRadius: '14px', background: goldFaint, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: text, marginBottom: '4px' }}>Prefer to talk?</p>
            <p style={{ fontSize: '12px', color: muted }}>Our charter specialists are available 08:00–22:00 daily.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a href="https://wa.me/358400406194" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '99px', background: 'rgba(37,211,102,0.10)', border: '1px solid rgba(37,211,102,0.25)', color: '#5edb8a', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
              WhatsApp
            </a>
            <a href="mailto:corporate@boathire24.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '99px', background: goldFaint, border: `1px solid ${goldBorder}`, color: gold, fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
              <Mail style={{ width: 13, height: 13 }} /> Email us
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
