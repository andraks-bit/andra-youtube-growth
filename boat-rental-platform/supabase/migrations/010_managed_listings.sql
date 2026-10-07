-- Managed listings: boats BoatHire24 lists on behalf of owners who haven't
-- signed up. They live under a dedicated "BoatHire24" host account
-- (profiles.is_managed_account = true) and carry a private owner-contact row
-- used to chase availability when a booking is requested. Owner contacts are
-- NEVER exposed publicly.

-- 1. Flag the dedicated managed host account.
alter table profiles add column if not exists is_managed_account boolean not null default false;

-- 2. Private owner-contact registry, one row per managed boat.
create table if not exists managed_owner_contacts (
  id            uuid primary key default gen_random_uuid(),
  boat_id       uuid not null unique references boats(id) on delete cascade,
  owner_name    text,
  owner_email   text,
  owner_phone   text,
  owner_website text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table managed_owner_contacts enable row level security;

-- Only admins manage these from the dashboard. Server routes that need them
-- (e.g. the booking-inquiry email) use the service-role client, which bypasses
-- RLS, so no public policy is needed.
drop policy if exists managed_owner_contacts_admin_all on managed_owner_contacts;
create policy managed_owner_contacts_admin_all on managed_owner_contacts for all
  using (coalesce((select is_admin from public.profiles where id = auth.uid()), false))
  with check (coalesce((select is_admin from public.profiles where id = auth.uid()), false));
