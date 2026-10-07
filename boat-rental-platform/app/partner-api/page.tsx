import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Partner API — BoatHire24',
  description: 'Integrate a BoatHire24 fleet into your own site or system. Authenticate with a partner API key and fetch every active boat as JSON.',
  robots: { index: false, follow: false },
}

const gold = '#74cfe8'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.62)'
const dim = 'rgba(244,244,242,0.40)'
const card = 'rgba(255,255,255,0.04)'
const border = 'rgba(116,207,232,0.18)'

function Code({ children }: { children: string }) {
  return (
    <pre style={{ background: '#0a1422', border: `1px solid ${border}`, borderRadius: 12, padding: '16px 18px', overflowX: 'auto', fontSize: 13, lineHeight: 1.6, color: text, margin: '12px 0' }}>
      <code>{children}</code>
    </pre>
  )
}

const FIELDS: [string, string][] = [
  ['id', 'Unique boat identifier (UUID).'],
  ['name', 'Boat name.'],
  ['tagline', 'Short one-line description.'],
  ['description', 'Full description text.'],
  ['type', 'Boat type — e.g. motor_yacht, sailing, catamaran, rib, jet_ski.'],
  ['length_m', 'Length in metres.'],
  ['capacity', 'Maximum number of guests.'],
  ['cabins', 'Number of cabins.'],
  ['builder / model_year', 'Manufacturer and build year.'],
  ['location', '{ city, country } of the boat.'],
  ['departure_port', 'Marina / departure point.'],
  ['includes', '{ skipper, fuel, drinks } — what the price includes.'],
  ['min_hours', 'Minimum charter duration.'],
  ['cancellation_policy', 'flexible | moderate | strict | custom.'],
  ['features', 'Array of feature/amenity strings.'],
  ['images', 'Array of full-size photo URLs (hero first).'],
  ['pricing', 'Array of { duration_hours, price, currency } tiers.'],
  ['url', 'Public boathire24.com page for the boat.'],
]

export default function PartnerApiDocs() {
  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text, fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '56px 22px 96px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '5px 14px', borderRadius: 99, background: 'rgba(116,207,232,0.10)', color: gold, border: `1px solid ${border}`, marginBottom: 18 }}>
          🔌 Developer docs
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>BoatHire24 Partner API</h1>
        <p style={{ fontSize: 16, color: muted, lineHeight: 1.6, margin: '0 0 36px', maxWidth: 640 }}>
          Pull an operator&apos;s entire fleet into your own website, agency system, or app. One authenticated request returns every active boat — specs, photos, pricing and booking links — as clean JSON.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>Authentication</h2>
        <p style={{ fontSize: 15, color: muted, lineHeight: 1.7, margin: '0 0 8px' }}>
          Every request needs a <strong style={{ color: text }}>partner API key</strong> (provided by BoatHire24). A key is tied to one operator and grants read access to that operator&apos;s active fleet. Pass it as a Bearer token:
        </p>
        <Code>{`Authorization: Bearer YOUR_API_KEY`}</Code>
        <p style={{ fontSize: 14, color: dim, lineHeight: 1.6, margin: '0 0 36px' }}>
          Alternatively, pass it as a query parameter: <code style={{ color: gold }}>?api_key=YOUR_API_KEY</code>. Keep your key private — anyone with it can read the fleet. Keys can be revoked at any time.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>Endpoint</h2>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 16px', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#22c55e', background: 'rgba(34,197,94,0.12)', padding: '3px 9px', borderRadius: 6 }}>GET</span>
          <code style={{ fontSize: 14, color: text }}>https://boathire24.com/api/v1/boats</code>
        </div>
        <p style={{ fontSize: 15, color: muted, lineHeight: 1.7, margin: '0 0 8px' }}>
          Returns all <strong style={{ color: text }}>active</strong> boats for the operator the key belongs to. CORS is enabled (callable from a browser). Responses may be cached for up to 5 minutes.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '28px 0 8px' }}>Example request — cURL</h3>
        <Code>{`curl https://boathire24.com/api/v1/boats \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</Code>

        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 8px' }}>Example request — JavaScript</h3>
        <Code>{`const res = await fetch('https://boathire24.com/api/v1/boats', {
  headers: { Authorization: 'Bearer YOUR_API_KEY' },
});
const { count, boats } = await res.json();`}</Code>

        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '40px 0 10px' }}>Response</h2>
        <p style={{ fontSize: 15, color: muted, lineHeight: 1.7, margin: '0 0 4px' }}>
          A JSON object: <code style={{ color: gold }}>count</code> (number of boats) and <code style={{ color: gold }}>boats</code> (array). Each boat:
        </p>
        <Code>{`{
  "count": 29,
  "boats": [
    {
      "id": "1f4e2965-…",
      "name": "Azimut 58 — White",
      "tagline": "Luxury motor yacht in Marbella",
      "description": "…",
      "type": "motor_yacht",
      "length_m": 17.6,
      "capacity": 12,
      "cabins": 3,
      "builder": "Azimut",
      "model_year": 2019,
      "location": { "city": "Marbella", "country": "Spain" },
      "departure_port": "Puerto Banús, Marbella",
      "includes": { "skipper": true, "fuel": true, "drinks": false },
      "min_hours": 4,
      "cancellation_policy": "moderate",
      "features": ["Licensed skipper", "Sea toys", "…"],
      "images": ["https://…/hero.jpg", "https://…/2.jpg"],
      "pricing": [
        { "duration_hours": 4, "price": 2200, "currency": "EUR" },
        { "duration_hours": 8, "price": 3600, "currency": "EUR" }
      ],
      "url": "https://boathire24.com/boats/azimut-58-white"
    }
  ]
}`}</Code>

        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '28px 0 10px' }}>Fields</h3>
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
          {FIELDS.map(([f, d], i) => (
            <div key={f} style={{ display: 'flex', gap: 14, padding: '11px 16px', borderBottom: i < FIELDS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <code style={{ color: gold, fontSize: 13, minWidth: 170, flexShrink: 0 }}>{f}</code>
              <span style={{ color: muted, fontSize: 13.5, lineHeight: 1.5 }}>{d}</span>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '40px 0 10px' }}>Errors</h2>
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', fontSize: 14 }}>
          {[['200', 'Success — fleet returned.'], ['401', 'Missing, invalid, or revoked API key.'], ['500', 'Server error — retry shortly.']].map(([code, d], i) => (
            <div key={code} style={{ display: 'flex', gap: 14, padding: '11px 16px', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <code style={{ color: code === '200' ? '#22c55e' : '#f87171', minWidth: 50 }}>{code}</code>
              <span style={{ color: muted }}>{d}</span>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '40px 0 10px' }}>Notes for partners</h2>
        <ul style={{ color: muted, fontSize: 14.5, lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
          <li>Only <strong style={{ color: text }}>active</strong> boats are returned — listings in draft are excluded.</li>
          <li>Photos are full-size URLs you can hotlink or cache. The first image is the cover.</li>
          <li>Always link bookings back to each boat&apos;s <code style={{ color: gold }}>url</code> on boathire24.com.</li>
          <li>Data may change as the operator updates their fleet — re-fetch periodically (caching ~5 min is plenty).</li>
          <li>Need a key, a higher rate limit, or booking/webhook access? Contact <a href="mailto:info@boathire24.com" style={{ color: gold }}>info@boathire24.com</a>.</li>
        </ul>

        <p style={{ marginTop: 56, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: dim }}>
          © {new Date().getFullYear()} BoatHire24 · Partner API v1
        </p>
      </div>
    </div>
  )
}
