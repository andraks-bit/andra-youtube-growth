-- 019 — Calendar (iCal / webcal) sync.
-- Hosts import an external calendar (iCloud "Public Calendar", Google "Secret
-- iCal address", Airbnb/Booking.com export, …) to auto-block dates, and export a
-- per-boat BoatHire24 .ics feed to subscribe to from their own calendar app.
alter table public.boats
  add column if not exists ical_url         text,        -- host's external calendar we import
  add column if not exists ical_last_sync   timestamptz,
  add column if not exists ical_sync_status text,         -- 'ok' | 'error' | null
  add column if not exists ical_sync_error  text,
  add column if not exists ical_token       text;         -- opaque token for the export feed URL

create unique index if not exists boats_ical_token_key on public.boats (ical_token) where ical_token is not null;

-- Tag availability rows by origin so re-syncs replace ONLY imported blocks,
-- never real bookings ('booking'/'booked') or the host's manual blocks.
alter table public.availability
  add column if not exists source text not null default 'manual';  -- 'manual' | 'ical' | 'booking'
