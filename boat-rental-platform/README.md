# BoatHire24 🚢

**Global boat rental marketplace** — Airbnb for boats. Built with Next.js 14, Supabase, and Stripe Connect.

---

## What it does

Two-sided marketplace where boat owners list their vessels and renters discover, book, and pay — all in one platform.

- 🔍 **Search** — filter by location, boat type, capacity, date, instant book
- 🗺️ **Map view** — Mapbox pins with live prices
- 📅 **Availability calendar** — real-time blocked/booked dates
- 💳 **Payments** — Stripe PaymentElement (card, Apple Pay, Google Pay)
- 🏦 **Host payouts** — Stripe Connect Express, 15% platform fee
- 💬 **Messaging** — Supabase Realtime chat between hosts and renters
- ⭐ **Reviews** — bidirectional post-booking reviews
- 🛥️ **Host tools** — listing wizard, calendar editor, earnings dashboard

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (Postgres + Auth + Storage + Realtime) |
| Payments | Stripe Connect Express |
| Maps | Mapbox GL JS |
| Email | Resend |
| Hosting | Vercel |

---

## Project structure

```
app/
  page.tsx                    # Homepage: search hero + featured locations
  search/page.tsx             # Results grid + Mapbox sidebar
  [location]/page.tsx         # /marbella, /ibiza, /miami …
  boats/[slug]/page.tsx       # Listing detail: gallery, calendar, booking widget
  boats/[slug]/book/page.tsx  # Checkout flow (Stripe)
  bookings/[id]/page.tsx      # Booking status + review
  dashboard/page.tsx          # Renter: trips + messages
  host/page.tsx               # Host dashboard: stats + listings + bookings
  host/listings/              # CRUD for boats (5-step wizard)
  host/calendar/              # Block/unblock dates
  host/bookings/              # Accept/decline requests
  host/earnings/              # Revenue + payout history
  api/                        # Stripe webhook, bookings, availability, host actions
components/
  search/                     # SearchBar, Filters, BoatCard
  listing/                    # Gallery, AvailabilityCalendar, Reviews
  booking/                    # BookingWidget
  host/                       # ListingWizard (5-step)
  messaging/                  # ChatThread (Supabase Realtime)
  nav/                        # SiteNav
  ui/                         # Button, Badge, Input, Select … (shadcn)
lib/
  supabase/client.ts          # Browser client
  supabase/server.ts          # Server client (SSR cookies)
  stripe/index.ts             # PaymentIntent, Connect account helpers
  utils/pricing.ts            # Fee calculation
supabase/
  migrations/001_initial.sql  # Full schema: 12 tables, RLS, enums, triggers
  seed/marbella.ts            # Import Marbella fleet (18 boats)
types/database.ts             # TypeScript row types
```

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/mardo89/boat-rental-platform
cd boat-rental-platform
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Run `supabase/migrations/001_initial.sql` in the SQL editor
3. Create a Storage bucket named `boat-images` (public)
4. Copy your project URL and keys

### 3. Set up Stripe Connect

1. Create a Stripe account → enable Connect → Express accounts
2. Get publishable key, secret key, and webhook secret (`whsec_…`)

### 4. Configure environment variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_MAPBOX_TOKEN=pk....
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=bookings@yourdomain.com

NEXT_PUBLIC_APP_URL=http://localhost:3001
PLATFORM_FEE_PERCENT=15
```

### 5. Run

```bash
npm run dev -- --port 3001
# Open http://localhost:3001
```

### 6. Seed Marbella fleet (optional)

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  npx ts-node --esm supabase/seed/marbella.ts
```

---

## Deploy to Vercel

1. Import this repo at [vercel.com/new](https://vercel.com/new)
2. Add all environment variables in Vercel dashboard
3. Set Stripe webhook: `https://yourdomain.com/api/stripe/webhook`

---

## Roadmap

- [ ] Real-time unread message badge
- [ ] Multi-currency support
- [ ] Admin panel for platform management
- [ ] More locations: Ibiza, Miami, Santorini, Dubai
- [ ] Mobile app (React Native)

---

## License

MIT
