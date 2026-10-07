export interface BlogPost {
  slug:        string
  title:       string
  excerpt:     string
  tag:         string
  readTime:    string
  date:        string
  author:      string
  authorRole:  string
  heroImage:   string
  content:     string   // HTML string
  metaDescription?: string   // SEO search description (falls back to excerpt)
  boatSlug?:   string
  faqs?:       Array<{ q: string; a: string }>
}

export const POSTS: BlogPost[] = [
  /* ──────────────────────────────────────────────────────────────
     POST 1 — Marbella yacht rental guide (~700 words)
  ────────────────────────────────────────────────────────────── */
  {
    slug:       'ultimate-guide-renting-yacht-marbella',
    title:      'The Ultimate Guide to Renting a Yacht in Marbella',
    excerpt:    'Everything first-time charterers need to know — what to bring, what to expect from your skipper, how to read a weather window, and which departure port suits which itinerary on the Costa del Sol.',
    tag:        'Destination guide',
    readTime:   '8 min read',
    date:       'May 12, 2026',
    author:     'Andra Kiirkivi',
    authorRole: 'Co-Founder, BoatHire24',
    heroImage:  'https://images.unsplash.com/photo-1528154291023-a6525fabe5b4?w=1400&q=80',
    content: `
<p>Marbella is one of the finest charter destinations in the Mediterranean — and also one of the most misunderstood. First-time visitors often underestimate how different the experience is from a typical beach holiday. This guide covers everything you need to arrive at the marina confident, prepared, and ready to get the most out of every hour on the water.</p>

<h2>Choosing your departure port</h2>
<p>Marbella has two main departure points: <strong>Puerto Banús</strong> and <strong>Marbella Marina</strong>. For most day charters, Puerto Banús is the default — it has the widest range of vessels, the best facilities, and the most scenic motor into open water. Marbella Marina is quieter, slightly cheaper to berth, and better positioned if you plan to head east toward Nerja rather than west toward Gibraltar.</p>
<p>A third option is <strong>Benalmádena Marina</strong>, about 20 kilometres east along the coast. If your hotel is in Torremolinos or Fuengirola, starting from Benalmádena saves you a significant drive and puts you closer to the rocky coves east of Marbella that most charter guests never reach.</p>

<h2>What time should you leave?</h2>
<p>The Costa del Sol follows a reliable thermal wind pattern from June to September. Mornings are calm — flat water, offshore breezes, and the kind of mirror-glass visibility that makes the Sierra Nevada appear close enough to touch from the deck. By early afternoon, the Poniente (westerly) or Levante (easterly) fills in, typically between 10 and 18 knots. By late afternoon it usually drops again.</p>
<p>For this reason, most experienced skippers prefer a <strong>09:00 or 10:00 departure</strong> for a full-day charter. You get the calm morning water for swimming, snorkelling, and anchoring — and you're heading back into port as the afternoon wind builds rather than fighting it on the outward leg.</p>

<h2>What to bring — the complete packing list</h2>
<ul>
  <li><strong>Sunscreen, SPF 50 minimum.</strong> The sun reflects off the water and hits you from below as well as above. Reapply every two hours without fail.</li>
  <li><strong>A wide-brim hat.</strong> Baseball caps leave your ears and neck exposed. A full-brim hat — or a sailing cap with a neck flap — will save you significant discomfort on a long day.</li>
  <li><strong>Soft-sole, non-marking shoes.</strong> Deck shoes or barefoot. Hard-sole shoes mark gelcoat and can be slippery on wet surfaces.</li>
  <li><strong>A light windproof layer.</strong> The return journey in the late afternoon can feel surprisingly cool once you've been in the sun all day. A thin fleece or windbreaker takes up minimal space and you'll be glad to have it.</li>
  <li><strong>A waterproof phone case.</strong> Not optional. Salt spray finds its way into everything.</li>
  <li><strong>Cash for tips.</strong> Tipping your skipper is customary and appreciated — typically 10% of the charter fee for exceptional service.</li>
</ul>

<h2>Understanding your skipper</h2>
<p>Your skipper is not a tour guide — they're a licensed maritime professional responsible for the safety of everyone on board. A good skipper will brief you on the vessel, the safety equipment, and the plan for the day before you leave the dock. Listen carefully. They know this coast in intimate detail and their suggestions for anchoring spots, swimming stops, and timing are worth following.</p>
<p>The best charter experience comes from treating the skipper as a knowledgeable collaborator rather than a service worker. Tell them what kind of day you want — active and exploring, or relaxed and anchored — and let them design the route around the conditions.</p>

<h2>The best itineraries for a day charter from Marbella</h2>
<p><strong>The Eastern Run (Marbella → Nerja):</strong> Best for dramatic scenery. The coast east of Marbella is wilder and less developed, with limestone cliffs, sea caves, and hidden beaches that are only accessible by water. Allow a full eight hours for this route.</p>
<p><strong>The Western Loop (Puerto Banús → Estepona):</strong> Best for swimming and anchoring. The sea floor between Marbella and Estepona is sandy and shallow, ideal for anchoring out and spending two to three hours in the water. Several pristine beach clubs are accessible by tender.</p>
<p><strong>The Straight Shot (Puerto Banús → Gibraltar):</strong> Best for wildlife. Dolphins are almost guaranteed in the Strait of Gibraltar — the tidal flows concentrate food and the pod sizes can be extraordinary. Allow the full day and start early.</p>

<h2>Booking your charter</h2>
<p>The Marbella fleet on BoatHire24 runs from compact two-hour speedboat experiences at €230 to full-day superyacht charters at €4,700 and above. Every listing shows the real price from the first click. Filter by departure port, capacity, and date — your availability calendar updates in real time. Instant book is available on most vessels in the fleet.</p>
    `,
  },

  /* ──────────────────────────────────────────────────────────────
     POST 2 — Catamaran vs Motor Yacht (~600 words)
  ────────────────────────────────────────────────────────────── */
  {
    slug:       'catamaran-vs-motor-yacht',
    title:      'Catamaran vs Motor Yacht: Which Charter Suits Your Group?',
    excerpt:    'Two fundamentally different philosophies. Catamarans win on deck space and stability; motor yachts win on speed and amenity. We break down every trade-off by group size, budget, and occasion.',
    tag:        'Boat guide',
    readTime:   '6 min read',
    date:       'May 5, 2026',
    author:     'Andra Kiirkivi',
    authorRole: 'Co-Founder, BoatHire24',
    heroImage:  'https://images.unsplash.com/photo-1562281302-809108fd533c?w=1400&q=80',
    content: `
<p>It's the question every first-time charterer eventually asks: catamaran or motor yacht? The honest answer depends entirely on what you want from your day on the water. Both have genuine advantages — and understanding them will help you choose with confidence rather than guess.</p>

<h2>The case for a catamaran</h2>
<p>A catamaran's defining advantage is <strong>space</strong>. Two hulls mean a wide beam, and a wide beam means an enormous amount of usable deck area relative to overall length. A 45-foot catamaran will feel significantly larger than a 45-foot monohull motor yacht because the beam is typically 25 to 30 percent wider.</p>
<p>That space translates to social comfort. Large groups — families with children, birthday parties, corporate events — can spread out, find shade, find sun, and generally avoid the compressed feeling that comes with packing twelve people onto a motor yacht designed for ten.</p>
<p>The second advantage is <strong>stability</strong>. Twin hulls mean dramatically less roll than a monohull in any sea state. If you have guests who are prone to seasickness, or if you're planning to serve a sit-down lunch at anchor, a catamaran is the more comfortable choice. The motion is not the same as being on a large cruise ship — you still feel the sea — but it's considerably more predictable than a monohull.</p>
<p>Catamarans are also well-suited for <strong>extended anchoring</strong>. The bridge deck between the hulls creates a protected social space that stays dry in almost all conditions, and the wide anchor platform at the bow makes getting in and out of the water simple.</p>

<h2>The case for a motor yacht</h2>
<p>Motor yachts win on <strong>speed and range</strong>. A well-powered motor yacht will cover the distance from Puerto Banús to Gibraltar in under two hours. The same trip on a catamaran under sail takes most of the day. If your priority is reaching a specific destination — a particular beach, a seafood restaurant in another port, a dolphin-watching spot in the Strait — a motor yacht gets you there and back with time to spare.</p>
<p>Motor yachts also tend to offer <strong>superior interior amenity</strong> for their size. The hull form that makes them fast also allows for a deeper, more spacious interior — well-equipped galleys, proper shower facilities, and comfortable sleeping cabins if you're considering an overnight charter.</p>
<p>For smaller groups — couples, families of four or five, intimate celebrations — a motor yacht often feels more purposeful and premium. The focused layout suits the group rather than leaving you rattling around a wide-open deck designed for twice as many people.</p>

<h2>The deciding factors</h2>
<p><strong>Group size:</strong> Over ten guests, catamaran almost always wins on comfort. Under six, a motor yacht is the more intimate and polished choice.</p>
<p><strong>Sea conditions:</strong> If the forecast shows anything above Force 3, guests prone to motion sickness will be more comfortable on a catamaran. In flat, calm water, the difference is minimal.</p>
<p><strong>Itinerary ambition:</strong> Covering distance? Motor yacht. Anchoring out and swimming all day? Catamaran.</p>
<p><strong>Budget:</strong> For equivalent capacity, catamarans are typically priced 10 to 20 percent higher than motor yachts. The extra beam costs more to berth, more to maintain, and that's reflected in the charter rate.</p>

<h2>Our recommendation</h2>
<p>For a group of eight to twelve on a full-day social charter — birthday, hen party, corporate day out — we'd recommend a catamaran every time. For a couple or small family who want to cover some coastline and enjoy a polished, fast-moving day on the water, a motor yacht is the better fit. Both are outstanding charter experiences when matched to the right occasion.</p>
    `,
  },

  /* ──────────────────────────────────────────────────────────────
     POST 3 — Best anchorages Costa del Sol (~550 words)
  ────────────────────────────────────────────────────────────── */
  {
    slug:       'best-anchorages-costa-del-sol',
    title:      'Ten Anchorages on the Costa del Sol Only Reachable by Boat',
    excerpt:    'These spots don\'t appear on Google Maps and are completely inaccessible from shore. Compiled by BoatHire24\'s fleet captains who sail this coast every single week of the season.',
    tag:        'Insider knowledge',
    readTime:   '7 min read',
    date:       'April 28, 2026',
    author:     'Andra Kiirkivi',
    authorRole: 'Co-Founder, BoatHire24',
    heroImage:  'https://images.unsplash.com/photo-1625528193934-4cb230e7267d?w=1400&q=80',
    content: `
<p>The Costa del Sol has 160 kilometres of coastline. Perhaps forty kilometres of it is accessible from shore — by road, by path, by beach. The other 120 kilometres belongs entirely to those who arrive by water. These are ten of the best spots our captains return to every season.</p>

<h2>1. Cala del Pino (east of Marbella)</h2>
<p>A narrow cove flanked by pine trees running to the waterline. The bottom is sand over rock at three to five metres — perfect holding for anchor. No road access, no buildings visible from the water. Morning light here is extraordinary.</p>

<h2>2. La Herradura Bay (near Almuñécar)</h2>
<p>A protected bay with consistently calm water even when the Levante is blowing along the open coast. The village is visible from the anchorage and accessible by tender — good fish restaurants, cold beer, and a beach promenade. Best visited on a weekday.</p>

<h2>3. Punta de la Mona cliffs</h2>
<p>Not an anchorage — a drifting spot. The cliffs west of La Herradura drop vertically into 15 metres of crystalline water. Switch off the engine, drift slowly along the face, and look down through water so clear the rock detail is visible at depth. One of the most beautiful ten minutes you can have on this coast.</p>

<h2>4. Cala Sardina</h2>
<p>A tight cove that requires local knowledge to enter safely — there's a submerged rock at the mouth that claims props from the careless. Inside, the water is flat, shallow, and green-tinged from the reflected limestone. Snorkelling here is exceptional in July and August when the visibility reaches 20 metres.</p>

<h2>5. Playa del Cañuelo (Los Acantilados de Maro)</h2>
<p>Protected as a nature reserve. No facilities, no noise, no cars. The beach is accessible by a very long dirt path, which means the only people you encounter arriving by boat are the handful of walkers who made the two-hour trek. Park National waters — no anchoring on the seagrass, use the sandy patches to the west of the beach.</p>

<h2>6. Peñón del Cuervo (Málaga)</h2>
<p>A rocky islet just east of Málaga city that catches the current and concentrates fish. Our fishing charter captains rate the wrasse and sea bream fishing here as some of the best on the coast. Anchor to the lee side and let the current work for you.</p>

<h2>7 — 10. The Fuengirola reef system</h2>
<p>A series of low-profile underwater reefs stretching from Fuengirola east to Mijas that never break the surface. Invisible from shore, invisible from satellite imagery, known only to the captains who learned them from the generation before. The best snorkelling on the western Costa del Sol is directly above these reefs on a calm morning.</p>
<p>Our Marbella fleet captains know every one of these spots and will adjust the day's itinerary around conditions to make sure you reach the best one. When you book through BoatHire24 and your skipper asks what kind of day you want — tell them you want the spot tourists never find. They'll know exactly what to do.</p>
    `,
  },

  /* ──────────────────────────────────────────────────────────────
     POST 4 — Packing list (~450 words)
  ────────────────────────────────────────────────────────────── */
  {
    slug:       'perfect-boat-day-packing-list',
    title:      'How to Plan the Perfect Boat Day: The Complete Packing List',
    excerpt:    'From sunscreen to seasickness tablets — the definitive list of what to bring on a charter, built from thousands of guest days on the water across the BoatHire24 fleet.',
    tag:        'Charter tips',
    readTime:   '5 min read',
    date:       'April 20, 2026',
    author:     'Andra Kiirkivi',
    authorRole: 'Co-Founder, BoatHire24',
    heroImage:  'https://images.unsplash.com/photo-1523496922380-91d5afba98a3?w=1400&q=80',
    content: `
<p>After thousands of guest days on the water across our fleet, a consistent pattern emerges: the guests who have the best charters are the ones who arrived prepared. Not over-packed — prepared. This list is everything you need, nothing you don't.</p>

<h2>Sun protection (non-negotiable)</h2>
<ul>
  <li><strong>SPF 50 sunscreen — two bottles minimum.</strong> Reapply every 90 minutes. One bottle will not last a full day for a group. Buy waterproof formulation and don't skip your ears, the back of your neck, or the tops of your feet.</li>
  <li><strong>Wide-brim hat.</strong> The sun hits you from above and reflects up from the water below. A baseball cap covers the top of your head and nothing else. A wide-brim hat — 10cm of brim or more — covers your face, ears, and the back of your neck simultaneously.</li>
  <li><strong>UV-protective sunglasses.</strong> Six hours of sun-reflected glare off open water without eye protection will leave you with a headache that ruins the evening. Polarised lenses are a genuine advantage on the water.</li>
</ul>

<h2>Clothing</h2>
<ul>
  <li><strong>Swimwear (two sets if possible).</strong> Sitting in wet swimwear for eight hours is uncomfortable. A second set that dries while you wear the first is worth the extra bag space.</li>
  <li><strong>Soft-sole non-marking shoes.</strong> Deck shoes, flip-flops, or barefoot. Hard-soled shoes mark gelcoat and are slippery when wet.</li>
  <li><strong>Light windproof layer.</strong> The return journey in late afternoon, after a day of sun exposure, feels surprisingly cold once you're no longer moving. A thin fleece or wind jacket is genuinely useful even in July.</li>
</ul>

<h2>Technology and valuables</h2>
<ul>
  <li><strong>Waterproof phone case.</strong> Salt spray is invisible until it isn't. A dry bag or waterproof case costs three euros and saves a phone worth a thousand.</li>
  <li><strong>Portable power bank.</strong> A full day of photography, music, and navigation will drain a phone battery completely.</li>
  <li><strong>Leave the laptop at the hotel.</strong> The boat is a phone-and-camera day only.</li>
</ul>

<h2>Health</h2>
<ul>
  <li><strong>Seasickness tablets.</strong> Take them 30 minutes before departure, not after you start feeling unwell. Once motion sickness sets in, oral medication takes too long to act. Stugeron (cinnarizine) is the most effective over-the-counter option available in Spanish pharmacies.</li>
  <li><strong>Water — more than you think.</strong> Most boats carry drinks, but bring your own personal water bottle. Dehydration accelerates in sun and wind and mimics the symptoms of seasickness.</li>
</ul>

<h2>One last thing</h2>
<p>Tip your skipper. If they gave you an outstanding day — and they will — ten percent of the charter fee is the norm. Pay in cash, hand it to them personally when you step off at the dock. It matters more than you might think.</p>
    `,
  },
]

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug)
}

export function getAllSlugs(): string[] {
  return POSTS.map((p) => p.slug)
}

import { BOAT_POSTS_1 } from './boat-posts-1'
import { BOAT_POSTS_2 } from './boat-posts-2'
import autoPostsRaw from './auto-posts.json'

// Auto-generated posts (appended daily by scripts/generate_content.py)
export const AUTO_POSTS: BlogPost[] = autoPostsRaw as BlogPost[]

export const ALL_POSTS: BlogPost[] = [...POSTS, ...BOAT_POSTS_1, ...BOAT_POSTS_2, ...AUTO_POSTS]

export function getAllPost(slug: string): BlogPost | undefined {
  return ALL_POSTS.find((p) => p.slug === slug)
}

export function getAllPostSlugs(): string[] {
  return ALL_POSTS.map((p) => p.slug)
}
