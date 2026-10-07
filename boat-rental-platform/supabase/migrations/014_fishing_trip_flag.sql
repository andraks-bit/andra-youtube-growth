-- Mark a boat as a "fishing trip": it then appears ONLY in the Fishing trips
-- section (/fishing-trips) and is excluded from the general Explore search.
alter table boats add column if not exists is_fishing_trip boolean not null default false;
create index if not exists boats_is_fishing_trip_idx on boats(is_fishing_trip) where is_fishing_trip;

-- Existing sport-fishing boats are fishing trips by default.
update boats set is_fishing_trip = true where type = 'fishing' and is_fishing_trip = false;
