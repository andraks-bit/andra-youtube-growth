-- 017 — Boat tours category. Same pattern as is_fishing_trip: a flag that also
-- lists the boat in the dedicated /boat-tours section (it stays in Explore).
alter table public.boats
  add column if not exists is_boat_tour boolean not null default false;
create index if not exists boats_is_boat_tour_idx on public.boats (is_boat_tour) where is_boat_tour;
