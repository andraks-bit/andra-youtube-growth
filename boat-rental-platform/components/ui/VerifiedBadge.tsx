/**
 * VerifiedBadge — shown on boats whose host has verification_status = 'verified'.
 *
 * Three variants:
 *   - 'seal'  : compact gold rosette/checkmark medallion (for boat cards, tight spaces)
 *   - 'pill'  : gold pill with shield + "Verified Owner" label (for detail pages)
 *   - 'inline': small inline check + text (for lists/rows)
 */

const gold = '#74cfe8'

export default function VerifiedBadge({
  variant = 'pill',
  size = 'md',
}: {
  variant?: 'seal' | 'pill' | 'inline'
  size?: 'sm' | 'md'
}) {
  // ── Variant 1: compact gold seal (rosette) ──
  if (variant === 'seal') {
    const d = size === 'sm' ? 22 : 28
    return (
      <span
        title="Verified owner"
        aria-label="Verified owner"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: d,
          height: d,
          flexShrink: 0,
        }}
      >
        <svg width={d} height={d} viewBox="0 0 32 32" fill="none">
          {/* Rosette / scalloped seal */}
          <path
            d="M16 1.5l3.1 2.2 3.8-.4 1.7 3.4 3.4 1.7-.4 3.8 2.2 3.1-2.2 3.1.4 3.8-3.4 1.7-1.7 3.4-3.8-.4L16 30.5l-3.1-2.2-3.8.4-1.7-3.4-3.4-1.7.4-3.8L2.2 16l2.2-3.1-.4-3.8 3.4-1.7 1.7-3.4 3.8.4L16 1.5z"
            fill="url(#vgrad)"
            stroke="#4fb8d6"
            strokeWidth="0.5"
          />
          {/* Checkmark */}
          <path
            d="M11 16.2l3.2 3.2L21 12.5"
            stroke="#07101e"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <defs>
            <linearGradient id="vgrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e7cd7f" />
              <stop offset="0.5" stopColor="#74cfe8" />
              <stop offset="1" stopColor="#a8842c" />
            </linearGradient>
          </defs>
        </svg>
      </span>
    )
  }

  // ── Variant 3: inline check + text ──
  if (variant === 'inline') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: size === 'sm' ? '11px' : '12px',
          fontWeight: 700,
          color: gold,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill={gold} />
          <path d="M7 12.5l3.2 3.2L17 9" stroke="#07101e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        Verified
      </span>
    )
  }

  // ── Variant 2 (default): gold pill with shield + label ──
  const pad = size === 'sm' ? '4px 10px' : '6px 13px'
  const fs = size === 'sm' ? '11px' : '12px'
  const ic = size === 'sm' ? 13 : 15
  return (
    <span
      title="This boat's owner has been verified by BoatHire24"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: pad,
        borderRadius: '99px',
        background: 'linear-gradient(135deg, rgba(116,207,232,0.16), rgba(116,207,232,0.08))',
        border: '1px solid rgba(116,207,232,0.38)',
        color: gold,
        fontSize: fs,
        fontWeight: 700,
        whiteSpace: 'nowrap' as const,
        letterSpacing: '0.01em',
        boxShadow: '0 1px 6px rgba(116,207,232,0.14)',
      }}
    >
      {/* Shield with check */}
      <svg width={ic} height={ic} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l7 3v6c0 4.5-3 8.3-7 9.5C8 19.3 5 15.5 5 11V5l7-3z"
          fill="url(#shgrad)"
          stroke="#4fb8d6"
          strokeWidth="0.5"
        />
        <path d="M8.5 12l2.3 2.3L15.5 9.5" stroke="#07101e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <defs>
          <linearGradient id="shgrad" x1="5" y1="2" x2="19" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e7cd7f" />
            <stop offset="0.6" stopColor="#74cfe8" />
            <stop offset="1" stopColor="#a8842c" />
          </linearGradient>
        </defs>
      </svg>
      Verified Owner
    </span>
  )
}
