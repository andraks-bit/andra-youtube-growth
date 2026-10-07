-- Lead intake for the managed/concierge model: operators submit their website
-- and boats via the /get-listed landing page. BoatHire24 lists them at the
-- owner's price + 15% margin on top. Public form inserts via the service-role
-- API (no public RLS); admins read/manage from the dashboard.
create table if not exists listing_submissions (
  id            uuid primary key default gen_random_uuid(),
  contact_name  text,
  company       text,
  website       text,
  email         text,
  phone         text,
  boats         jsonb not null default '[]'::jsonb,   -- [{name, url, price}]
  note          text,
  source        text,                                  -- outreach campaign / referrer
  status        text not null default 'new',           -- new | contacted | imported | declined
  created_at    timestamptz not null default now()
);

create index if not exists listing_submissions_status_idx on listing_submissions(status, created_at desc);

alter table listing_submissions enable row level security;

drop policy if exists listing_submissions_admin_all on listing_submissions;
create policy listing_submissions_admin_all on listing_submissions for all
  using (coalesce((select is_admin from public.profiles where id = auth.uid()), false))
  with check (coalesce((select is_admin from public.profiles where id = auth.uid()), false));
