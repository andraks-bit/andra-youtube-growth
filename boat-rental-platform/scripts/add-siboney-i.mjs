#!/usr/bin/env node
// One-off: add the missing "Siboney I" to the WADADLI CATS lead, matching its
// 4 siblings (catamaran, price-on-request, Deep Water Harbour, managed host).
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }

const HOST = '72a6589c-d677-4720-b4c2-d1c69062c286'
const SUBMISSION = 'f07099e1-0600-42e7-8831-3ce6ede7ddaa' // WADADLI CATS
const LOCATION = '1c84cf40-095f-46f7-a15f-357a019214ff'   // Deep Water Harbour (St. John's)
const IMG = 'https://images.squarespace-cdn.com/content/v1/6922d47f02f31d51cd878c15/c5529d26-61db-4466-b10e-62a899b2b45e/LRb-0043-2-Large.jpg?format=2500w'

const row = {
  host_id: HOST, location_id: LOCATION, submission_id: SUBMISSION,
  name: 'Siboney I', slug: 'deep-water-harbour-st-john-s-siboney-i', status: 'active',
  tagline: 'The matriarch of Wadadli Cats — nostalgic Antiguan catamaran cruises',
  description: "The matriarch of Wadadli Cats, Siboney has been with us since the very beginning. Built in Antigua in the 80s, she's the smallest and slowest of the fleet but boasts a big heart and plenty of character. Siboney is perfect for intimate gatherings, family outings, and anyone seeking a nostalgic journey through Antiguan waters.",
  type: 'catamaran', capacity_pax: 8, departure_port: "Deep Water Harbour (St. John's)",
  min_hours: 2, pricing_type: 'hourly', includes_skipper: true,
  instant_book: false, cancellation_policy: 'flexible', updated_at: new Date().toISOString(),
}

const ins = await fetch(`${SB}/rest/v1/boats`, { method: 'POST', headers: { ...JH, Prefer: 'return=representation' }, body: JSON.stringify(row) })
if (!ins.ok) { console.error('insert failed:', await ins.text()); process.exit(1) }
const boatId = (await ins.json())[0].id
console.log('created boat', boatId)

// No pricing rows — price-on-request (enquiry form), same as the other 4.

const resp = await fetch(IMG, { headers: { 'User-Agent': 'Mozilla/5.0' } })
if (resp.ok) {
  const bytes = Buffer.from(await resp.arrayBuffer())
  const path = `boats/${boatId}/0.jpg`
  const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: bytes })
  if (up.ok) {
    const pub = `${SB}/storage/v1/object/public/boat-images/${path}`
    await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify([{ boat_id: boatId, storage_url: pub, alt: 'Siboney I — Wadadli Cats catamaran, Antigua', sort_order: 0, is_hero: true }]) })
    console.log('photo rehosted:', pub)
  } else console.error('upload failed:', await up.text())
} else console.error('image download failed:', resp.status)
console.log('done')
