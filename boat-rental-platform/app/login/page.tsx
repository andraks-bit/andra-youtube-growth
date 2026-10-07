'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/client'

const gold = '#74cfe8'
const goldBorder = 'rgba(116,207,232,0.28)'
const inputBg = 'rgba(255,255,255,0.05)'
const inputBorder = 'rgba(255,255,255,0.14)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

const inputStyle: React.CSSProperties = {
  background: inputBg,
  border: `1px solid ${inputBorder}`,
  borderRadius: '10px',
  color: text,
  fontSize: '15px',
  padding: '13px 16px',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.15s',
  WebkitAppearance: 'none',
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push(next)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    })
  }

  return (
    <div style={{ background: '#0c1828', border: '1px solid rgba(116,207,232,0.18)', borderRadius: '20px', padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px 20px', borderRadius: '10px', border: `1px solid ${inputBorder}`, background: inputBg, color: text, fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s', width: '100%' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = goldBorder }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = inputBorder }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.10)' }} />
        <span style={{ fontSize: '12px', color: muted, fontWeight: 500 }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.10)' }} />
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="email" style={{ fontSize: '13px', fontWeight: 600, color: text }}>Email</label>
          <input
            id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" required style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = goldBorder }}
            onBlur={(e) => { e.target.style.borderColor = inputBorder }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="password" style={{ fontSize: '13px', fontWeight: 600, color: text }}>Password</label>
          <input
            id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" required style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = goldBorder }}
            onBlur={(e) => { e.target.style.borderColor = inputBorder }}
          />
        </div>
        {error && (
          <p style={{ fontSize: '13px', color: '#f87171', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '10px', padding: '12px 16px', margin: 0 }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', border: 'none', boxShadow: '0 4px 18px rgba(116,207,232,0.25)', opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s' }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '14px', color: muted, margin: 0 }}>
        Don&apos;t have an account?{' '}
        <Link href={`/signup?next=${next}`} style={{ color: gold, fontWeight: 600, textDecoration: 'none' }}>
          Sign up
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: '#07101e' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <Link href="/" style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '20px' }}>
            <Logo size={72} />
          </Link>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#f4f4f2', marginBottom: '8px' }}>Welcome back</h1>
          <p style={{ fontSize: '15px', color: muted }}>Sign in to your BoatHire24 account</p>
        </div>
        <Suspense fallback={<div style={{ height: '340px', borderRadius: '20px', background: '#0c1828', border: '1px solid rgba(116,207,232,0.12)', animation: 'pulse 1.5s ease-in-out infinite' }} />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
