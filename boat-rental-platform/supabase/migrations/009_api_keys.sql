-- Partner API keys: a shareable key grants read access to ONE host's fleet
-- (e.g. all of Andra's boats) via the public /api/v1/boats endpoint.
create table if not exists api_keys (
  id           uuid primary key default gen_random_uuid(),
  key          text unique not null,
  host_id      uuid not null references profiles(id) on delete cascade,
  label        text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists api_keys_key_idx on api_keys(key) where active;

alter table api_keys enable row level security;

-- Only admins manage keys from the dashboard. The public API validates keys
-- with the service-role client (which bypasses RLS), so no public policy needed.
drop policy if exists api_keys_admin_all on api_keys;
create policy api_keys_admin_all on api_keys for all
  using (coalesce((select is_admin from public.profiles where id = auth.uid()), false))
  with check (coalesce((select is_admin from public.profiles where id = auth.uid()), false));
