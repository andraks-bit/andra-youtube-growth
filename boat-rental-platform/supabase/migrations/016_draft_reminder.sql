-- 016 — Draft-publish reminder. Stamps when we emailed a host about a boat
-- they left unpublished, so each draft is reminded at most once.
alter table public.boats
  add column if not exists draft_reminder_sent_at timestamptz;
