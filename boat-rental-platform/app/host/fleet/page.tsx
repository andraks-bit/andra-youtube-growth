import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Layers, Upload, Calendar, Building2, ArrowRight, Ship, BarChart3, CheckCircle, Clock, Globe } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Fleet Manager' }

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.10)'
const goldBorder = 'rgba(116,207,232,0.22)'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

export default async function FleetManagerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/host/fleet')

  const { data: boats } = await supabase
    .from('boats')
    .select('id, name, status, type, capacity_pax')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })

  const total = boats?.length ?? 0
  const active = boats?.filter((b) => b.status === 'active').length ?? 0
  const paused = boats?.filter((b) => b.status === 'paused').length ?? 0
  const draft = boats?.filter((b) => b.status === 'draft').length ?? 0
  const totalCapacity = boats?.reduce((sum, b) => sum + (b.capacity_pax ?? 0), 0) ?? 0

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '5px 14px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, marginBottom: '16px' }}>
            <Layers style={{ width: 12, height: 12 }} /> Fleet Manager
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: text, marginBottom: '8px' }}>Your fleet</h1>
              <p style={{ fontSize: '15px', color: muted }}>Bulk import listings, manage availability across all boats, and handle corporate charter requests.</p>
            </div>
            <Link
              href="/host/listings/new"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 18px rgba(116,207,232,0.22)', whiteSpace: 'nowrap' }}
            >
              + Add listing
            </Link>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '40px' }}>
          {[
            { label: 'Total boats',    value: total,                      Icon: Ship,        color: gold },
            { label: 'Active',         value: active,                     Icon: CheckCircle, color: '#22c55e' },
            { label: 'Paused / Draft', value: paused + draft,             Icon: Clock,       color: '#f59e0b' },
            { label: 'Total capacity', value: `${totalCapacity} pax`,     Icon: BarChart3,   color: gold },
          ].map((stat) => (
            <div key={stat.label} style={{ background: card, borderRadius: '16px', border: `1px solid ${border}`, padding: '20px' }}>
              <stat.Icon style={{ width: 18, height: 18, color: stat.color, marginBottom: '12px' }} />
              <div style={{ fontSize: '22px', fontWeight: 800, color: text, marginBottom: '4px' }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: muted }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Feature cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '52px' }}>
          {[
            {
              href: '/host/fleet/website',
              Icon: Globe,
              title: 'Import from your website',
              desc: 'Paste your company website and we import every boat automatically — specs, prices, descriptions and photos.',
              badge: 'AI-powered',
              badgeColor: '#a855f7',
            },
            {
              href: '/host/fleet/import',
              Icon: Upload,
              title: 'Bulk Import',
              desc: 'Upload a CSV to create multiple listings at once. Perfect for operators with 5+ vessels.',
              badge: 'CSV Upload',
              badgeColor: '#3b82f6',
            },
            {
              href: '/host/fleet/calendar',
              Icon: Calendar,
              title: 'Multi-boat Calendar',
              desc: 'View and manage availability across your entire fleet on a single Gantt-style calendar.',
              badge: 'All boats',
              badgeColor: '#22c55e',
            },
            {
              href: '/host/fleet/corporate',
              Icon: Building2,
              title: 'Corporate Events',
              desc: 'Handle multi-boat enquiries for corporate events, team outings, and luxury group charters.',
              badge: 'High-value',
              badgeColor: gold,
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ display: 'block', padding: '28px', borderRadius: '18px', background: card, border: `1px solid ${goldBorder}`, textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: goldFaint, border: `1px solid ${goldBorder}` }}>
                  <item.Icon style={{ width: 22, height: 22, color: gold }} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: `${item.badgeColor}18`, color: item.badgeColor, border: `1px solid ${item.badgeColor}38` }}>
                  {item.badge}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: text, marginBottom: '8px' }}>{item.title}</div>
              <p style={{ fontSize: '13px', color: muted, lineHeight: 1.65, margin: '0 0 20px' }}>{item.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: gold, fontWeight: 600 }}>
                Open <ArrowRight style={{ width: 14, height: 14 }} />
              </div>
            </Link>
          ))}
        </div>

        {/* ── Boat list ── */}
        {total > 0 ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: text }}>All listings</h2>
              <Link href="/host/listings" style={{ fontSize: '13px', color: gold, fontWeight: 600, textDecoration: 'none' }}>Manage →</Link>
            </div>
            <div style={{ background: card, borderRadius: '16px', border: `1px solid ${border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Name', 'Type', 'Capacity', 'Status', ''].map((h, i) => (
                      <th key={h + i} style={{ padding: '12px 16px', textAlign: i === 4 ? 'right' : 'left', fontWeight: 600, color: muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {boats!.map((boat, i) => {
                    const sc: Record<string, { color: string; bg: string; bd: string }> = {
                      active:  { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',    bd: 'rgba(34,197,94,0.28)' },
                      paused:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',   bd: 'rgba(245,158,11,0.28)' },
                      draft:   { color: muted,      bg: 'rgba(255,255,255,0.05)', bd: 'rgba(255,255,255,0.12)' },
                    }
                    const s = sc[boat.status] ?? sc.draft
                    return (
                      <tr key={boat.id} style={{ borderBottom: i < boats!.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <td style={{ padding: '14px 16px', color: text, fontWeight: 600 }}>{boat.name}</td>
                        <td style={{ padding: '14px 16px', color: muted, textTransform: 'capitalize' }}>{boat.type.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '14px 16px', color: muted }}>{boat.capacity_pax} pax</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: s.bg, color: s.color, border: `1px solid ${s.bd}` }}>
                            {boat.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <Link href={`/host/listings/${boat.id}`} style={{ fontSize: '12px', color: gold, fontWeight: 600, textDecoration: 'none' }}>Edit →</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: card, borderRadius: '20px', border: `2px dashed ${border}` }}>
            <Ship style={{ width: 48, height: 48, color: 'rgba(116,207,232,0.18)', margin: '0 auto 16px' }} />
            <p style={{ fontWeight: 700, fontSize: '16px', color: text, marginBottom: '8px' }}>No boats yet</p>
            <p style={{ fontSize: '14px', color: muted, marginBottom: '28px' }}>Add your first listing or use Bulk Import to add multiple boats at once.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/host/fleet/import" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
                <Upload style={{ width: 15, height: 15 }} /> Bulk import CSV
              </Link>
              <Link href="/host/listings/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', border: `1px solid ${goldBorder}`, color: gold, fontSize: '14px', fontWeight: 600, textDecoration: 'none', background: goldFaint }}>
                Add single boat
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
