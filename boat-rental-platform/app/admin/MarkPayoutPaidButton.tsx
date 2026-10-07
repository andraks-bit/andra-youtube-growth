'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Admin: mark a manual bank payout as paid (after sending the transfer).
export default function MarkPayoutPaidButton({ payoutId }: { payoutId: string }) {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function markPaid() {
    if (!confirm('Mark this payout as paid? The host gets a confirmation email.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/mark-payout-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId }),
      })
      if (!res.ok) alert((await res.json()).error ?? 'Failed')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={markPaid}
      disabled={busy}
      style={{
        padding: '6px 14px', borderRadius: '99px', border: '1px solid rgba(34,197,94,0.4)',
        background: 'rgba(34,197,94,0.10)', color: '#22c55e', fontSize: '12px', fontWeight: 700,
        cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? 'Saving…' : 'Mark paid'}
    </button>
  )
}
