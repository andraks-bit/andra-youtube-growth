import { readFileSync as __rfEnv } from 'node:fs'
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { try { for (const __l of __rfEnv(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const __m = __l.match(/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+?)\s*$/); if (__m) { process.env.SUPABASE_SERVICE_ROLE_KEY = __m[1].replace(/^['"]|['"]$/g, ''); break } } } catch {} }
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY (set it in .env.local or the environment).'); process.exit(1) }

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xluprzxpuoryiwvxhfgw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const locations = [
  // Spain
  { slug: 'marbella',      name: 'Marbella',           city: 'Marbella',         country: 'Spain',          country_code: 'ES', lat: 36.5108,  lng: -4.8850  },
  { slug: 'ibiza',         name: 'Ibiza',               city: 'Ibiza',            country: 'Spain',          country_code: 'ES', lat: 38.9067,  lng: 1.4206   },
  { slug: 'palma',         name: 'Palma de Mallorca',   city: 'Palma',            country: 'Spain',          country_code: 'ES', lat: 39.5696,  lng: 2.6502   },
  { slug: 'barcelona',     name: 'Barcelona',           city: 'Barcelona',        country: 'Spain',          country_code: 'ES', lat: 41.3851,  lng: 2.1734   },
  { slug: 'valencia',      name: 'Valencia',            city: 'Valencia',         country: 'Spain',          country_code: 'ES', lat: 39.4699,  lng: -0.3763  },
  { slug: 'menorca',       name: 'Menorca',             city: 'Mahón',            country: 'Spain',          country_code: 'ES', lat: 39.8879,  lng: 4.2649   },
  { slug: 'formentera',    name: 'Formentera',          city: 'Formentera',       country: 'Spain',          country_code: 'ES', lat: 38.7016,  lng: 1.4520   },
  { slug: 'tenerife',      name: 'Tenerife',            city: 'Santa Cruz',       country: 'Spain',          country_code: 'ES', lat: 28.4636,  lng: -16.2518 },
  // Greece
  { slug: 'athens',        name: 'Athens',              city: 'Athens',           country: 'Greece',         country_code: 'GR', lat: 37.9755,  lng: 23.7348  },
  { slug: 'mykonos',       name: 'Mykonos',             city: 'Mykonos',          country: 'Greece',         country_code: 'GR', lat: 37.4467,  lng: 25.3289  },
  { slug: 'santorini',     name: 'Santorini',           city: 'Fira',             country: 'Greece',         country_code: 'GR', lat: 36.3932,  lng: 25.4615  },
  { slug: 'corfu',         name: 'Corfu',               city: 'Corfu Town',       country: 'Greece',         country_code: 'GR', lat: 39.6243,  lng: 19.9217  },
  { slug: 'rhodes',        name: 'Rhodes',              city: 'Rhodes Town',      country: 'Greece',         country_code: 'GR', lat: 36.4341,  lng: 28.2176  },
  { slug: 'zakynthos',     name: 'Zakynthos',           city: 'Zakynthos',        country: 'Greece',         country_code: 'GR', lat: 37.7906,  lng: 20.9042  },
  { slug: 'lefkada',       name: 'Lefkada',             city: 'Lefkada',          country: 'Greece',         country_code: 'GR', lat: 38.7178,  lng: 20.6430  },
  { slug: 'thessaloniki',  name: 'Thessaloniki',        city: 'Thessaloniki',     country: 'Greece',         country_code: 'GR', lat: 40.6401,  lng: 22.9444  },
  // Italy
  { slug: 'amalfi-coast',  name: 'Amalfi Coast',        city: 'Positano',         country: 'Italy',          country_code: 'IT', lat: 40.6282,  lng: 14.4846  },
  { slug: 'sicily',        name: 'Sicily',              city: 'Palermo',          country: 'Italy',          country_code: 'IT', lat: 38.1157,  lng: 13.3615  },
  { slug: 'sardinia',      name: 'Sardinia',            city: 'Porto Cervo',      country: 'Italy',          country_code: 'IT', lat: 41.1309,  lng: 9.5372   },
  { slug: 'venice',        name: 'Venice',              city: 'Venice',           country: 'Italy',          country_code: 'IT', lat: 45.4408,  lng: 12.3155  },
  { slug: 'naples',        name: 'Naples',              city: 'Naples',           country: 'Italy',          country_code: 'IT', lat: 40.8518,  lng: 14.2681  },
  { slug: 'capri',         name: 'Capri',               city: 'Capri',            country: 'Italy',          country_code: 'IT', lat: 40.5531,  lng: 14.2421  },
  // France
  { slug: 'cannes',        name: 'Cannes',              city: 'Cannes',           country: 'France',         country_code: 'FR', lat: 43.5528,  lng: 7.0174   },
  { slug: 'nice',          name: 'Nice',                city: 'Nice',             country: 'France',         country_code: 'FR', lat: 43.7102,  lng: 7.2620   },
  { slug: 'saint-tropez',  name: 'Saint-Tropez',        city: 'Saint-Tropez',     country: 'France',         country_code: 'FR', lat: 43.2727,  lng: 6.6407   },
  { slug: 'monaco',        name: 'Monaco',              city: 'Monaco',           country: 'Monaco',         country_code: 'MC', lat: 43.7384,  lng: 7.4246   },
  { slug: 'marseille',     name: 'Marseille',           city: 'Marseille',        country: 'France',         country_code: 'FR', lat: 43.2965,  lng: 5.3698   },
  // Croatia
  { slug: 'dubrovnik',     name: 'Dubrovnik',           city: 'Dubrovnik',        country: 'Croatia',        country_code: 'HR', lat: 42.6507,  lng: 18.0944  },
  { slug: 'split',         name: 'Split',               city: 'Split',            country: 'Croatia',        country_code: 'HR', lat: 43.5081,  lng: 16.4402  },
  { slug: 'hvar',          name: 'Hvar',                city: 'Hvar Town',        country: 'Croatia',        country_code: 'HR', lat: 43.1729,  lng: 16.4412  },
  { slug: 'zadar',         name: 'Zadar',               city: 'Zadar',            country: 'Croatia',        country_code: 'HR', lat: 44.1194,  lng: 15.2314  },
  // Turkey
  { slug: 'bodrum',        name: 'Bodrum',              city: 'Bodrum',           country: 'Turkey',         country_code: 'TR', lat: 37.0344,  lng: 27.4305  },
  { slug: 'antalya',       name: 'Antalya',             city: 'Antalya',          country: 'Turkey',         country_code: 'TR', lat: 36.8969,  lng: 30.7133  },
  { slug: 'fethiye',       name: 'Fethiye',             city: 'Fethiye',          country: 'Turkey',         country_code: 'TR', lat: 36.6220,  lng: 29.1117  },
  { slug: 'marmaris',      name: 'Marmaris',            city: 'Marmaris',         country: 'Turkey',         country_code: 'TR', lat: 36.8551,  lng: 28.2716  },
  // Portugal
  { slug: 'lisbon',        name: 'Lisbon',              city: 'Lisbon',           country: 'Portugal',       country_code: 'PT', lat: 38.7223,  lng: -9.1393  },
  { slug: 'algarve',       name: 'Algarve',             city: 'Lagos',            country: 'Portugal',       country_code: 'PT', lat: 37.1029,  lng: -8.6738  },
  { slug: 'madeira',       name: 'Madeira',             city: 'Funchal',          country: 'Portugal',       country_code: 'PT', lat: 32.6669,  lng: -16.9241 },
  // UK
  { slug: 'london-thames', name: 'London',              city: 'London',           country: 'United Kingdom', country_code: 'GB', lat: 51.5074,  lng: -0.1278  },
  { slug: 'cornwall',      name: 'Cornwall',            city: 'Falmouth',         country: 'United Kingdom', country_code: 'GB', lat: 50.1526,  lng: -5.0669  },
  // Caribbean
  { slug: 'st-barts',      name: 'Saint Barthélemy',    city: 'Gustavia',         country: 'Saint Barthélemy', country_code: 'BL', lat: 17.8978, lng: -62.8508 },
  { slug: 'st-maarten',    name: 'Sint Maarten',        city: 'Philipsburg',      country: 'Sint Maarten',   country_code: 'SX', lat: 18.0237, lng: -63.0458  },
  { slug: 'barbados',      name: 'Barbados',            city: 'Bridgetown',       country: 'Barbados',       country_code: 'BB', lat: 13.0969,  lng: -59.6145 },
  { slug: 'bvi',           name: 'British Virgin Islands', city: 'Road Town',    country: 'British Virgin Islands', country_code: 'VG', lat: 18.4264, lng: -64.6199 },
  { slug: 'st-lucia',      name: 'Saint Lucia',         city: 'Castries',        country: 'Saint Lucia',    country_code: 'LC', lat: 13.9094,  lng: -60.9789 },
  { slug: 'antigua',       name: 'Antigua',             city: 'St. John\'s',     country: 'Antigua and Barbuda', country_code: 'AG', lat: 17.1175, lng: -61.8456 },
  { slug: 'jamaica',       name: 'Jamaica',             city: 'Montego Bay',     country: 'Jamaica',        country_code: 'JM', lat: 18.4762,  lng: -77.8939 },
  { slug: 'bahamas',       name: 'Bahamas',             city: 'Nassau',          country: 'Bahamas',        country_code: 'BS', lat: 25.0343,  lng: -77.3963 },
  // USA
  { slug: 'miami',         name: 'Miami',               city: 'Miami',           country: 'United States',  country_code: 'US', lat: 25.7617,  lng: -80.1918 },
  { slug: 'fort-lauderdale', name: 'Fort Lauderdale',   city: 'Fort Lauderdale', country: 'United States',  country_code: 'US', lat: 26.1224,  lng: -80.1373 },
  { slug: 'new-york',      name: 'New York',            city: 'New York',        country: 'United States',  country_code: 'US', lat: 40.7128,  lng: -74.0060 },
  { slug: 'san-diego',     name: 'San Diego',           city: 'San Diego',       country: 'United States',  country_code: 'US', lat: 32.7157,  lng: -117.1611},
  { slug: 'seattle',       name: 'Seattle',             city: 'Seattle',         country: 'United States',  country_code: 'US', lat: 47.6062,  lng: -122.3321},
  { slug: 'newport-ri',    name: 'Newport',             city: 'Newport',         country: 'United States',  country_code: 'US', lat: 41.4901,  lng: -71.3128 },
  { slug: 'key-west',      name: 'Key West',            city: 'Key West',        country: 'United States',  country_code: 'US', lat: 24.5551,  lng: -81.7800 },
  // Australia
  { slug: 'sydney',        name: 'Sydney',              city: 'Sydney',          country: 'Australia',      country_code: 'AU', lat: -33.8688, lng: 151.2093 },
  { slug: 'whitsundays',   name: 'Whitsundays',         city: 'Airlie Beach',    country: 'Australia',      country_code: 'AU', lat: -20.2671, lng: 148.7182 },
  { slug: 'gold-coast',    name: 'Gold Coast',          city: 'Gold Coast',      country: 'Australia',      country_code: 'AU', lat: -28.0167, lng: 153.4000 },
  // Thailand
  { slug: 'phuket',        name: 'Phuket',              city: 'Phuket',          country: 'Thailand',       country_code: 'TH', lat: 7.8804,   lng: 98.3923  },
  { slug: 'koh-samui',     name: 'Koh Samui',           city: 'Koh Samui',       country: 'Thailand',       country_code: 'TH', lat: 9.5120,   lng: 100.0136 },
  // UAE
  { slug: 'dubai',         name: 'Dubai',               city: 'Dubai',           country: 'UAE',            country_code: 'AE', lat: 25.2048,  lng: 55.2708  },
  { slug: 'abu-dhabi',     name: 'Abu Dhabi',           city: 'Abu Dhabi',       country: 'UAE',            country_code: 'AE', lat: 24.4539,  lng: 54.3773  },
  // Malta
  { slug: 'malta',         name: 'Malta',               city: 'Valletta',        country: 'Malta',          country_code: 'MT', lat: 35.8997,  lng: 14.5147  },
  // Montenegro
  { slug: 'kotor',         name: 'Kotor',               city: 'Kotor',           country: 'Montenegro',     country_code: 'ME', lat: 42.4250,  lng: 18.7714  },
  // New Zealand
  { slug: 'auckland',      name: 'Auckland',            city: 'Auckland',        country: 'New Zealand',    country_code: 'NZ', lat: -36.8485, lng: 174.7633 },
  // Mexico
  { slug: 'cancun',        name: 'Cancún',              city: 'Cancún',          country: 'Mexico',         country_code: 'MX', lat: 21.1619,  lng: -86.8515 },
  { slug: 'los-cabos',     name: 'Los Cabos',           city: 'Cabo San Lucas',  country: 'Mexico',         country_code: 'MX', lat: 22.8905,  lng: -109.9167},
  // Maldives
  { slug: 'maldives',      name: 'Maldives',            city: 'Malé',            country: 'Maldives',       country_code: 'MV', lat: 4.1755,   lng: 73.5093  },
  // Seychelles
  { slug: 'seychelles',    name: 'Seychelles',          city: 'Victoria',        country: 'Seychelles',     country_code: 'SC', lat: -4.6796,  lng: 55.4920  },
  // Netherlands
  { slug: 'amsterdam',     name: 'Amsterdam',           city: 'Amsterdam',       country: 'Netherlands',    country_code: 'NL', lat: 52.3676,  lng: 4.9041   },
  // Sweden
  { slug: 'stockholm',     name: 'Stockholm Archipelago', city: 'Stockholm',    country: 'Sweden',          country_code: 'SE', lat: 59.3293,  lng: 18.0686  },
  // Norway
  { slug: 'oslo-fjord',    name: 'Oslo Fjord',          city: 'Oslo',            country: 'Norway',         country_code: 'NO', lat: 59.9139,  lng: 10.7522  },
  // Canada
  { slug: 'vancouver',     name: 'Vancouver',           city: 'Vancouver',       country: 'Canada',         country_code: 'CA', lat: 49.2827,  lng: -123.1207},
  { slug: 'toronto',       name: 'Toronto',             city: 'Toronto',         country: 'Canada',         country_code: 'CA', lat: 43.6532,  lng: -79.3832 },
  // Brazil
  { slug: 'rio-de-janeiro',name: 'Rio de Janeiro',      city: 'Rio de Janeiro',  country: 'Brazil',         country_code: 'BR', lat: -22.9068, lng: -43.1729 },
  // South Africa
  { slug: 'cape-town',     name: 'Cape Town',           city: 'Cape Town',       country: 'South Africa',   country_code: 'ZA', lat: -33.9249, lng: 18.4241  },
  // Cyprus
  { slug: 'limassol',      name: 'Limassol',            city: 'Limassol',        country: 'Cyprus',         country_code: 'CY', lat: 34.6841,  lng: 33.0379  },
  { slug: 'paphos',        name: 'Paphos',              city: 'Paphos',          country: 'Cyprus',         country_code: 'CY', lat: 34.7754,  lng: 32.4240  },
]

// Remove Marbella from new inserts since it already exists
const newLocations = locations.filter(l => l.slug !== 'marbella')

const { data, error } = await supabase
  .from('locations')
  .upsert(newLocations, { onConflict: 'slug', ignoreDuplicates: false })
  .select('id, city, country')

if (error) {
  console.error('Error:', error.message)
} else {
  console.log(`✅ Inserted/updated ${data?.length} locations`)
  data?.forEach(l => console.log(`  - ${l.city}, ${l.country}`))
}
