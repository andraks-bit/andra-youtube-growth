import BoatCard from '@/components/search/BoatCard'
import type { BoatWithDetails } from '@/types/database'

const gold = '#74cfe8'

// Internal-link rail of sibling boats — spreads crawl equity through the location
// silo and cross-sells when the boat a visitor landed on is booked/unavailable.
export default function RelatedBoats({
  title,
  boats,
  viewAll,
}: {
  title: string
  boats: BoatWithDetails[]
  viewAll?: { href: string; label: string }
}) {
  if (!boats.length) return null
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f4f4f2' }}>{title}</h2>
        {viewAll && (
          <a href={viewAll.href} style={{ fontSize: '13px', fontWeight: 600, color: gold, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {viewAll.label} →
          </a>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
        {boats.slice(0, 4).map((b) => <BoatCard key={b.id} boat={b} />)}
      </div>
    </section>
  )
}
