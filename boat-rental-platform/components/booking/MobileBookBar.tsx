'use client'

// Fixed bottom bar on phone-width screens — on mobile the booking widget
// renders below ALL page content, so without this the price and CTA are
// several screens under the fold.
export default function MobileBookBar({ fromPrice, currency, priceOnRequest }: {
  fromPrice: number | null
  currency: string
  priceOnRequest: boolean
}) {
  const sym = currency === 'EUR' ? '€' : currency + ' '
  function scrollToBook() {
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <>
      <div className="mobile-book-bar" style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
        display: 'none', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
        background: 'rgba(7,16,30,0.96)', backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(116,207,232,0.25)',
      }}>
        <div style={{ minWidth: 0 }}>
          {priceOnRequest || !fromPrice ? (
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f4f4f2' }}>Price on request</span>
          ) : (
            <>
              <span style={{ fontSize: 11, color: 'rgba(244,244,242,0.55)', display: 'block' }}>From</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#74cfe8' }}>{sym}{fromPrice.toLocaleString('en')}</span>
            </>
          )}
        </div>
        <button onClick={scrollToBook} style={{
          flexShrink: 0, padding: '12px 26px', borderRadius: 99, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontSize: 14, fontWeight: 800,
        }}>
          {priceOnRequest ? 'Send enquiry' : 'Request to book'}
        </button>
      </div>
      <style>{`@media (max-width: 900px) { .mobile-book-bar { display: flex !important; } body { padding-bottom: 76px; } }`}</style>
    </>
  )
}
