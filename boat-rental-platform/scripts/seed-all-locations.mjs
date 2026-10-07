import { readFileSync as __rfEnv } from 'node:fs'
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { try { for (const __l of __rfEnv(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const __m = __l.match(/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+?)\s*$/); if (__m) { process.env.SUPABASE_SERVICE_ROLE_KEY = __m[1].replace(/^['"]|['"]$/g, ''); break } } } catch {} }
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY (set it in .env.local or the environment).'); process.exit(1) }

/**
 * Comprehensive global boating locations seed
 * Covers: oceans, seas, rivers, lakes, canals, inland waterways
 * ~300+ destinations across 100+ countries
 */

const SUPABASE_URL = 'https://xluprzxpuoryiwvxhfgw.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

const locations = [
  // ─── EUROPE — COASTAL ─────────────────────────────────────────────────────

  // United Kingdom
  { slug:'london-thames',        name:'London — Thames River',       city:'London',          country:'United Kingdom',         country_code:'GB', lat:51.5074,  lng:-0.1278,   is_featured:false },
  { slug:'cornwall-falmouth',    name:'Falmouth, Cornwall',          city:'Falmouth',        country:'United Kingdom',         country_code:'GB', lat:50.1526,  lng:-5.0664,   is_featured:false },
  { slug:'isle-of-wight',        name:'Isle of Wight',               city:'Cowes',           country:'United Kingdom',         country_code:'GB', lat:50.7600,  lng:-1.2980,   is_featured:false },
  { slug:'norfolk-broads',       name:'Norfolk Broads',              city:'Norwich',         country:'United Kingdom',         country_code:'GB', lat:52.6193,  lng:1.5090,    is_featured:false },
  { slug:'loch-lomond',          name:'Loch Lomond & The Trossachs', city:'Loch Lomond',     country:'United Kingdom',         country_code:'GB', lat:56.1307,  lng:-4.6100,   is_featured:false },
  { slug:'loch-ness',            name:'Loch Ness, Scottish Highlands',city:'Inverness',      country:'United Kingdom',         country_code:'GB', lat:57.3229,  lng:-4.4244,   is_featured:false },
  { slug:'isle-of-skye',         name:'Isle of Skye',                city:'Portree',         country:'United Kingdom',         country_code:'GB', lat:57.4130,  lng:-6.1956,   is_featured:false },
  { slug:'brighton',             name:'Brighton & Hove',             city:'Brighton',        country:'United Kingdom',         country_code:'GB', lat:50.8229,  lng:-0.1363,   is_featured:false },
  { slug:'bristol-avon',         name:'Bristol Avon River',          city:'Bristol',         country:'United Kingdom',         country_code:'GB', lat:51.4545,  lng:-2.5879,   is_featured:false },

  // Ireland
  { slug:'dublin-bay',           name:'Dublin Bay',                  city:'Dublin',          country:'Ireland',                country_code:'IE', lat:53.3498,  lng:-6.2603,   is_featured:false },
  { slug:'shannon-river',        name:'Shannon River',               city:'Limerick',        country:'Ireland',                country_code:'IE', lat:52.6638,  lng:-8.6267,   is_featured:false },
  { slug:'cork-harbour',         name:'Cork Harbour',                city:'Cork',            country:'Ireland',                country_code:'IE', lat:51.8985,  lng:-8.4756,   is_featured:false },
  { slug:'galway-bay',           name:'Galway Bay',                  city:'Galway',          country:'Ireland',                country_code:'IE', lat:53.2707,  lng:-9.0568,   is_featured:false },

  // Germany
  { slug:'hamburg',              name:'Hamburg — Alster & Elbe',     city:'Hamburg',         country:'Germany',                country_code:'DE', lat:53.5511,  lng:9.9937,    is_featured:false },
  { slug:'berlin-spree',         name:'Berlin — Spree & Havel Lakes',city:'Berlin',          country:'Germany',                country_code:'DE', lat:52.5200,  lng:13.4050,   is_featured:false },
  { slug:'kiel-fjord',           name:'Kiel Fjord',                  city:'Kiel',            country:'Germany',                country_code:'DE', lat:54.3233,  lng:10.1394,   is_featured:false },
  { slug:'rostock',              name:'Rostock — Baltic Sea',        city:'Rostock',         country:'Germany',                country_code:'DE', lat:54.0924,  lng:12.0991,   is_featured:false },
  { slug:'lake-constance-de',    name:'Lake Constance (Bodensee)',   city:'Konstanz',        country:'Germany',                country_code:'DE', lat:47.6604,  lng:9.1756,    is_featured:false },
  { slug:'mecklenburg-lakes',    name:'Mecklenburg Lake District',   city:'Neustrelitz',     country:'Germany',                country_code:'DE', lat:53.3591,  lng:13.0647,   is_featured:false },
  { slug:'rhine-river-de',       name:'Rhine River',                 city:'Düsseldorf',      country:'Germany',                country_code:'DE', lat:51.2217,  lng:6.7762,    is_featured:false },
  { slug:'moselle-river',        name:'Moselle River',               city:'Koblenz',         country:'Germany',                country_code:'DE', lat:50.3536,  lng:7.5799,    is_featured:false },
  { slug:'munich-lake-region',   name:'Munich Lake Region',          city:'Munich',          country:'Germany',                country_code:'DE', lat:47.9990,  lng:11.5200,   is_featured:false },

  // France
  { slug:'paris-seine',          name:'Paris — Seine River',         city:'Paris',           country:'France',                 country_code:'FR', lat:48.8566,  lng:2.3522,    is_featured:false },
  { slug:'canal-du-midi',        name:'Canal du Midi',               city:'Béziers',         country:'France',                 country_code:'FR', lat:43.3449,  lng:3.2160,    is_featured:false },
  { slug:'burgundy-canals',      name:'Burgundy Canals',             city:'Dijon',           country:'France',                 country_code:'FR', lat:47.3220,  lng:5.0415,    is_featured:false },
  { slug:'loire-valley',         name:'Loire Valley River',          city:'Tours',           country:'France',                 country_code:'FR', lat:47.3941,  lng:0.6848,    is_featured:false },
  { slug:'brittany-coast',       name:'Brittany Coast',              city:'Brest',           country:'France',                 country_code:'FR', lat:48.3905,  lng:-4.4860,   is_featured:false },
  { slug:'bordeaux-gironde',     name:'Bordeaux — Gironde Estuary',  city:'Bordeaux',        country:'France',                 country_code:'FR', lat:44.8378,  lng:-0.5792,   is_featured:false },
  { slug:'lake-annecy',          name:'Lake Annecy',                 city:'Annecy',          country:'France',                 country_code:'FR', lat:45.9000,  lng:6.1170,    is_featured:false },

  // Switzerland
  { slug:'lake-geneva',          name:'Lake Geneva',                 city:'Geneva',          country:'Switzerland',            country_code:'CH', lat:46.2044,  lng:6.1432,    is_featured:false },
  { slug:'lake-zurich',          name:'Lake Zürich',                 city:'Zürich',          country:'Switzerland',            country_code:'CH', lat:47.3769,  lng:8.5417,    is_featured:false },
  { slug:'lake-lucerne',         name:'Lake Lucerne',                city:'Lucerne',         country:'Switzerland',            country_code:'CH', lat:47.0502,  lng:8.3093,    is_featured:false },
  { slug:'lake-maggiore-ch',     name:'Lake Maggiore',               city:'Locarno',         country:'Switzerland',            country_code:'CH', lat:46.1720,  lng:8.7940,    is_featured:false },
  { slug:'lake-thun',            name:'Lake Thun',                   city:'Thun',            country:'Switzerland',            country_code:'CH', lat:46.7580,  lng:7.6280,    is_featured:false },

  // Austria
  { slug:'vienna-danube',        name:'Vienna — Danube River',       city:'Vienna',          country:'Austria',                country_code:'AT', lat:48.2082,  lng:16.3738,   is_featured:false },
  { slug:'salzkammergut-lakes',  name:'Salzkammergut Lakes',         city:'Salzburg',        country:'Austria',                country_code:'AT', lat:47.8095,  lng:13.0550,   is_featured:false },
  { slug:'wolfgangsee',          name:'Lake Wolfgang',               city:'St. Wolfgang',    country:'Austria',                country_code:'AT', lat:47.7346,  lng:13.4451,   is_featured:false },

  // Netherlands
  { slug:'amsterdam-canals',     name:'Amsterdam Canals',            city:'Amsterdam',       country:'Netherlands',            country_code:'NL', lat:52.3676,  lng:4.9041,    is_featured:false },
  { slug:'frisian-lakes',        name:'Frisian Lakes',               city:'Sneek',           country:'Netherlands',            country_code:'NL', lat:53.0336,  lng:5.6577,    is_featured:false },
  { slug:'ijsselmeer',           name:'IJsselmeer',                  city:'Enkhuizen',       country:'Netherlands',            country_code:'NL', lat:52.7068,  lng:5.2988,    is_featured:false },
  { slug:'zeeland',              name:'Zeeland Delta',               city:'Middelburg',      country:'Netherlands',            country_code:'NL', lat:51.4988,  lng:3.6136,    is_featured:false },

  // Belgium
  { slug:'bruges-canals',        name:'Bruges Canals',               city:'Bruges',          country:'Belgium',                country_code:'BE', lat:51.2093,  lng:3.2247,    is_featured:false },
  { slug:'ghent-canals',         name:'Ghent Canals',                city:'Ghent',           country:'Belgium',                country_code:'BE', lat:51.0543,  lng:3.7174,    is_featured:false },
  { slug:'antwerp-schelde',      name:'Antwerp — Scheldt River',     city:'Antwerp',         country:'Belgium',                country_code:'BE', lat:51.2194,  lng:4.4025,    is_featured:false },

  // Denmark
  { slug:'copenhagen',           name:'Copenhagen',                  city:'Copenhagen',      country:'Denmark',                country_code:'DK', lat:55.6761,  lng:12.5683,   is_featured:false },
  { slug:'bornholm',             name:'Bornholm Island',             city:'Rønne',           country:'Denmark',                country_code:'DK', lat:55.1002,  lng:14.7006,   is_featured:false },
  { slug:'aarhus',               name:'Aarhus Bay',                  city:'Aarhus',          country:'Denmark',                country_code:'DK', lat:56.1629,  lng:10.2039,   is_featured:false },

  // Finland
  { slug:'helsinki',             name:'Helsinki Archipelago',        city:'Helsinki',        country:'Finland',                country_code:'FI', lat:60.1699,  lng:24.9384,   is_featured:false },
  { slug:'finnish-lake-district',name:'Finnish Lake District (Saimaa)',city:'Savonlinna',    country:'Finland',                country_code:'FI', lat:61.8693,  lng:28.8789,   is_featured:false },
  { slug:'aland-islands',        name:'Åland Islands',               city:'Mariehamn',       country:'Finland',                country_code:'FI', lat:60.0969,  lng:19.9416,   is_featured:false },

  // Sweden (more)
  { slug:'stockholm-archipelago',name:'Stockholm Archipelago',       city:'Stockholm',       country:'Sweden',                 country_code:'SE', lat:59.3293,  lng:18.0686,   is_featured:false },
  { slug:'gothenburg',           name:'Gothenburg',                  city:'Gothenburg',      country:'Sweden',                 country_code:'SE', lat:57.7089,  lng:11.9746,   is_featured:false },
  { slug:'lake-vanern',          name:'Lake Vänern',                 city:'Karlstad',        country:'Sweden',                 country_code:'SE', lat:59.3793,  lng:13.5037,   is_featured:false },
  { slug:'lake-vattern',         name:'Lake Vättern',                city:'Jönköping',       country:'Sweden',                 country_code:'SE', lat:57.7826,  lng:14.1618,   is_featured:false },

  // Norway (more)
  { slug:'oslo-fjord',           name:'Oslo Fjord',                  city:'Oslo',            country:'Norway',                 country_code:'NO', lat:59.9139,  lng:10.7522,   is_featured:false },
  { slug:'hardangerfjord',       name:'Hardangerfjord',              city:'Ulvik',           country:'Norway',                 country_code:'NO', lat:60.5667,  lng:6.9333,    is_featured:false },
  { slug:'lofoten-islands',      name:'Lofoten Islands',             city:'Svolvær',         country:'Norway',                 country_code:'NO', lat:68.2340,  lng:14.5681,   is_featured:false },
  { slug:'tromsoe',              name:'Tromsø — Arctic Norway',      city:'Tromsø',          country:'Norway',                 country_code:'NO', lat:69.6496,  lng:18.9560,   is_featured:false },

  // Iceland
  { slug:'reykjavik',            name:'Reykjavik',                   city:'Reykjavik',       country:'Iceland',                country_code:'IS', lat:64.1265,  lng:-21.8174,  is_featured:false },

  // Poland
  { slug:'gdansk',               name:'Gdańsk — Baltic Coast',       city:'Gdańsk',          country:'Poland',                 country_code:'PL', lat:54.3521,  lng:18.6464,   is_featured:false },
  { slug:'masuria-lakes',        name:'Masurian Lakes',              city:'Giżycko',         country:'Poland',                 country_code:'PL', lat:54.0360,  lng:21.7687,   is_featured:false },
  { slug:'szczecin',             name:'Szczecin Lagoon',             city:'Szczecin',        country:'Poland',                 country_code:'PL', lat:53.4285,  lng:14.5528,   is_featured:false },

  // Czech Republic
  { slug:'prague-vltava',        name:'Prague — Vltava River',       city:'Prague',          country:'Czech Republic',         country_code:'CZ', lat:50.0755,  lng:14.4378,   is_featured:false },
  { slug:'lipno-reservoir',      name:'Lipno Reservoir',             city:'Lipno nad Vltavou',country:'Czech Republic',        country_code:'CZ', lat:48.6371,  lng:14.2078,   is_featured:false },

  // Hungary
  { slug:'budapest-danube',      name:'Budapest — Danube River',     city:'Budapest',        country:'Hungary',                country_code:'HU', lat:47.4979,  lng:19.0402,   is_featured:false },
  { slug:'lake-balaton',         name:'Lake Balaton',                city:'Siófok',          country:'Hungary',                country_code:'HU', lat:46.9064,  lng:18.0497,   is_featured:false },

  // Slovakia
  { slug:'bratislava-danube',    name:'Bratislava — Danube River',   city:'Bratislava',      country:'Slovakia',               country_code:'SK', lat:48.1486,  lng:17.1077,   is_featured:false },

  // Slovenia
  { slug:'lake-bled',            name:'Lake Bled',                   city:'Bled',            country:'Slovenia',               country_code:'SI', lat:46.3680,  lng:14.1138,   is_featured:false },
  { slug:'piran',                name:'Piran — Adriatic Coast',      city:'Piran',           country:'Slovenia',               country_code:'SI', lat:45.5284,  lng:13.5681,   is_featured:false },

  // Bulgaria
  { slug:'varna',                name:'Varna — Black Sea',           city:'Varna',           country:'Bulgaria',               country_code:'BG', lat:43.2141,  lng:27.9147,   is_featured:false },
  { slug:'burgas',               name:'Burgas — Black Sea',          city:'Burgas',          country:'Bulgaria',               country_code:'BG', lat:42.5048,  lng:27.4626,   is_featured:false },

  // Romania
  { slug:'danube-delta',         name:'Danube Delta',                city:'Tulcea',          country:'Romania',                country_code:'RO', lat:45.1864,  lng:28.8028,   is_featured:false },
  { slug:'constanta',            name:'Constanța — Black Sea',       city:'Constanța',       country:'Romania',                country_code:'RO', lat:44.1598,  lng:28.6348,   is_featured:false },

  // Albania
  { slug:'saranda',              name:'Sarandë — Albanian Riviera',  city:'Sarandë',         country:'Albania',                country_code:'AL', lat:39.8756,  lng:20.0053,   is_featured:false },
  { slug:'vlora',                name:'Vlorë — Albanian Riviera',    city:'Vlorë',           country:'Albania',                country_code:'AL', lat:40.4657,  lng:19.4897,   is_featured:false },

  // Serbia
  { slug:'belgrade-danube',      name:'Belgrade — Danube & Sava',    city:'Belgrade',        country:'Serbia',                 country_code:'RS', lat:44.8176,  lng:20.4569,   is_featured:false },

  // Italy (more lakes)
  { slug:'lake-como',            name:'Lake Como',                   city:'Como',            country:'Italy',                  country_code:'IT', lat:45.8081,  lng:9.0852,    is_featured:false },
  { slug:'lake-garda',           name:'Lake Garda',                  city:'Desenzano del Garda',country:'Italy',              country_code:'IT', lat:45.4654,  lng:10.5210,   is_featured:false },
  { slug:'lake-maggiore-it',     name:'Lake Maggiore',               city:'Stresa',          country:'Italy',                  country_code:'IT', lat:45.8807,  lng:8.5330,    is_featured:false },
  { slug:'lake-iseo',            name:'Lake Iseo',                   city:'Iseo',            country:'Italy',                  country_code:'IT', lat:45.6567,  lng:10.0497,   is_featured:false },
  { slug:'lake-bolsena',         name:'Lake Bolsena',                city:'Bolsena',         country:'Italy',                  country_code:'IT', lat:42.6467,  lng:11.9785,   is_featured:false },
  { slug:'naples',               name:'Naples & Gulf of Naples',     city:'Naples',          country:'Italy',                  country_code:'IT', lat:40.8518,  lng:14.2681,   is_featured:false },
  { slug:'rimini',               name:'Rimini — Adriatic Coast',     city:'Rimini',          country:'Italy',                  country_code:'IT', lat:44.0678,  lng:12.5695,   is_featured:false },
  { slug:'genoa',                name:'Genoa — Ligurian Riviera',    city:'Genoa',           country:'Italy',                  country_code:'IT', lat:44.4056,  lng:8.9463,    is_featured:false },
  { slug:'brindisi',             name:'Brindisi — Puglia',           city:'Brindisi',        country:'Italy',                  country_code:'IT', lat:40.6323,  lng:17.9409,   is_featured:false },
  { slug:'palermo',              name:'Palermo — Sicily North Coast', city:'Palermo',         country:'Italy',                  country_code:'IT', lat:38.1157,  lng:13.3615,   is_featured:false },
  { slug:'trapani',              name:'Trapani — Egadi Islands',     city:'Trapani',         country:'Italy',                  country_code:'IT', lat:38.0176,  lng:12.5365,   is_featured:false },

  // Spain (more)
  { slug:'alicante',             name:'Alicante — Costa Blanca',     city:'Alicante',        country:'Spain',                  country_code:'ES', lat:38.3452,  lng:-0.4815,   is_featured:false },
  { slug:'cadiz',                name:'Cádiz — Costa de la Luz',     city:'Cádiz',           country:'Spain',                  country_code:'ES', lat:36.5271,  lng:-6.2886,   is_featured:false },
  { slug:'santander',            name:'Santander — Cantabrian Sea',  city:'Santander',       country:'Spain',                  country_code:'ES', lat:43.4628,  lng:-3.8044,   is_featured:false },
  { slug:'vigo',                 name:'Vigo — Galician Rias',        city:'Vigo',            country:'Spain',                  country_code:'ES', lat:42.2314,  lng:-8.7124,   is_featured:false },
  { slug:'bilbao',               name:'Bilbao — Bay of Biscay',      city:'Bilbao',          country:'Spain',                  country_code:'ES', lat:43.2630,  lng:-2.9350,   is_featured:false },
  { slug:'tarragona',            name:'Tarragona — Costa Daurada',   city:'Tarragona',       country:'Spain',                  country_code:'ES', lat:41.1189,  lng:1.2445,    is_featured:false },

  // Portugal (more)
  { slug:'porto-douro',          name:'Porto — Douro River',         city:'Porto',           country:'Portugal',               country_code:'PT', lat:41.1579,  lng:-8.6291,   is_featured:false },
  { slug:'azores',               name:'Azores Islands',              city:'Ponta Delgada',   country:'Portugal',               country_code:'PT', lat:37.7412,  lng:-25.6756,  is_featured:false },
  { slug:'madeira',              name:'Madeira Island',              city:'Funchal',         country:'Portugal',               country_code:'PT', lat:32.6669,  lng:-16.9241,  is_featured:false },
  { slug:'setubal',              name:'Setúbal — Sado Estuary',      city:'Setúbal',         country:'Portugal',               country_code:'PT', lat:38.5244,  lng:-8.8882,   is_featured:false },

  // Greece (more)
  { slug:'thessaloniki',         name:'Thessaloniki — Thermaic Gulf',city:'Thessaloniki',    country:'Greece',                 country_code:'GR', lat:40.6401,  lng:22.9444,   is_featured:false },
  { slug:'kavala',               name:'Kavala — Northern Aegean',    city:'Kavala',          country:'Greece',                 country_code:'GR', lat:40.9399,  lng:24.4019,   is_featured:false },
  { slug:'ithaca',               name:'Ithaca — Ionian Islands',     city:'Ithaca',          country:'Greece',                 country_code:'GR', lat:38.3752,  lng:20.6837,   is_featured:false },
  { slug:'dodecanese',           name:'Dodecanese Islands',          city:'Kos',             country:'Greece',                 country_code:'GR', lat:36.8923,  lng:27.2875,   is_featured:false },
  { slug:'sporades',             name:'Sporades Islands',            city:'Skiathos',        country:'Greece',                 country_code:'GR', lat:39.1610,  lng:23.4920,   is_featured:false },
  { slug:'saronic-gulf',         name:'Saronic Gulf',                city:'Aegina',          country:'Greece',                 country_code:'GR', lat:37.7471,  lng:23.4271,   is_featured:false },

  // Turkey (more)
  { slug:'istanbul-bosphorus',   name:'Istanbul — Bosphorus',        city:'Istanbul',        country:'Turkey',                 country_code:'TR', lat:41.0082,  lng:28.9784,   is_featured:false },
  { slug:'cesme',                name:'Çeşme — Aegean Riviera',      city:'Çeşme',           country:'Turkey',                 country_code:'TR', lat:38.3230,  lng:26.3027,   is_featured:false },
  { slug:'kas',                  name:'Kaş — Turkish Riviera',       city:'Kaş',             country:'Turkey',                 country_code:'TR', lat:36.2007,  lng:29.6399,   is_featured:false },
  { slug:'datca',                name:'Datça Peninsula',             city:'Datça',           country:'Turkey',                 country_code:'TR', lat:36.7267,  lng:27.6882,   is_featured:false },

  // Croatia (more)
  { slug:'rovinj',               name:'Rovinj — Istrian Riviera',    city:'Rovinj',          country:'Croatia',                country_code:'HR', lat:45.0811,  lng:13.6387,   is_featured:false },
  { slug:'pula',                 name:'Pula — Istrian Coast',        city:'Pula',            country:'Croatia',                country_code:'HR', lat:44.8666,  lng:13.8496,   is_featured:false },
  { slug:'korcula',              name:'Korčula Island',              city:'Korčula',         country:'Croatia',                country_code:'HR', lat:42.9608,  lng:17.1340,   is_featured:false },
  { slug:'brac-island',          name:'Brač Island',                 city:'Supetar',         country:'Croatia',                country_code:'HR', lat:43.3863,  lng:16.5547,   is_featured:false },

  // Cyprus
  { slug:'limassol',             name:'Limassol — Cyprus South',     city:'Limassol',        country:'Cyprus',                 country_code:'CY', lat:34.6823,  lng:33.0464,   is_featured:false },
  { slug:'ayia-napa',            name:'Ayia Napa',                   city:'Ayia Napa',       country:'Cyprus',                 country_code:'CY', lat:34.9840,  lng:34.0000,   is_featured:false },

  // Malta (more)
  { slug:'gozo',                 name:'Gozo Island',                 city:'Victoria',        country:'Malta',                  country_code:'MT', lat:36.0448,  lng:14.2412,   is_featured:false },

  // Montenegro (more)
  { slug:'kotor',                name:'Kotor Bay',                   city:'Kotor',           country:'Montenegro',             country_code:'ME', lat:42.4247,  lng:18.7712,   is_featured:false },

  // ─── MIDDLE EAST & NORTH AFRICA ──────────────────────────────────────────

  // Egypt
  { slug:'hurghada',             name:'Hurghada — Red Sea',          city:'Hurghada',        country:'Egypt',                  country_code:'EG', lat:27.2579,  lng:33.8116,   is_featured:false },
  { slug:'sharm-el-sheikh',      name:'Sharm El-Sheikh',             city:'Sharm El-Sheikh', country:'Egypt',                  country_code:'EG', lat:27.9158,  lng:34.3300,   is_featured:false },
  { slug:'nile-luxor',           name:'Nile River — Luxor to Aswan', city:'Luxor',           country:'Egypt',                  country_code:'EG', lat:25.6872,  lng:32.6396,   is_featured:false },
  { slug:'cairo-nile',           name:'Cairo — Nile River',          city:'Cairo',           country:'Egypt',                  country_code:'EG', lat:30.0444,  lng:31.2357,   is_featured:false },
  { slug:'marsa-alam',           name:'Marsa Alam — Red Sea',        city:'Marsa Alam',      country:'Egypt',                  country_code:'EG', lat:25.0670,  lng:34.8874,   is_featured:false },

  // Oman
  { slug:'muscat',               name:'Muscat',                      city:'Muscat',          country:'Oman',                   country_code:'OM', lat:23.5880,  lng:58.3829,   is_featured:false },
  { slug:'musandam',             name:'Musandam Fjords',             city:'Khasab',          country:'Oman',                   country_code:'OM', lat:26.1976,  lng:56.2462,   is_featured:false },
  { slug:'salalah',              name:'Salalah — Arabian Sea',       city:'Salalah',         country:'Oman',                   country_code:'OM', lat:17.0191,  lng:54.0834,   is_featured:false },

  // Qatar
  { slug:'doha',                 name:'Doha — Arabian Gulf',         city:'Doha',            country:'Qatar',                  country_code:'QA', lat:25.2854,  lng:51.5310,   is_featured:false },

  // Bahrain
  { slug:'manama',               name:'Manama — Bahrain',            city:'Manama',          country:'Bahrain',                country_code:'BH', lat:26.2235,  lng:50.5876,   is_featured:false },

  // Saudi Arabia
  { slug:'jeddah',               name:'Jeddah — Red Sea',            city:'Jeddah',          country:'Saudi Arabia',           country_code:'SA', lat:21.4858,  lng:39.1925,   is_featured:false },
  { slug:'neom',                 name:'NEOM — Red Sea',              city:'Tabuk',           country:'Saudi Arabia',           country_code:'SA', lat:28.0000,  lng:35.0000,   is_featured:false },

  // Jordan
  { slug:'aqaba',                name:'Aqaba — Red Sea',             city:'Aqaba',           country:'Jordan',                 country_code:'JO', lat:29.5320,  lng:35.0064,   is_featured:false },

  // Israel
  { slug:'tel-aviv',             name:'Tel Aviv — Mediterranean',    city:'Tel Aviv',        country:'Israel',                 country_code:'IL', lat:32.0853,  lng:34.7818,   is_featured:false },
  { slug:'eilat',                name:'Eilat — Red Sea',             city:'Eilat',           country:'Israel',                 country_code:'IL', lat:29.5581,  lng:34.9482,   is_featured:false },

  // Lebanon
  { slug:'beirut',               name:'Beirut — Mediterranean',      city:'Beirut',          country:'Lebanon',                country_code:'LB', lat:33.8938,  lng:35.5018,   is_featured:false },

  // Morocco
  { slug:'agadir',               name:'Agadir — Atlantic Coast',     city:'Agadir',          country:'Morocco',                country_code:'MA', lat:30.4278,  lng:-9.5981,   is_featured:false },
  { slug:'tangier',              name:'Tangier — Strait of Gibraltar',city:'Tangier',        country:'Morocco',                country_code:'MA', lat:35.7595,  lng:-5.8340,   is_featured:false },
  { slug:'casablanca',           name:'Casablanca',                  city:'Casablanca',      country:'Morocco',                country_code:'MA', lat:33.5731,  lng:-7.5898,   is_featured:false },
  { slug:'essaouira',            name:'Essaouira — Atlantic Coast',  city:'Essaouira',       country:'Morocco',                country_code:'MA', lat:31.5085,  lng:-9.7595,   is_featured:false },

  // Tunisia
  { slug:'hammamet',             name:'Hammamet',                    city:'Hammamet',        country:'Tunisia',                country_code:'TN', lat:36.3972,  lng:10.6107,   is_featured:false },
  { slug:'djerba',               name:'Djerba Island',               city:'Houmt Souk',      country:'Tunisia',                country_code:'TN', lat:33.8669,  lng:10.8509,   is_featured:false },

  // ─── AFRICA ──────────────────────────────────────────────────────────────

  // Kenya
  { slug:'mombasa',              name:'Mombasa — Indian Ocean',      city:'Mombasa',         country:'Kenya',                  country_code:'KE', lat:-4.0435,  lng:39.6682,   is_featured:false },
  { slug:'lamu',                 name:'Lamu Archipelago',            city:'Lamu',            country:'Kenya',                  country_code:'KE', lat:-2.2717,  lng:40.9022,   is_featured:false },
  { slug:'lake-victoria-ke',     name:'Lake Victoria',               city:'Kisumu',          country:'Kenya',                  country_code:'KE', lat:-0.1022,  lng:34.7617,   is_featured:false },

  // Tanzania
  { slug:'zanzibar',             name:'Zanzibar Island',             city:'Stone Town',      country:'Tanzania',               country_code:'TZ', lat:-6.1630,  lng:39.1983,   is_featured:false },
  { slug:'dar-es-salaam',        name:'Dar es Salaam',               city:'Dar es Salaam',   country:'Tanzania',               country_code:'TZ', lat:-6.7924,  lng:39.2083,   is_featured:false },
  { slug:'mafia-island',         name:'Mafia Island',                city:'Kilindoni',       country:'Tanzania',               country_code:'TZ', lat:-7.9174,  lng:39.8477,   is_featured:false },

  // Mozambique
  { slug:'bazaruto',             name:'Bazaruto Archipelago',        city:'Vilanculos',      country:'Mozambique',             country_code:'MZ', lat:-21.9940, lng:35.3285,   is_featured:false },

  // Madagascar
  { slug:'nosy-be',              name:'Nosy Be — Madagascar',        city:'Hell-Ville',      country:'Madagascar',             country_code:'MG', lat:-13.3276, lng:48.2633,   is_featured:false },

  // Mauritius
  { slug:'mauritius',            name:'Mauritius',                   city:'Port Louis',      country:'Mauritius',              country_code:'MU', lat:-20.1609, lng:57.4977,   is_featured:false },

  // South Africa (more)
  { slug:'cape-town',            name:'Cape Town',                   city:'Cape Town',       country:'South Africa',           country_code:'ZA', lat:-33.9249, lng:18.4241,   is_featured:false },
  { slug:'durban',               name:'Durban — KwaZulu-Natal',      city:'Durban',          country:'South Africa',           country_code:'ZA', lat:-29.8587, lng:31.0218,   is_featured:false },
  { slug:'knysna',               name:'Knysna — Garden Route',       city:'Knysna',          country:'South Africa',           country_code:'ZA', lat:-34.0368, lng:23.0474,   is_featured:false },
  { slug:'orange-river',         name:'Orange River',                city:'Upington',        country:'South Africa',           country_code:'ZA', lat:-28.4478, lng:21.2561,   is_featured:false },

  // Namibia
  { slug:'walvis-bay',           name:'Walvis Bay — Atlantic',       city:'Walvis Bay',      country:'Namibia',                country_code:'NA', lat:-22.9576, lng:14.5052,   is_featured:false },

  // Botswana
  { slug:'okavango-delta',       name:'Okavango Delta',              city:'Maun',            country:'Botswana',               country_code:'BW', lat:-19.9833, lng:23.4167,   is_featured:false },

  // Uganda
  { slug:'lake-victoria-ug',     name:'Lake Victoria — Uganda',      city:'Entebbe',         country:'Uganda',                 country_code:'UG', lat:0.0512,   lng:32.4637,   is_featured:false },

  // Senegal
  { slug:'dakar',                name:'Dakar — Atlantic Coast',      city:'Dakar',           country:'Senegal',                country_code:'SN', lat:14.6928,  lng:-17.4467,  is_featured:false },
  { slug:'casamance-river',      name:'Casamance River',             city:'Ziguinchor',      country:'Senegal',                country_code:'SN', lat:12.5627,  lng:-16.2718,  is_featured:false },

  // Nigeria
  { slug:'lagos',                name:'Lagos — Gulf of Guinea',      city:'Lagos',           country:'Nigeria',                country_code:'NG', lat:6.5244,   lng:3.3792,    is_featured:false },

  // Ghana
  { slug:'accra',                name:'Accra — Gulf of Guinea',      city:'Accra',           country:'Ghana',                  country_code:'GH', lat:5.6037,   lng:-0.1870,   is_featured:false },

  // Réunion
  { slug:'reunion',              name:'Réunion Island',              city:'Saint-Denis',     country:'Réunion',                country_code:'RE', lat:-20.8823, lng:55.4504,   is_featured:false },

  // ─── SOUTH & SOUTHEAST ASIA ──────────────────────────────────────────────

  // India
  { slug:'goa',                  name:'Goa — Arabian Sea',           city:'Panaji',          country:'India',                  country_code:'IN', lat:15.4909,  lng:73.8278,   is_featured:false },
  { slug:'kerala-backwaters',    name:'Kerala Backwaters',           city:'Alleppey',        country:'India',                  country_code:'IN', lat:9.4981,   lng:76.3388,   is_featured:false },
  { slug:'andaman-islands',      name:'Andaman & Nicobar Islands',   city:'Port Blair',      country:'India',                  country_code:'IN', lat:11.6234,  lng:92.7265,   is_featured:false },
  { slug:'mumbai-harbour',       name:'Mumbai Harbour',              city:'Mumbai',          country:'India',                  country_code:'IN', lat:18.9388,  lng:72.8354,   is_featured:false },
  { slug:'lakshadweep',          name:'Lakshadweep Islands',         city:'Kavaratti',       country:'India',                  country_code:'IN', lat:10.5669,  lng:72.6420,   is_featured:false },

  // Sri Lanka
  { slug:'mirissa',              name:'Mirissa — South Coast',       city:'Mirissa',         country:'Sri Lanka',              country_code:'LK', lat:5.9500,   lng:80.4833,   is_featured:false },
  { slug:'trincomalee',          name:'Trincomalee — East Coast',    city:'Trincomalee',     country:'Sri Lanka',              country_code:'LK', lat:8.5874,   lng:81.2152,   is_featured:false },

  // Thailand (more)
  { slug:'phuket',               name:'Phuket',                      city:'Phuket',          country:'Thailand',               country_code:'TH', lat:7.8804,   lng:98.3923,   is_featured:false },
  { slug:'koh-samui',            name:'Koh Samui',                   city:'Ko Samui',        country:'Thailand',               country_code:'TH', lat:9.5399,   lng:100.0605,  is_featured:false },
  { slug:'krabi',                name:'Krabi & Phi Phi Islands',     city:'Krabi',           country:'Thailand',               country_code:'TH', lat:8.0863,   lng:98.9063,   is_featured:false },
  { slug:'koh-tao',              name:'Koh Tao',                     city:'Ko Tao',          country:'Thailand',               country_code:'TH', lat:10.0956,  lng:99.8397,   is_featured:false },
  { slug:'chao-phraya-bangkok',  name:'Bangkok — Chao Phraya River', city:'Bangkok',         country:'Thailand',               country_code:'TH', lat:13.7563,  lng:100.5018,  is_featured:false },

  // Indonesia
  { slug:'bali',                 name:'Bali',                        city:'Denpasar',        country:'Indonesia',              country_code:'ID', lat:-8.3405,  lng:115.0920,  is_featured:true  },
  { slug:'lombok',               name:'Lombok & Gili Islands',       city:'Mataram',         country:'Indonesia',              country_code:'ID', lat:-8.6529,  lng:116.3241,  is_featured:false },
  { slug:'raja-ampat',           name:'Raja Ampat',                  city:'Sorong',          country:'Indonesia',              country_code:'ID', lat:-0.5897,  lng:130.0737,  is_featured:false },
  { slug:'komodo',               name:'Komodo — Flores',             city:'Labuan Bajo',     country:'Indonesia',              country_code:'ID', lat:-8.5551,  lng:119.8954,  is_featured:false },
  { slug:'bunaken',              name:'Bunaken — North Sulawesi',    city:'Manado',          country:'Indonesia',              country_code:'ID', lat:1.6210,   lng:124.8210,  is_featured:false },

  // Philippines
  { slug:'el-nido',              name:'El Nido — Palawan',           city:'El Nido',         country:'Philippines',            country_code:'PH', lat:11.1834,  lng:119.0953,  is_featured:true  },
  { slug:'coron',                name:'Coron — Palawan',             city:'Coron',           country:'Philippines',            country_code:'PH', lat:11.9986,  lng:120.2043,  is_featured:false },
  { slug:'boracay',              name:'Boracay Island',              city:'Boracay',         country:'Philippines',            country_code:'PH', lat:11.9674,  lng:121.9248,  is_featured:false },
  { slug:'siargao',              name:'Siargao Island',              city:'General Luna',    country:'Philippines',            country_code:'PH', lat:9.8482,   lng:126.0458,  is_featured:false },
  { slug:'cebu',                 name:'Cebu — Visayas',              city:'Cebu City',       country:'Philippines',            country_code:'PH', lat:10.3157,  lng:123.8854,  is_featured:false },

  // Vietnam
  { slug:'ha-long-bay',          name:'Ha Long Bay',                 city:'Ha Long City',    country:'Vietnam',                country_code:'VN', lat:20.9101,  lng:107.1839,  is_featured:true  },
  { slug:'hoi-an',               name:'Hoi An & Thu Bon River',      city:'Hoi An',          country:'Vietnam',                country_code:'VN', lat:15.8801,  lng:108.3380,  is_featured:false },
  { slug:'mekong-delta',         name:'Mekong Delta',                city:'Can Tho',         country:'Vietnam',                country_code:'VN', lat:10.0341,  lng:105.7836,  is_featured:false },
  { slug:'phu-quoc',             name:'Phú Quốc Island',             city:'Phú Quốc',        country:'Vietnam',                country_code:'VN', lat:10.2899,  lng:103.9840,  is_featured:false },

  // Malaysia
  { slug:'langkawi',             name:'Langkawi Islands',            city:'Kuah',            country:'Malaysia',               country_code:'MY', lat:6.3500,   lng:99.8034,   is_featured:false },
  { slug:'penang',               name:'Penang',                      city:'George Town',     country:'Malaysia',               country_code:'MY', lat:5.4141,   lng:100.3288,  is_featured:false },
  { slug:'sabah-borneo',         name:'Sabah — Borneo',              city:'Kota Kinabalu',   country:'Malaysia',               country_code:'MY', lat:5.9788,   lng:116.0753,  is_featured:false },
  { slug:'tioman-island',        name:'Tioman Island',               city:'Mersing',         country:'Malaysia',               country_code:'MY', lat:2.7957,   lng:104.1650,  is_featured:false },

  // Singapore
  { slug:'singapore',            name:'Singapore',                   city:'Singapore',       country:'Singapore',              country_code:'SG', lat:1.3521,   lng:103.8198,  is_featured:false },

  // Myanmar
  { slug:'inle-lake',            name:'Inle Lake',                   city:'Nyaungshwe',      country:'Myanmar',                country_code:'MM', lat:20.5300,  lng:96.9100,   is_featured:false },

  // Cambodia
  { slug:'siem-reap-tonle-sap',  name:'Tonle Sap Lake',              city:'Siem Reap',       country:'Cambodia',               country_code:'KH', lat:13.4125,  lng:103.8670,  is_featured:false },
  { slug:'mekong-cambodia',      name:'Mekong River — Cambodia',     city:'Phnom Penh',      country:'Cambodia',               country_code:'KH', lat:11.5625,  lng:104.9160,  is_featured:false },

  // Laos
  { slug:'mekong-laos',          name:'Mekong River — Laos',         city:'Luang Prabang',   country:'Laos',                   country_code:'LA', lat:19.8845,  lng:102.1348,  is_featured:false },

  // ─── EAST ASIA ────────────────────────────────────────────────────────────

  // Japan
  { slug:'tokyo-bay',            name:'Tokyo Bay',                   city:'Tokyo',           country:'Japan',                  country_code:'JP', lat:35.6762,  lng:139.6503,  is_featured:false },
  { slug:'okinawa',              name:'Okinawa — Ryukyu Islands',    city:'Naha',            country:'Japan',                  country_code:'JP', lat:26.2124,  lng:127.6809,  is_featured:false },
  { slug:'osaka-bay',            name:'Osaka Bay',                   city:'Osaka',           country:'Japan',                  country_code:'JP', lat:34.6937,  lng:135.5023,  is_featured:false },
  { slug:'hiroshima-sea',        name:'Seto Inland Sea — Hiroshima', city:'Hiroshima',       country:'Japan',                  country_code:'JP', lat:34.3853,  lng:132.4553,  is_featured:false },

  // South Korea
  { slug:'busan',                name:'Busan — South Sea',           city:'Busan',           country:'South Korea',            country_code:'KR', lat:35.1796,  lng:129.0756,  is_featured:false },
  { slug:'jeju-island',          name:'Jeju Island',                 city:'Jeju City',       country:'South Korea',            country_code:'KR', lat:33.4996,  lng:126.5312,  is_featured:false },

  // China
  { slug:'hong-kong',            name:'Hong Kong',                   city:'Hong Kong',       country:'China',                  country_code:'CN', lat:22.3193,  lng:114.1694,  is_featured:false },
  { slug:'guilin-li-river',      name:'Guilin — Li River',           city:'Guilin',          country:'China',                  country_code:'CN', lat:25.2736,  lng:110.2907,  is_featured:false },
  { slug:'yangtze-three-gorges', name:'Yangtze River — Three Gorges',city:'Yichang',         country:'China',                  country_code:'CN', lat:30.6927,  lng:111.2866,  is_featured:false },
  { slug:'sanya',                name:'Sanya — Hainan Island',       city:'Sanya',           country:'China',                  country_code:'CN', lat:18.2528,  lng:109.5120,  is_featured:false },
  { slug:'xiamen',               name:'Xiamen',                      city:'Xiamen',          country:'China',                  country_code:'CN', lat:24.4798,  lng:118.0819,  is_featured:false },

  // ─── PACIFIC ISLANDS ──────────────────────────────────────────────────────

  // French Polynesia
  { slug:'bora-bora',            name:'Bora Bora',                   city:'Vaitape',         country:'French Polynesia',       country_code:'PF', lat:-16.5004, lng:-151.7415, is_featured:true  },
  { slug:'tahiti',               name:'Tahiti',                      city:'Papeete',         country:'French Polynesia',       country_code:'PF', lat:-17.5516, lng:-149.5585, is_featured:false },
  { slug:'moorea',               name:'Mo\'orea',                    city:'Afareaitu',       country:'French Polynesia',       country_code:'PF', lat:-17.5338, lng:-149.8320, is_featured:false },
  { slug:'rangiroa',             name:'Rangiroa Atoll',              city:'Avatoru',         country:'French Polynesia',       country_code:'PF', lat:-15.1333, lng:-147.6500, is_featured:false },
  { slug:'tuamotu',              name:'Tuamotu Archipelago',         city:'Fakarava',        country:'French Polynesia',       country_code:'PF', lat:-16.0500, lng:-145.6333, is_featured:false },

  // Fiji
  { slug:'fiji-mamanuca',        name:'Fiji — Mamanuca Islands',     city:'Nadi',            country:'Fiji',                   country_code:'FJ', lat:-17.6000, lng:177.3000,  is_featured:false },
  { slug:'fiji-yasawa',          name:'Fiji — Yasawa Islands',       city:'Lautoka',         country:'Fiji',                   country_code:'FJ', lat:-16.6667, lng:177.2500,  is_featured:false },

  // New Caledonia
  { slug:'new-caledonia',        name:'New Caledonia',               city:'Nouméa',          country:'New Caledonia',          country_code:'NC', lat:-22.2758, lng:166.4580,  is_featured:false },

  // Vanuatu
  { slug:'vanuatu',              name:'Vanuatu',                     city:'Port Vila',       country:'Vanuatu',                country_code:'VU', lat:-17.7334, lng:168.3219,  is_featured:false },

  // Palau
  { slug:'palau',                name:'Palau — Rock Islands',        city:'Koror',           country:'Palau',                  country_code:'PW', lat:7.5149,   lng:134.5825,  is_featured:false },

  // Cook Islands
  { slug:'cook-islands',         name:'Cook Islands',                city:'Avarua',          country:'Cook Islands',           country_code:'CK', lat:-21.2067, lng:-159.7720, is_featured:false },

  // Samoa
  { slug:'samoa',                name:'Samoa',                       city:'Apia',            country:'Samoa',                  country_code:'WS', lat:-13.8314, lng:-172.0000, is_featured:false },

  // Tonga
  { slug:'tonga',                name:'Tonga — Vava\'u Group',       city:'Neiafu',          country:'Tonga',                  country_code:'TO', lat:-18.6500, lng:-173.9833, is_featured:false },

  // Hawaii (US)
  { slug:'hawaii-oahu',          name:'Oahu — Hawaii',               city:'Honolulu',        country:'United States',          country_code:'US', lat:21.3069,  lng:-157.8583, is_featured:false },
  { slug:'hawaii-maui',          name:'Maui — Hawaii',               city:'Lahaina',         country:'United States',          country_code:'US', lat:20.8893,  lng:-156.4729, is_featured:false },
  { slug:'hawaii-big-island',    name:'Big Island — Hawaii',         city:'Kailua-Kona',     country:'United States',          country_code:'US', lat:19.6400,  lng:-155.9969, is_featured:false },

  // Guam
  { slug:'guam',                 name:'Guam',                        city:'Hagåtña',         country:'Guam',                   country_code:'GU', lat:13.4443,  lng:144.7937,  is_featured:false },

  // ─── AUSTRALIA & NZ (more) ───────────────────────────────────────────────

  { slug:'sydney-harbour',       name:'Sydney Harbour',              city:'Sydney',          country:'Australia',              country_code:'AU', lat:-33.8688, lng:151.2093,  is_featured:true  },
  { slug:'whitsundays',          name:'Whitsundays',                 city:'Airlie Beach',    country:'Australia',              country_code:'AU', lat:-20.2680, lng:148.7177,  is_featured:false },
  { slug:'great-barrier-reef',   name:'Great Barrier Reef — Cairns', city:'Cairns',          country:'Australia',              country_code:'AU', lat:-16.9186, lng:145.7781,  is_featured:false },
  { slug:'melbourne',            name:'Melbourne — Port Phillip Bay',city:'Melbourne',       country:'Australia',              country_code:'AU', lat:-37.8136, lng:144.9631,  is_featured:false },
  { slug:'brisbane',             name:'Brisbane River',              city:'Brisbane',        country:'Australia',              country_code:'AU', lat:-27.4698, lng:153.0251,  is_featured:false },
  { slug:'perth',                name:'Perth — Indian Ocean',        city:'Perth',           country:'Australia',              country_code:'AU', lat:-31.9505, lng:115.8605,  is_featured:false },
  { slug:'gold-coast',           name:'Gold Coast',                  city:'Surfers Paradise',country:'Australia',              country_code:'AU', lat:-28.0167, lng:153.4000,  is_featured:false },
  { slug:'darwin',               name:'Darwin — Northern Territory', city:'Darwin',          country:'Australia',              country_code:'AU', lat:-12.4634, lng:130.8456,  is_featured:false },
  { slug:'broome',               name:'Broome — Kimberley Coast',    city:'Broome',          country:'Australia',              country_code:'AU', lat:-17.9614, lng:122.2359,  is_featured:false },
  { slug:'hobart',               name:'Hobart — Tasmania',           city:'Hobart',          country:'Australia',              country_code:'AU', lat:-42.8821, lng:147.3272,  is_featured:false },
  { slug:'murray-river',         name:'Murray River',                city:'Mildura',         country:'Australia',              country_code:'AU', lat:-34.2080, lng:142.1594,  is_featured:false },

  { slug:'bay-of-islands-nz',    name:'Bay of Islands',              city:'Paihia',          country:'New Zealand',            country_code:'NZ', lat:-35.2802, lng:174.0900,  is_featured:false },
  { slug:'marlborough-sounds',   name:'Marlborough Sounds',          city:'Picton',          country:'New Zealand',            country_code:'NZ', lat:-41.2920, lng:174.0030,  is_featured:false },
  { slug:'auckland-hauraki',     name:'Auckland — Hauraki Gulf',     city:'Auckland',        country:'New Zealand',            country_code:'NZ', lat:-36.8485, lng:174.7633,  is_featured:false },
  { slug:'lake-taupo',           name:'Lake Taupo',                  city:'Taupo',           country:'New Zealand',            country_code:'NZ', lat:-38.6857, lng:176.0702,  is_featured:false },
  { slug:'milford-sound',        name:'Milford Sound — Fiordland',   city:'Te Anau',         country:'New Zealand',            country_code:'NZ', lat:-44.6418, lng:167.8974,  is_featured:false },
  { slug:'queenstown-nz',        name:'Queenstown — Lake Wakatipu',  city:'Queenstown',      country:'New Zealand',            country_code:'NZ', lat:-45.0312, lng:168.6626,  is_featured:false },

  // ─── AMERICAS ─────────────────────────────────────────────────────────────

  // USA (more)
  { slug:'new-york',             name:'New York Harbor',             city:'New York',        country:'United States',          country_code:'US', lat:40.7128,  lng:-74.0060,  is_featured:false },
  { slug:'chicago-lake-michigan',name:'Chicago — Lake Michigan',     city:'Chicago',         country:'United States',          country_code:'US', lat:41.8781,  lng:-87.6298,  is_featured:false },
  { slug:'lake-tahoe',           name:'Lake Tahoe',                  city:'South Lake Tahoe',country:'United States',          country_code:'US', lat:38.9333,  lng:-119.9844, is_featured:false },
  { slug:'lake-powell',          name:'Lake Powell',                 city:'Page',            country:'United States',          country_code:'US', lat:36.9860,  lng:-111.4883, is_featured:false },
  { slug:'lake-mead',            name:'Lake Mead — Nevada',          city:'Boulder City',    country:'United States',          country_code:'US', lat:36.1529,  lng:-114.4820, is_featured:false },
  { slug:'chesapeake-bay',       name:'Chesapeake Bay',              city:'Annapolis',       country:'United States',          country_code:'US', lat:38.9784,  lng:-76.4922,  is_featured:false },
  { slug:'boston-harbor',        name:'Boston Harbor',               city:'Boston',          country:'United States',          country_code:'US', lat:42.3601,  lng:-71.0589,  is_featured:false },
  { slug:'new-orleans',          name:'New Orleans — Mississippi River', city:'New Orleans', country:'United States',          country_code:'US', lat:29.9511,  lng:-90.0715,  is_featured:false },
  { slug:'galveston',            name:'Galveston — Gulf of Mexico',  city:'Galveston',       country:'United States',          country_code:'US', lat:29.3013,  lng:-94.7977,  is_featured:false },
  { slug:'puget-sound',          name:'Puget Sound — Seattle',       city:'Seattle',         country:'United States',          country_code:'US', lat:47.6062,  lng:-122.3321, is_featured:false },
  { slug:'lake-champlain',       name:'Lake Champlain',              city:'Burlington',      country:'United States',          country_code:'US', lat:44.4759,  lng:-73.2121,  is_featured:false },
  { slug:'finger-lakes',         name:'Finger Lakes — New York',     city:'Seneca Falls',    country:'United States',          country_code:'US', lat:42.9101,  lng:-76.9313,  is_featured:false },
  { slug:'great-lakes-michigan', name:'Lake Michigan',               city:'Traverse City',   country:'United States',          country_code:'US', lat:44.7631,  lng:-85.6206,  is_featured:false },
  { slug:'lake-superior',        name:'Lake Superior',               city:'Duluth',          country:'United States',          country_code:'US', lat:46.7867,  lng:-92.1005,  is_featured:false },
  { slug:'florida-keys',         name:'Florida Keys',                city:'Marathon',        country:'United States',          country_code:'US', lat:24.7215,  lng:-81.0498,  is_featured:false },
  { slug:'outer-banks',          name:'Outer Banks — North Carolina',city:'Nags Head',       country:'United States',          country_code:'US', lat:35.9582,  lng:-75.6241,  is_featured:false },
  { slug:'columbia-river',       name:'Columbia River — Oregon',     city:'Portland',        country:'United States',          country_code:'US', lat:45.5051,  lng:-122.6750, is_featured:false },

  // Canada (more)
  { slug:'vancouver',            name:'Vancouver — BC Coast',        city:'Vancouver',       country:'Canada',                 country_code:'CA', lat:49.2827,  lng:-123.1207, is_featured:false },
  { slug:'victoria-bc',          name:'Victoria — British Columbia', city:'Victoria',        country:'Canada',                 country_code:'CA', lat:48.4284,  lng:-123.3656, is_featured:false },
  { slug:'toronto',              name:'Toronto — Lake Ontario',      city:'Toronto',         country:'Canada',                 country_code:'CA', lat:43.6532,  lng:-79.3832,  is_featured:false },
  { slug:'thousand-islands',     name:'Thousand Islands',            city:'Kingston',        country:'Canada',                 country_code:'CA', lat:44.2334,  lng:-76.4897,  is_featured:false },
  { slug:'halifax',              name:'Halifax — Nova Scotia',       city:'Halifax',         country:'Canada',                 country_code:'CA', lat:44.6488,  lng:-63.5752,  is_featured:false },
  { slug:'muskoka-lakes',        name:'Muskoka Lakes — Ontario',     city:'Bracebridge',     country:'Canada',                 country_code:'CA', lat:45.0335,  lng:-79.3085,  is_featured:false },
  { slug:'prince-edward-island', name:'Prince Edward Island',        city:'Charlottetown',   country:'Canada',                 country_code:'CA', lat:46.2382,  lng:-63.1311,  is_featured:false },

  // Caribbean (more)
  { slug:'puerto-rico',          name:'Puerto Rico',                 city:'San Juan',        country:'Puerto Rico',            country_code:'PR', lat:18.4655,  lng:-66.1057,  is_featured:false },
  { slug:'dominican-republic',   name:'Dominican Republic',          city:'Punta Cana',      country:'Dominican Republic',     country_code:'DO', lat:18.4861,  lng:-69.9312,  is_featured:false },
  { slug:'cuba-havana',          name:'Cuba — Havana',               city:'Havana',          country:'Cuba',                   country_code:'CU', lat:23.1136,  lng:-82.3666,  is_featured:false },
  { slug:'turks-caicos',         name:'Turks & Caicos Islands',      city:'Providenciales',  country:'Turks and Caicos',       country_code:'TC', lat:21.6940,  lng:-71.7979,  is_featured:false },
  { slug:'cayman-islands',       name:'Cayman Islands',              city:'George Town',     country:'Cayman Islands',         country_code:'KY', lat:19.3222,  lng:-81.3846,  is_featured:false },
  { slug:'aruba',                name:'Aruba',                       city:'Oranjestad',      country:'Aruba',                  country_code:'AW', lat:12.5211,  lng:-70.0000,  is_featured:false },
  { slug:'curacao',              name:'Curaçao',                     city:'Willemstad',      country:'Curaçao',                country_code:'CW', lat:12.1696,  lng:-68.9900,  is_featured:false },
  { slug:'us-virgin-islands',    name:'US Virgin Islands',           city:'Charlotte Amalie',country:'United States Virgin Islands',country_code:'VI', lat:18.3358, lng:-64.8963,  is_featured:false },
  { slug:'grenada',              name:'Grenada',                     city:"St. George's",    country:'Grenada',                country_code:'GD', lat:12.1165,  lng:-61.6790,  is_featured:false },
  { slug:'st-vincent',           name:'St. Vincent & The Grenadines',city:'Kingstown',       country:'St. Vincent and the Grenadines',country_code:'VC', lat:13.2528, lng:-61.1971,  is_featured:false },
  { slug:'trinidad',             name:'Trinidad & Tobago',           city:'Port of Spain',   country:'Trinidad and Tobago',    country_code:'TT', lat:10.6918,  lng:-61.2225,  is_featured:false },
  { slug:'guadeloupe',           name:'Guadeloupe',                  city:'Pointe-à-Pitre',  country:'Guadeloupe',             country_code:'GP', lat:16.2650,  lng:-61.5510,  is_featured:false },
  { slug:'dominica',             name:'Dominica',                    city:'Roseau',          country:'Dominica',               country_code:'DM', lat:15.2976,  lng:-61.3900,  is_featured:false },

  // Central America
  { slug:'san-blas',             name:'San Blas Islands — Panama',   city:'Guna Yala',       country:'Panama',                 country_code:'PA', lat:9.5556,   lng:-78.9378,  is_featured:false },
  { slug:'costa-rica-guanacaste',name:'Costa Rica — Guanacaste',     city:'Tamarindo',       country:'Costa Rica',             country_code:'CR', lat:10.2997,  lng:-85.8390,  is_featured:false },
  { slug:'belize-ambergris',     name:'Ambergris Caye — Belize',     city:'San Pedro',       country:'Belize',                 country_code:'BZ', lat:17.9147,  lng:-87.9679,  is_featured:false },
  { slug:'lake-atitlan',         name:'Lake Atitlán — Guatemala',    city:'Panajachel',      country:'Guatemala',              country_code:'GT', lat:14.7451,  lng:-91.1651,  is_featured:false },

  // South America
  { slug:'cartagena',            name:'Cartagena — Caribbean Coast', city:'Cartagena',       country:'Colombia',               country_code:'CO', lat:10.3910,  lng:-75.4794,  is_featured:false },
  { slug:'san-andres',           name:'San Andrés Island',           city:'San Andrés',      country:'Colombia',               country_code:'CO', lat:12.5847,  lng:-81.7006,  is_featured:false },
  { slug:'galapagos',            name:'Galápagos Islands',           city:'Puerto Ayora',    country:'Ecuador',                country_code:'EC', lat:-0.7393,  lng:-90.2888,  is_featured:true  },
  { slug:'amazon-manaus',        name:'Amazon River — Manaus',       city:'Manaus',          country:'Brazil',                 country_code:'BR', lat:-3.1190,  lng:-60.0217,  is_featured:false },
  { slug:'rio-de-janeiro',       name:'Rio de Janeiro — Guanabara',  city:'Rio de Janeiro',  country:'Brazil',                 country_code:'BR', lat:-22.9068, lng:-43.1729,  is_featured:false },
  { slug:'fernando-noronha',     name:'Fernando de Noronha',         city:'Fernando de Noronha',country:'Brazil',              country_code:'BR', lat:-3.8540,  lng:-32.4253,  is_featured:false },
  { slug:'pantanal',             name:'Pantanal Wetlands',           city:'Corumbá',         country:'Brazil',                 country_code:'BR', lat:-18.0000, lng:-57.6500,  is_featured:false },
  { slug:'buenos-aires',         name:'Buenos Aires — Río de la Plata',city:'Buenos Aires',  country:'Argentina',              country_code:'AR', lat:-34.6037, lng:-58.3816,  is_featured:false },
  { slug:'patagonia-arg',        name:'Patagonia — Lake District',   city:'Bariloche',       country:'Argentina',              country_code:'AR', lat:-41.1335, lng:-71.3103,  is_featured:false },
  { slug:'los-roques',           name:'Los Roques Archipelago',      city:'Gran Roque',      country:'Venezuela',              country_code:'VE', lat:11.9386,  lng:-66.6695,  is_featured:false },
  { slug:'lake-titicaca',        name:'Lake Titicaca',               city:'Puno',            country:'Peru',                   country_code:'PE', lat:-15.8402, lng:-70.0219,  is_featured:false },
  { slug:'amazon-peru',          name:'Amazon River — Iquitos',      city:'Iquitos',         country:'Peru',                   country_code:'PE', lat:-3.7491,  lng:-73.2538,  is_featured:false },
  { slug:'chiloe',               name:'Chiloé Archipelago',          city:'Castro',          country:'Chile',                  country_code:'CL', lat:-42.4828, lng:-73.7628,  is_featured:false },
  { slug:'puerto-montt',         name:'Puerto Montt — Lake District',city:'Puerto Montt',    country:'Chile',                  country_code:'CL', lat:-41.4693, lng:-72.9424,  is_featured:false },
  { slug:'cabo-frio',            name:'Cabo Frio — Brazil',          city:'Cabo Frio',       country:'Brazil',                 country_code:'BR', lat:-22.8791, lng:-42.0192,  is_featured:false },

  // ─── RUSSIA & CENTRAL ASIA ───────────────────────────────────────────────

  { slug:'st-petersburg',        name:'St. Petersburg — Neva River', city:'St. Petersburg',  country:'Russia',                 country_code:'RU', lat:59.9311,  lng:30.3609,   is_featured:false },
  { slug:'lake-baikal',          name:'Lake Baikal',                 city:'Irkutsk',         country:'Russia',                 country_code:'RU', lat:53.5587,  lng:108.1650,  is_featured:false },
  { slug:'volga-river',          name:'Volga River',                 city:'Volgograd',       country:'Russia',                 country_code:'RU', lat:48.7080,  lng:44.5133,   is_featured:false },
  { slug:'sochi',                name:'Sochi — Black Sea',           city:'Sochi',           country:'Russia',                 country_code:'RU', lat:43.5992,  lng:39.7257,   is_featured:false },

  // Kazakhstan
  { slug:'aral-sea-balkhash',    name:'Lake Balkhash',               city:'Balkhash',        country:'Kazakhstan',             country_code:'KZ', lat:46.8484,  lng:74.9851,   is_featured:false },

  // Tajikistan
  { slug:'iskandarkul',          name:'Iskandarkul Lake',            city:'Ayni',            country:'Tajikistan',             country_code:'TJ', lat:39.0833,  lng:68.3667,   is_featured:false },

  // ─── MALDIVES & UAE (more detail) ────────────────────────────────────────

  { slug:'north-male-atoll',     name:'North Malé Atoll',            city:'Malé',            country:'Maldives',               country_code:'MV', lat:4.1755,   lng:73.5093,   is_featured:false },
  { slug:'south-ari-atoll',      name:'South Ari Atoll',             city:'Maamigili',       country:'Maldives',               country_code:'MV', lat:3.4500,   lng:72.8500,   is_featured:false },
  { slug:'baa-atoll',            name:'Baa Atoll — UNESCO Biosphere',city:'Eydhafushi',      country:'Maldives',               country_code:'MV', lat:5.0833,   lng:73.0000,   is_featured:false },
  { slug:'abu-dhabi',            name:'Abu Dhabi',                   city:'Abu Dhabi',       country:'UAE',                    country_code:'AE', lat:24.4539,  lng:54.3773,   is_featured:false },
  { slug:'ras-al-khaimah',       name:'Ras Al Khaimah',              city:'Ras Al Khaimah',  country:'UAE',                    country_code:'AE', lat:25.6724,  lng:55.9804,   is_featured:false },
  { slug:'fujairah',             name:'Fujairah — Gulf of Oman',     city:'Fujairah',        country:'UAE',                    country_code:'AE', lat:25.1288,  lng:56.3265,   is_featured:false },
]

async function seed() {
  console.log(`📍 Seeding ${locations.length} new locations…`)

  const chunkSize = 50
  let total = 0

  for (let i = 0; i < locations.length; i += chunkSize) {
    const chunk = locations.slice(i, i + chunkSize)
    const res = await fetch(SUPABASE_URL + '/rest/v1/locations?on_conflict=slug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Prefer': 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(chunk),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error(`❌ Chunk ${i}-${i+chunkSize} failed:`, JSON.stringify(data).slice(0, 300))
    } else {
      total += Array.isArray(data) ? data.length : 0
      console.log(`  ✅ Chunk ${i}–${i+chunkSize}: inserted/updated ${Array.isArray(data) ? data.length : 0}`)
    }
  }

  // Final count
  const countRes = await fetch(SUPABASE_URL + '/rest/v1/locations?select=count', {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY, 'Prefer': 'count=exact' }
  })
  const countRange = countRes.headers.get('content-range')
  console.log(`\n🌍 Total locations in DB: ${countRange ?? 'unknown'}`)
}

seed().catch(console.error)
