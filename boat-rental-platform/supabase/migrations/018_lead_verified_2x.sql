-- 018 — Admin-only "Verified 2×" mark on leads: ticked after a lead's listings
-- have been manually double-checked.
alter table public.listing_submissions
  add column if not exists verified_2x boolean not null default false;
