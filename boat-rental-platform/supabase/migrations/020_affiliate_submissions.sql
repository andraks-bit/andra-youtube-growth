-- Lead intake for the affiliate program: publishers submit their contact details
-- via the /affiliate landing page in exchange for a 5% referral commission. Public
-- form inserts via the service-role API (no public RLS); admins read/manage from
-- the dashboard.
create table if not exists affiliate_submissions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  phone         text,
  website       text,
  note          text,
  source        text,                                  -- campaign / referrer
  status        text not null default 'new',           -- new | contacted | approved | declined
  created_at    timestamptz not null default now()
);

create index if not exists affiliate_submissions_status_idx on affiliate_submissions(status, created_at desc);

alter table affiliate_submissions enable row level security;

drop policy if exists affiliate_submissions_admin_all on affiliate_submissions;
create policy affiliate_submissions_admin_all on affiliate_submissions for all
  using (coalesce((select is_admin from public.profiles where id = auth.uid()), false))
  with check (coalesce((select is_admin from public.profiles where id = auth.uid()), false));
