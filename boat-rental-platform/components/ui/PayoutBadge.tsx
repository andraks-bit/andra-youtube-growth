export default function PayoutBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        padding: size === 'sm' ? '5px 12px' : '8px 18px',
        borderRadius: '99px',
        background: 'rgba(34,197,94,0.08)',
        border: '1px solid rgba(34,197,94,0.22)',
        color: '#5edb8a',
        fontSize: size === 'sm' ? '11px' : '13px',
        fontWeight: 600,
        whiteSpace: 'nowrap' as const,
      }}
    >
      ⚡ Host payouts released within 24h of trip completion
    </div>
  )
}
