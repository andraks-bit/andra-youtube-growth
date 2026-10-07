import { Wallet, Anchor, ShieldCheck, CloudSun } from 'lucide-react'

// The all-inclusive / escrow promise, surfaced on the high-intent pages (boat,
// city, category, landing). This is a real differentiator vs Click&Boat's
// surprise-price + refund-friction complaints — so we say it plainly, everywhere.
const ITEMS = [
  { Icon: Wallet, text: 'The price you see is the price you pay — zero fees at checkout' },
  { Icon: Anchor, text: 'Licensed skipper, fuel & extras included' },
  { Icon: ShieldCheck, text: 'Funds held in escrow until 24h after your trip' },
  { Icon: CloudSun, text: 'Free weather cancellation' },
]

export default function TrustBar({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        border: '1px solid rgba(116,207,232,0.18)',
        background: 'rgba(116,207,232,0.05)',
        borderRadius: '14px',
        padding: '13px 18px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px 24px',
        justifyContent: 'center',
        ...style,
      }}
    >
      {ITEMS.map(({ Icon, text }) => (
        <span key={text} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(244,244,242,0.78)', fontWeight: 500 }}>
          <Icon style={{ width: 15, height: 15, color: '#74cfe8', flexShrink: 0 }} /> {text}
        </span>
      ))}
    </div>
  )
}
