'use client'

import Link from 'next/link'

interface TagChipProps {
  tag: string
  count: number
}

export default function TagChip({ tag, count }: TagChipProps) {
  return (
    <Link
      href={`/tags/${encodeURIComponent(tag)}`}
      className="group flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 hover:scale-105"
      style={{
        background: '#0c1828',
        border: '1px solid rgba(116,207,232,0.20)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.borderColor = 'rgba(116,207,232,0.50)'
        el.style.boxShadow = '0 0 0 1px rgba(116,207,232,0.20)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.borderColor = 'rgba(116,207,232,0.20)'
        el.style.boxShadow = 'none'
      }}
    >
      <span className="text-sm font-medium" style={{ color: '#f4f4f2' }}>
        #{tag}
      </span>
      <span
        className="text-xs font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: 'rgba(116,207,232,0.15)', color: '#74cfe8' }}
      >
        {count}
      </span>
    </Link>
  )
}
