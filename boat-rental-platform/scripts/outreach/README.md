# Supply Outreach Module

A small, **compliant** B2B outreach engine for recruiting Costa del Sol charter
operators onto BoatHire24. It only emails businesses at their **own publicly
published** contact addresses, every email has a working **unsubscribe**, sends
are **throttled**, opt-outs are permanently **suppressed**, and it runs in
**dry-run by default**.

> This is for lawful business outreach only. Do **not** load scraped personal
> contacts or addresses harvested from other platforms.

## Files

| File | Purpose |
|---|---|
| `../../supabase/migrations/004_outreach.sql` | `outreach_leads`, `outreach_sends`, `outreach_suppression` tables |
| `../../app/api/outreach/unsubscribe/route.ts` | One-click opt-out endpoint (HMAC-signed) |
| `templates.mjs` | EN/ES first-touch + follow-up templates |
| `seed-leads.mjs` | Loads the 9 confirmed operators into `outreach_leads` |
| `send.mjs` | Personalized, throttled sender (dry-run unless `--send`) |

## Setup

1. **Run the migration** (Supabase SQL editor or your migration runner):
   `supabase/migrations/004_outreach.sql`

2. **Add env vars** (`.env.local` and Vercel):
   ```env
   OUTREACH_SECRET=<random-long-string>        # signs unsubscribe links
   OUTREACH_FROM=partners@boathire24.com       # send from a NON-primary address
   OUTREACH_SENDER_NAME=Your Name
   OUTREACH_SENDER_PHONE=+34 ...
   ```
   Verify `partners@boathire24.com` (and the domain's SPF/DKIM/DMARC) in Resend first.

3. **Seed leads:**
   ```bash
   node scripts/outreach/seed-leads.mjs
   ```

## Send

```bash
# 1) Always dry-run first — prints exactly what WOULD send, sends nothing:
node scripts/outreach/send.mjs

# 2) When happy, send for real (defaults: max 15, 45s apart):
node scripts/outreach/send.mjs --send --limit 9 --delay 60

# Follow-ups (only to leads already 'emailed'), a few days later:
node scripts/outreach/send.mjs --template followup --send
```

Flags: `--send`, `--template first|followup`, `--limit N`, `--delay SEC`, `--from addr`.

## Compliance rules baked in

- Sends only to addresses already in `outreach_leads` (your verified business list).
- Skips any address on the suppression list and any placeholder/unverified email.
- Every email includes a visible unsubscribe link **and** `List-Unsubscribe` headers.
- Throttled + daily limit to protect domain reputation.
- Honor every opt-out and reply; never re-add a suppressed address.

## Good practice

- Keep volume low (≤ ~20/day) and personalize. This list is small — quality beats automation.
- Send from `partners@`, not `info@`, so your booking emails stay safe.
- Move to a dedicated tool (Instantly/Lemlist/HubSpot) only once you scale to hundreds of leads.
