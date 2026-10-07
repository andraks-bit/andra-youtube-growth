'use client'

import { XCircle } from 'lucide-react'

// Posts to the cancel API behind a native confirm() so a paid booking can't be
// cancelled by an accidental click. Used by both the renter (booking detail) and
// the host (bookings dashboard) — the API decides where to redirect afterwards.
export default function CancelBookingButton({
  bookingId,
  label = 'Cancel booking',
  confirmText = 'Cancel this booking? This frees the date. Any refund is handled separately.',
  full = false,
}: {
  bookingId: string
  label?: string
  confirmText?: string
  full?: boolean
}) {
  return (
    <form
      action={`/api/bookings/${bookingId}/cancel`}
      method="POST"
      onSubmit={(e) => { if (!window.confirm(confirmText)) e.preventDefault() }}
      style={full ? { width: '100%' } : undefined}
    >
      <button
        type="submit"
        style={{
          width: full ? '100%' : undefined,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: '11px 18px', borderRadius: '99px', background: 'transparent',
          border: '1px solid rgba(248,113,113,0.35)', color: 'rgba(248,113,113,0.95)',
          fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}
      >
        <XCircle style={{ width: 16, height: 16 }} /> {label}
      </button>
    </form>
  )
}
