'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'

const muted = 'rgba(244,244,242,0.55)'

export default function DeleteListingButton({ boatId, boatName }: { boatId: string; boatName: string }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    setError('')
    const supabase = createClient()

    // Block deletion if active bookings exist
    const { data: active } = await supabase
      .from('bookings')
      .select('id')
      .eq('boat_id', boatId)
      .in('status', ['pending', 'confirmed'])
      .limit(1)

    if (active && active.length > 0) {
      setError('Has active bookings')
      setDeleting(false)
      setConfirming(false)
      return
    }

    // Delete child records in order
    await supabase.from('boat_images').delete().eq('boat_id', boatId)
    await supabase.from('boat_features').delete().eq('boat_id', boatId)
    await supabase.from('boat_pricing').delete().eq('boat_id', boatId)
    await supabase.from('availability').delete().eq('boat_id', boatId)
    await supabase.from('wishlists').delete().eq('boat_id', boatId)
    const { error: err } = await supabase.from('boats').delete().eq('id', boatId)

    if (err) {
      setError('Delete failed')
      setDeleting(false)
      return
    }

    router.refresh()
  }

  if (error) {
    return (
      <div
        style={{ display: 'inline-flex', alignItems: 'center', padding: '9px 10px', borderRadius: '8px', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.28)', fontSize: '11px', color: '#f87171', fontWeight: 600, cursor: 'pointer' }}
        onClick={() => setError('')}
        title={error}
      >
        <Trash2 style={{ width: 13, height: 13 }} />
      </div>
    )
  }

  if (confirming) {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '9px 12px', borderRadius: '8px', background: 'rgba(248,113,113,0.14)', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171', fontSize: '12px', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: deleting ? 0.6 : 1 }}
        >
          {deleting ? '…' : 'Delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '9px 10px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: muted, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`Delete "${boatName}"`}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '9px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.10)', background: 'transparent', color: 'rgba(244,244,242,0.40)', cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.10)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.30)'
        ;(e.currentTarget as HTMLElement).style.color = '#f87171'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.10)'
        ;(e.currentTarget as HTMLElement).style.color = 'rgba(244,244,242,0.40)'
      }}
    >
      <Trash2 style={{ width: 14, height: 14 }} />
    </button>
  )
}
