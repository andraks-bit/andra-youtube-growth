'use client'

import { useEffect, useState } from 'react'

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function onScroll() {
      const el = document.documentElement
      const scrollTop = el.scrollTop || document.body.scrollTop
      const height = el.scrollHeight - el.clientHeight
      if (height <= 0) return
      setProgress(Math.min(100, Math.round((scrollTop / height) * 100)))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] h-[3px] pointer-events-none"
      style={{ background: 'rgba(7,16,30,0.0)' }}
    >
      <div
        className="h-full transition-all duration-75"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #74cfe8 0%, #8fdcf0 60%, #e8c870 100%)',
          boxShadow: '0 0 8px rgba(116,207,232,0.6)',
        }}
      />
    </div>
  )
}
