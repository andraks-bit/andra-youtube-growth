-- 007_payouts_auto_replies.sql
-- (1) Payout ledger for automatic host payouts (cron /api/cron/payouts)
-- (2) Host preference for instant AI replies to guest messages

-- ─── Auto-reply preference (default on) ─────────────────────────────────────
alter table profiles add column if not exists auto_reply_enabled boolean not null default true;

-- ─── Payout ledger: one payout per booking ───────────────────────────────────
-- method: stripe_destination = host's 85% was routed at payment time (destination charge)
--         stripe_transfer    = we transferred the 85% from the platform balance after the trip
--         manual_bank        = host has no Stripe account; paid by bank transfer (admin)
create table if not exists public.payouts (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null unique references bookings(id) on delete cascade,
  host_id            uuid not null references auth.users(id) on delete cascade,
  amount             integer not null check (amount >= 0),   -- whole currency units (host share)
  currency           text not null default 'EUR',
  method             text not null check (method in ('stripe_destination','stripe_transfer','manual_bank','none')),
  status             text not null default 'due' check (status in ('due','processing','paid','failed')),
  stripe_transfer_id text,
  error              text,
  created_at         timestamptz not null default now(),
  paid_at            timestamptz
);
create index if not exists payouts_host_idx   on public.payouts (host_id);
create index if not exists payouts_status_idx on public.payouts (status);

alter table public.payouts enable row level security;
drop policy if exists payouts_host_read on public.payouts;
create policy payouts_host_read on public.payouts for select using (auth.uid() = host_id);
-- Writes happen only via the service-role key (cron + admin routes).

-- Help the payout cron find finished trips.
create index if not exists bookings_end_idx on bookings (end_datetime);
