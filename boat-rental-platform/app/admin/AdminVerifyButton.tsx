'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Trash2, X } from 'lucide-react'

const muted = 'rgba(244,244,242,0.55)'

export default function AdminVerifyButton({
  userId,
  currentStatus,
  isAdmin,
  userName,
}: {
  userId: string
  currentStatus: string
  isAdmin?: boolean
  userName?: string
}) {
  const [loading, setLoading] = useState<'verified' | 'rejected' | 'delete' | null>(null)
  const [showRejectNote, setShowRejectNote] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [note, setNote] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const router = useRouter()

  async function act(action: 'verified' | 'rejected', notes?: string) {
    setLoading(action)
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, notes }),
    })
    const json = await res.json()
    setLoading(null)
    setShowRejectNote(false)
    if (json.emailTo) {
      const msg = json.emailSent
        ? `✅ Email sent to ${json.emailTo}`
        : `⚠️ Status updated but email failed: ${json.emailError ?? 'unknown'}`
      alert(msg)
    }
    router.refresh()
  }

  async function deleteUser() {
    if (confirmText.toLowerCase() !== 'delete') return
    setLoading('delete')
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const json = await res.json()
    setLoading(null)
    if (!res.ok) {
      alert(`Delete failed: ${json.error ?? 'unknown'}`)
      return
    }
    setShowDelete(false)
    router.refresh()
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
        {currentStatus === 'verified' ? (
          <>
            <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>✓ Verified</span>
            <button
              onClick={() => act('rejected')}
              disabled={!!loading}
              style={{ fontSize: '11px', color: 'rgba(248,113,113,0.70)', background: 'none', border: '1px solid rgba(248,113,113,0.20)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
            >
              Revoke
            </button>
          </>
        ) : showRejectNote ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', minWidth: '220px' }}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for rejection (optional)…"
              rows={2}
              style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#0a1523', border: '1px solid rgba(248,113,113,0.30)', color: '#f4f4f2', fontSize: '12px', resize: 'vertical', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => act('rejected', note)}
                disabled={!!loading}
                style={{ padding: '6px 14px', borderRadius: '6px', background: 'rgba(248,113,113,0.14)', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                {loading === 'rejected' ? '…' : 'Reject'}
              </button>
              <button
                onClick={() => setShowRejectNote(false)}
                style={{ padding: '6px 10px', borderRadius: '6px', background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', color: muted, fontSize: '12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => act('verified')}
              disabled={!!loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '8px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.30)', color: '#22c55e', fontSize: '12px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
            >
              <CheckCircle style={{ width: 13, height: 13 }} />
              {loading === 'verified' ? '…' : 'Verify'}
            </button>
            <button
              onClick={() => setShowRejectNote(true)}
              disabled={!!loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.22)', color: '#f87171', fontSize: '12px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              <XCircle style={{ width: 13, height: 13 }} />
              Reject
            </button>
          </>
        )}

        {/* Delete button — hidden for admin rows */}
        {!isAdmin && (
          <button
            onClick={() => setShowDelete(true)}
            disabled={!!loading}
            title="Delete user permanently"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 8px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(244,244,242,0.40)', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
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
            <Trash2 style={{ width: 13, height: 13 }} />
          </button>
        )}
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDelete && (
        <div
          onClick={() => loading !== 'delete' && setShowDelete(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#0c1828', border: '1px solid rgba(248,113,113,0.30)', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '28px', position: 'relative' }}
          >
            <button
              onClick={() => setShowDelete(false)}
              disabled={loading === 'delete'}
              style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: muted, display: 'flex' }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>

            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(248,113,113,0.12)', border: '2px solid rgba(248,113,113,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <Trash2 style={{ width: 22, height: 22, color: '#f87171' }} />
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f4f4f2', marginBottom: '8px' }}>Delete user account</h2>
            <p style={{ fontSize: '14px', color: muted, lineHeight: 1.65, marginBottom: '18px' }}>
              This will permanently delete <strong style={{ color: '#f4f4f2' }}>{userName ?? 'this user'}</strong> along with all their boats, images, pricing, bookings, wishlists, and verification documents. <strong style={{ color: '#f87171' }}>This cannot be undone.</strong>
            </p>

            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Type "delete" to confirm
            </label>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.30)', color: '#f4f4f2', fontSize: '14px', outline: 'none', marginBottom: '20px', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDelete(false)}
                disabled={loading === 'delete'}
                style={{ padding: '10px 20px', borderRadius: '99px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: muted, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={deleteUser}
                disabled={confirmText.toLowerCase() !== 'delete' || loading === 'delete'}
                style={{ padding: '10px 22px', borderRadius: '99px', background: confirmText.toLowerCase() === 'delete' ? '#f87171' : 'rgba(248,113,113,0.20)', color: confirmText.toLowerCase() === 'delete' ? '#fff' : 'rgba(248,113,113,0.50)', fontSize: '13px', fontWeight: 700, border: 'none', cursor: confirmText.toLowerCase() !== 'delete' || loading === 'delete' ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
              >
                {loading === 'delete' ? 'Deleting…' : 'Permanently delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
