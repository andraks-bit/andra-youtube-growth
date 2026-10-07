-- ─── BOOKING REMINDERS ──────────────────────────────────────────────────────
-- Idempotency flags so the hourly reminders cron sends each reminder at most once.
alter table bookings add column if not exists trip_reminder_sent_at    timestamptz;
alter table bookings add column if not exists payment_reminder_sent_at timestamptz;

-- Help the cron's window queries.
create index if not exists bookings_start_idx on bookings(start_datetime);
