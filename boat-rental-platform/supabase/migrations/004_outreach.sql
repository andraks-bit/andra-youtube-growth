-- 004_outreach.sql
-- Lawful B2B supply outreach: leads, send log, and opt-out suppression.
-- Only for contacting businesses' OWN published contact addresses, with a
-- working unsubscribe in every email (GDPR / ePrivacy legitimate interest).

-- ---------- Leads ----------
create table if not exists public.outreach_leads (
  id            uuid primary key default gen_random_uuid(),
  company       text not null,
  location      text,
  boat_type     text,
  email         text not null,
  phone         text,
  website       text,
  lang          text not null default 'en' check (lang in ('en','es')),
  priority      text not null default 'medium' check (priority in ('high','medium','low')),
  status        text not null default 'not_started'
                check (status in ('not_started','researching','emailed','replied',
                                  'call_booked','onboarding','live','not_interested')),
  source        text,                 -- e.g. 'company website contact page'
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists outreach_leads_email_key on public.outreach_leads (lower(email));

-- ---------- Send log (one row per email actually sent) ----------
create table if not exists public.outreach_sends (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references public.outreach_leads(id) on delete set null,
  email         text not null,
  template      text not null,        -- 'first' | 'followup'
  subject       text,
  provider_id   text,                 -- Resend message id
  status        text not null default 'sent',
  sent_at       timestamptz not null default now()
);
create index if not exists outreach_sends_email_idx on public.outreach_sends (lower(email));

-- ---------- Suppression / opt-out list ----------
create table if not exists public.outreach_suppression (
  email         text primary key,
  reason        text not null default 'unsubscribe', -- 'unsubscribe' | 'bounce' | 'complaint' | 'manual'
  created_at    timestamptz not null default now()
);

-- RLS: these tables are operated only via the service-role key (server scripts
-- and the unsubscribe route). Enable RLS and add NO public policies, so the
-- anon/auth keys cannot read or write them. Service role bypasses RLS.
alter table public.outreach_leads       enable row level security;
alter table public.outreach_sends       enable row level security;
alter table public.outreach_suppression enable row level security;
