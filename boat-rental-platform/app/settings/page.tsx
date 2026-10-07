'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User, Lock, Trash2, ChevronLeft, CheckCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { PhoneInput } from '@/components/ui/PhoneInput'

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.10)'
const goldBorder = 'rgba(116,207,232,0.22)'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

const INPUT: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '10px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)',
  color: text, fontSize: '14px', outline: 'none', boxSizing: 'border-box',
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ color: gold }}>{icon}</div>
        <span style={{ fontWeight: 700, fontSize: '15px', color: text }}>{title}</span>
      </div>
      <div style={{ padding: '24px' }}>{children}</div>
    </div>
  )
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div style={{ padding: '11px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, marginBottom: '16px', background: type === 'success' ? 'rgba(34,197,94,0.10)' : 'rgba(248,113,113,0.10)', border: `1px solid ${type === 'success' ? 'rgba(34,197,94,0.28)' : 'rgba(248,113,113,0.28)'}`, color: type === 'success' ? '#22c55e' : '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {type === 'success' ? <CheckCircle style={{ width: 15, height: 15, flexShrink: 0 }} /> : <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0 }} />}
      {msg}
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [hasPassword, setHasPassword] = useState(false)
  const [loading, setLoading] = useState(true)

  // Profile
  const [name, setName] = useState('')
  const [nameMsg, setNameMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [savingName, setSavingName] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [phone, setPhone] = useState('')

  // Password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [savingPw, setSavingPw] = useState(false)

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [showDeleteZone, setShowDeleteZone] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login?next=/settings'); return }
      setUser(data.user)
      setName(data.user.user_metadata?.full_name ?? '')
      setAvatarUrl(data.user.user_metadata?.avatar_url ?? '')
      setPhone(data.user.user_metadata?.phone ?? '')
      // Check if user has a password (email identity)
      const identities = data.user.identities ?? []
      setHasPassword(identities.some((id) => id.provider === 'email'))
      setLoading(false)
    })
  }, [])

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true)
    setNameMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload failed')
      setAvatarUrl(json.url)
      setNameMsg({ text: 'Profile picture updated.', type: 'success' })
    } catch (err: unknown) {
      setNameMsg({ text: err instanceof Error ? err.message : 'Upload failed', type: 'error' })
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSavingName(true)
    setNameMsg(null)
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim(), phone: phone.trim() } })
    if (!error) {
      await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', user!.id)
      setNameMsg({ text: 'Profile updated successfully.', type: 'success' })
    } else {
      setNameMsg({ text: error.message, type: 'error' })
    }
    setSavingName(false)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (newPw.length < 8) { setPwMsg({ text: 'Password must be at least 8 characters.', type: 'error' }); return }
    if (newPw !== confirmPw) { setPwMsg({ text: 'Passwords do not match.', type: 'error' }); return }
    setSavingPw(true)

    // For users with existing password, re-auth first
    if (hasPassword && currentPw) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user!.email!, password: currentPw,
      })
      if (signInErr) {
        setPwMsg({ text: 'Current password is incorrect.', type: 'error' })
        setSavingPw(false)
        return
      }
    }

    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (!error) {
      setPwMsg({ text: hasPassword ? 'Password changed successfully.' : 'Password set! You can now log in with email + password.', type: 'success' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setHasPassword(true)
    } else {
      setPwMsg({ text: error.message, type: 'error' })
    }
    setSavingPw(false)
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    setDeleteMsg(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')
      await fetch('/api/auth/signout', { method: 'POST' })
      window.location.replace('/')
    } catch (err: unknown) {
      setDeleteMsg({ text: err instanceof Error ? err.message : 'Delete failed', type: 'error' })
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ background: '#07101e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${goldFaint}`, borderTopColor: gold, animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px 80px' }}>

        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: muted, textDecoration: 'none', marginBottom: '28px' }}>
          <ChevronLeft style={{ width: 15, height: 15 }} /> Back
        </Link>

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '8px' }}>Account settings</h1>
        <p style={{ fontSize: '14px', color: muted, marginBottom: '32px' }}>{user?.email}</p>

        {/* ── Profile ── */}
        <Section title="Profile" icon={<User style={{ width: 17, height: 17 }} />}>
          <form onSubmit={saveName} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {nameMsg && <Toast msg={nameMsg.text} type={nameMsg.type} />}

            {/* Profile picture */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Profile picture</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(116,207,232,0.30)' }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '28px', fontWeight: 800, color: '#07101e' }}>{(name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}</span>
                  }
                </div>
                <div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: '99px', background: goldFaint, border: `1px solid ${goldBorder}`, color: gold, fontSize: '13px', fontWeight: 600, cursor: uploadingAvatar ? 'wait' : 'pointer' }}>
                    {uploadingAvatar ? 'Uploading…' : (avatarUrl ? 'Change picture' : 'Upload picture')}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingAvatar}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <p style={{ fontSize: '11px', color: 'rgba(244,244,242,0.35)', marginTop: '8px', marginBottom: 0 }}>JPG, PNG or WebP · max 5MB</p>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Display name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" style={INPUT} />
            </div>
            <div id="whatsapp" style={{ scrollMarginTop: '90px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Mobile / WhatsApp number</label>
              <PhoneInput value={phone} onChange={setPhone} />
              <p style={{ fontSize: '11px', color: 'rgba(244,244,242,0.35)', marginTop: '6px' }}>Used for instant booking alerts on WhatsApp. Pick your country code, then enter the number.</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Email</label>
              <input value={user?.email ?? ''} disabled style={{ ...INPUT, opacity: 0.5, cursor: 'not-allowed' }} />
              <p style={{ fontSize: '11px', color: 'rgba(244,244,242,0.30)', marginTop: '6px' }}>Email cannot be changed here. Contact support.</p>
            </div>
            <div>
              <button type="submit" disabled={savingName || !name.trim()} style={{ padding: '11px 24px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '13px', fontWeight: 700, border: 'none', cursor: savingName ? 'not-allowed' : 'pointer', opacity: savingName ? 0.7 : 1 }}>
                {savingName ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        </Section>

        {/* ── Password ── */}
        <Section
          title={hasPassword ? 'Change password' : 'Set a password'}
          icon={<Lock style={{ width: 17, height: 17 }} />}
        >
          {!hasPassword && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: goldFaint, border: `1px solid ${goldBorder}`, marginBottom: '20px', fontSize: '13px', color: muted, lineHeight: 1.6 }}>
              You signed up with Google. Set a password to also be able to log in with your email address.
            </div>
          )}
          <form onSubmit={savePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pwMsg && <Toast msg={pwMsg.text} type={pwMsg.type} />}

            {hasPassword && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Current password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" style={{ ...INPUT, paddingRight: '44px' }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: muted, cursor: 'pointer', padding: '4px' }}>
                    {showPw ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{hasPassword ? 'New password' : 'Password'}</label>
              <input type={showPw ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 8 characters" style={INPUT} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Confirm password</label>
              <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Repeat password" style={INPUT} />
            </div>

            {confirmPw && newPw && (
              <p style={{ fontSize: '12px', color: newPw === confirmPw ? '#22c55e' : '#f87171', marginTop: '-8px' }}>
                {newPw === confirmPw ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}

            <div>
              <button type="submit" disabled={savingPw || !newPw} style={{ padding: '11px 24px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: '13px', fontWeight: 700, border: 'none', cursor: savingPw || !newPw ? 'not-allowed' : 'pointer', opacity: savingPw || !newPw ? 0.6 : 1 }}>
                {savingPw ? 'Saving…' : hasPassword ? 'Change password' : 'Set password'}
              </button>
            </div>
          </form>
        </Section>

        {/* ── Delete account ── */}
        <div style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.20)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: showDeleteZone ? '1px solid rgba(248,113,113,0.15)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Trash2 style={{ width: 17, height: 17, color: '#f87171' }} />
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#f87171' }}>Delete account</span>
            </div>
            <button
              onClick={() => setShowDeleteZone(!showDeleteZone)}
              style={{ padding: '8px 16px', borderRadius: '99px', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.28)', color: '#f87171', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              {showDeleteZone ? 'Cancel' : 'Delete my account'}
            </button>
          </div>

          {showDeleteZone && (
            <div style={{ padding: '24px' }}>
              {deleteMsg && <Toast msg={deleteMsg.text} type={deleteMsg.type} />}
              <p style={{ fontSize: '14px', color: muted, lineHeight: 1.65, marginBottom: '20px' }}>
                This permanently deletes your account, all listings, and all data. <strong style={{ color: text }}>This cannot be undone.</strong>
              </p>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Type DELETE to confirm
                </label>
                <input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  style={{ ...INPUT, border: '1px solid rgba(248,113,113,0.30)', background: 'rgba(248,113,113,0.05)' }}
                />
              </div>
              <button
                onClick={deleteAccount}
                disabled={deleteConfirm !== 'DELETE' || deleting}
                style={{ padding: '11px 24px', borderRadius: '99px', background: deleteConfirm === 'DELETE' ? '#f87171' : 'rgba(248,113,113,0.20)', color: deleteConfirm === 'DELETE' ? '#fff' : 'rgba(248,113,113,0.50)', fontSize: '13px', fontWeight: 700, border: 'none', cursor: deleteConfirm !== 'DELETE' || deleting ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
              >
                {deleting ? 'Deleting…' : 'Permanently delete account'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
