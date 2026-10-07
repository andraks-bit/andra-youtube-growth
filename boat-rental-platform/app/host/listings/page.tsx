import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus, Settings, Eye, Calendar, ToggleLeft, ToggleRight } from 'lucide-react'

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.10)'
const goldBorder = 'rgba(116,207,232,0.22)'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  paused: '#f59e0b',
  draft: 'rgba(244,244,242,0.40)',
}
const STATUS_BG: Record<string, string> = {
  active: 'rgba(34,197,94,0.12)',
  paused: 'rgba(245,158,11,0.12)',
  draft: 'rgba(255,255,255,0.06)',
}

export default async function HostListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/host/listings')

  const { data: boats } = await supabase
    .from('boats')
    .select('id, name, slug, status, capacity_pax, type, length_m, boat_images(storage_url, is_hero)')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '6px' }}>My listings</h1>
            <p style={{ fontSize: '15px', color: muted }}>{boats?.length ?? 0} boat{boats?.length !== 1 ? 's' : ''} listed</p>
          </div>
          <Link href="/host/listings/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 18px rgba(116,207,232,0.22)', whiteSpace: 'nowrap' }}>
            <Plus style={{ width: 16, height: 16 }} /> Add listing
          </Link>
        </div>

        {!boats?.length ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: card, borderRadius: '16px', border: '2px dashed rgba(116,207,232,0.20)' }}>
            <p style={{ color: muted, fontSize: '15px', marginBottom: '20px' }}>No listings yet. Create your first to start earning.</p>
            <Link href="/host/listings/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', background: gold, color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
              <Plus style={{ width: 16, height: 16 }} /> Create a listing
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {boats.map((boat) => {
              const hero = (boat.boat_images as any[])?.find((i: any) => i.is_hero) ?? (boat.boat_images as any[])?.[0]
              const statusColor = STATUS_COLORS[boat.status] ?? muted
              const statusBg = STATUS_BG[boat.status] ?? 'rgba(255,255,255,0.06)'
              return (
                <div key={boat.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: card, border, borderRadius: '16px', padding: '16px', transition: 'border-color 0.15s' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', flexShrink: 0 }}>
                    {hero && <img src={hero.storage_url} alt={boat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, color: text, fontSize: '15px' }}>{boat.name}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: statusBg, color: statusColor }}>
                        {boat.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: muted }}>
                      {boat.type.replace('_', ' ')} · {boat.capacity_pax} guests{boat.length_m ? ` · ${boat.length_m}m` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <Link href={`/boats/${boat.slug}`} title="View listing" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', color: muted, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.10)' }}>
                      <Eye style={{ width: 15, height: 15 }} />
                    </Link>
                    <Link href={`/host/calendar?boat=${boat.id}`} title="Manage calendar" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', color: muted, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.10)' }}>
                      <Calendar style={{ width: 15, height: 15 }} />
                    </Link>
                    <Link href={`/host/listings/${boat.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', color: gold, fontSize: '13px', fontWeight: 600, textDecoration: 'none', background: goldFaint, border: `1px solid ${goldBorder}` }}>
                      <Settings style={{ width: 13, height: 13 }} /> Edit
                    </Link>
                    <form action={`/api/host/listings/${boat.id}/toggle`} method="POST">
                      <button
                        type="submit"
                        title={boat.status === 'active' ? 'Pause listing' : 'Activate listing'}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', cursor: 'pointer', color: boat.status === 'active' ? gold : muted }}
                      >
                        {boat.status === 'active'
                          ? <ToggleRight style={{ width: 20, height: 20 }} />
                          : <ToggleLeft style={{ width: 20, height: 20 }} />
                        }
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
