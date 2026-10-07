# Website Import Playbook (managed / concierge listings)

How we turn an operator's website link into clean, correct BoatHire24 listings under
their lead. Distilled from real imports: Corfu/Costa Boats (Shopify), Furious Nautisme
(WordPress), SK-Yachting (Tilda), Yacht Rental Phuket, Hvar Excursions, Gold Coast.

The in-app self-serve importer lives at `app/host/fleet/website/` +
`app/api/host/import-website/{scan,extract,import,screenshot}`. For managed/concierge
bulk imports we usually script it (service-role REST + the source site + DeepSeek for
copy) — see `scripts/import-*.mjs` for worked examples. Same rules either way.

---

## 0. Golden rules

- **DRY-RUN first, always.** Print a reconciliation table (site price/img vs DB
  price/img per boat) before writing. Never overwrite correct data on a bad parse.
- **Never create a second copy of a boat that already exists.** Re-check by name
  before inserting (see §4, §5). Re-imports are the #1 source of duplicates.
- **Rehost every image** into the `boat-images` bucket (`<prefix>/<boatId>/<i>.jpg`).
  Never store the source CDN URL.
- Managed boats: `host_id` = the account where `profiles.is_managed_account = true`
  (resolve it, don't hardcode), `submission_id` = the lead's id, `location_id` = the
  lead's city. Publish per the operator's call (drafts by default; some sets go active).

## 1. Identify the platform first — it decides the extraction method

| Signal in the page/HTML | Platform | Best source |
|---|---|---|
| `cdn.shopify.com`, `/cart`, `Shopify` | **Shopify** | `/collections/<handle>/products.json?limit=50` (or `/products.json`) |
| `/wp-content/`, `wp-json`, detail pages under `/details/` | **WordPress** | the per-boat detail page HTML |
| `tildacdn`, `static.tildacdn.com` | **Tilda** | HTML, but WAF-blocked (see §6) |
| none of the above | generic | DeepSeek text extraction (the in-app `extract` route) |

### Shopify (cleanest — structured JSON, no scraping)
`GET https://<site>/collections/<handle>/products.json?limit=50` returns
`products[]` with `title`, `variants[].price` (min = the "From" price), `images[].src`,
`body_html`. Notes:
- The product **handle can differ from the title** (e.g. Protagon 20 lived at handle
  `compass-150cc`) — match boats **by title**, not handle.
- Prices are usually a per-hour "From €X" (Corfu: Compass 150cc €45/hr).

### WordPress (per-boat detail pages)
- Boat pages redirect (301) to a trailing slash — fetch with `-L` / `redirect:'follow'`.
- Price lives in prose: `From €X to €Y per half-day` and `From €X to €Y per day`
  (full-day). See §3 for the min-of-range rule.
- Rental variants are separate pages: `-half-day-rentals` (=4h) and
  `-full-day-rentals` (=8h). A "Prestige"/upgraded trim is often a **separate boat**,
  not a variant (Furious had both `tempest-700` and `tempest-700-prestige`).
- Images under `/wp-content/uploads/YYYY/MM/` — see §2.

## 2. Images

- **Strip size variants**: drop the `-WIDTHxHEIGHT` suffix (`…-01-1024x768.jpg` →
  `…-01.jpg`). Also drop WordPress **`-scaled`** twins (same photo, different max res →
  visual duplicate). Keep one URL per photo.
- **Exclude site chrome**: filenames containing `bg-`, `favicon`, `logo`, `icon`,
  `cropped-`, `placeholder`, `avatar`, `sprite`.
- **Verify ownership before attributing.** A gallery may include "similar boats"
  thumbnails. Confirm a boat's photo filenames appear **only on that boat's page**
  before adding them (Tempest 900's `location-bateau-mandelieu-0N` files were generic-
  looking but confirmed unique to its page → safe).
- **Byte-hash (md5) de-dup.** Rehosted storage URLs are always unique, so URL-compare
  can't catch dupes — hash the downloaded bytes and skip repeats. Catches both intra-
  boat repeats and cross-boat sister-ship bleed.
- **Never shrink a good gallery.** Only top up when the DB has *fewer* valid photos
  than the source. Validate that stored images actually load (GET → 200 + `image/*`)
  when auditing "does each boat show its photos".

## 3. Pricing

- **"From €X" is the customer-facing STARTING price.** For a range `From €A to €B`,
  use **min(A, B)** — the site sometimes writes it high→low (Ranieri: "From €490 to
  €280 per half-day" → the real "from" is €280).
- **Map to our duration slots by the site's rental unit:**
  - Per-hour site (Shopify "From €45"): `2h = 2×, 4h = 4×, 8h = 8×`, `min_hours = 2`.
  - Half-day / full-day site (WordPress): `4h` = half-day "from", `8h` = full-day
    "from", `min_hours = 4`.
- **Keep 4h < 8h coherent.** If the source is self-contradictory (Ranieri listed a
  full day cheaper than a half day), pick coherent real numbers and **flag it to the
  operator** rather than shipping a 4h ≥ 8h listing.
- We only touch the slot the operator asks for (usually 4h); leave the rest unless
  fixing an incoherence you introduced.

## 4. Boat de-dup (name matching) — `sameBoat` in `WebsiteImportClient.tsx`
Normalize name tokens; **digits inside a token are numbers** (so `51ft` ≠ `58ft`);
number **subset** rule (`Femis Aqua 24` matches `Femis Aqua 24 T5`); 1-typo fuzzy word
match; `NAME_NOISE` drops lancha/velero/yacht/luxury/deluxe/premium/etc. Dedupe across
paginated pages, keeping the richer copy.

## 5. Duplicate / orphan detection (the re-import trap)
A second import run can leave **two copies of every boat**:
- **Canonical**: linked to the lead (`submission_id` set), often a `-2`/suffixed slug
  (the orphan grabbed the base slug first), correct price, full photo set.
- **Orphan**: `submission_id = NULL`, the **base** slug, frequently `active`, **1
  photo**, **wrong price**. `/admin/leads` groups only by `submission_id`, so orphans
  are **invisible in the lead card but still public** — they can shadow the good set.

Audit: `boats?slug=like.<cityprefix>-*`, compare per-name image counts + prices; the
copy whose price matches the source "From" and has more photos is canonical. Delete the
orphans. Delete path mirrors `/api/admin/delete-boat`: clear `reviews` + `conversations`
first (no cascade), then delete the boat (pricing/images/features cascade); boats with
bookings FK-block and are kept.

## 6. Fetch / WAF workarounds
- **Tilda / SiteGround 403** on server fetch → send **full browser headers**
  (`User-Agent`, `Accept`, `Accept-Language`, `Referer`, `sec-ch-ua-platform`,
  `Sec-Fetch-*`), or fetch **in-browser via the operator's session**
  (`credentials:'include'`).
- **Category grids often omit boats** — cross-check the full fleet against
  `sitemap.xml` (SK-Yachting listed 31 in the grid, 34 in the sitemap).
- WordPress image CDN proxy `i0.wp.com/<url>` works when direct hotlinking is blocked.

## 7. Reconciliation flow (add missing + update existing)
1. Enumerate the site's **full fleet** (§1).
2. Pull the lead's existing boats; map by name (§4).
3. **DRY-run** a diff table: `site4h | db4h | siteImg | dbImg | action`.
4. Apply: **create** missing boats, **update** prices that differ, **top up** short
   galleries — each guarded so a parse miss can't clobber good data.
5. Verify: count matches the site, every boat has photos that load, all pricing
   coherent. Screenshot one new boat page as proof.
