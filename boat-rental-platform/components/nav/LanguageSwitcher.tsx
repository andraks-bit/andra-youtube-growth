'use client'

import { useState, useEffect, useRef } from 'react'
import { Globe } from 'lucide-react'
import { LOCALES, type Locale } from '@/lib/i18n/translations'

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.10)'
const goldBorder = 'rgba(116,207,232,0.22)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<Locale>('en')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/)
    const val = match?.[1] as Locale
    if (LOCALES.find((l) => l.code === val)) setCurrent(val)

    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function selectLocale(code: Locale) {
    document.cookie = `locale=${code}; path=/; max-age=31536000; SameSite=Lax`
    setCurrent(code)
    setOpen(false)
    window.location.reload()
  }

  const active = LOCALES.find((l) => l.code === current) ?? LOCALES[0]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        title="Change language"
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '7px 12px', borderRadius: '99px',
          background: open ? goldFaint : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? goldBorder : 'rgba(255,255,255,0.12)'}`,
          color: open ? gold : muted,
          cursor: 'pointer', fontSize: '13px', fontWeight: 500,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!open) {
            ;(e.currentTarget as HTMLElement).style.borderColor = goldBorder
            ;(e.currentTarget as HTMLElement).style.color = gold
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'
            ;(e.currentTarget as HTMLElement).style.color = muted
          }
        }}
      >
        <Globe style={{ width: 14, height: 14 }} />
        <span>{active.flag}</span>
        <span className="hidden-mobile" style={{ fontSize: '12px' }}>{active.code.toUpperCase()}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: '180px', background: '#0c1828',
          border: `1px solid ${goldBorder}`, borderRadius: '14px',
          padding: '6px', zIndex: 100,
          boxShadow: '0 16px 48px rgba(0,0,0,0.60)',
        }}>
          {LOCALES.map((loc) => (
            <button
              key={loc.code}
              onClick={() => selectLocale(loc.code)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                padding: '9px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: current === loc.code ? goldFaint : 'transparent',
                color: current === loc.code ? gold : text,
                fontSize: '13px', fontWeight: current === loc.code ? 700 : 400,
                textAlign: 'left', transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (current !== loc.code)
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={(e) => {
                if (current !== loc.code)
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <span style={{ fontSize: '16px' }}>{loc.flag}</span>
              <span>{loc.name}</span>
              {current === loc.code && <span style={{ marginLeft: 'auto', fontSize: '11px' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
