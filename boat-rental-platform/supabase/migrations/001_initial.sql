-- uuid-ossp no longer needed — gen_random_uuid() is built-in since Postgres 13
-- create extension if not exists "uuid-ossp";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────
create type boat_type as enum ('motor_yacht','catamaran','sailing','speedboat','fishing','rib','luxury');
create type pricing_type as enum ('hourly','daily');
create type season_type as enum ('all','peak','shoulder','off');
create type availability_status as enum ('available','blocked','booked');
create type booking_status as enum ('pending','confirmed','cancelled','completed');
create type cancellation_policy as enum ('flexible','moderate','strict');
create type listing_status as enum ('draft','active','paused');
create type review_type as enum ('renter_review','host_review');

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  bio text,
  stripe_account_id text unique,
  stripe_customer_id text unique,
  host_since timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── LOCATIONS ────────────────────────────────────────────────────────────────
create table locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  city text not null,
  country text not null,
  country_code char(2) not null,
  lat double precision not null,
  lng double precision not null,
  description text,
  image_url text,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── BOATS ────────────────────────────────────────────────────────────────────
create table boats (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles(id) on delete cascade,
  location_id uuid not null references locations(id),
  slug text not null unique,
  name text not null,
  tagline text,
  description text,
  type boat_type not null,
  length_m numeric(5,1),
  capacity_pax smallint not null check (capacity_pax > 0),
  cabins smallint,
  bathrooms smallint,
  builder text,
  model_year smallint,
  departure_port text,
  marina_lat double precision,
  marina_lng double precision,
  includes_skipper boolean not null default true,
  includes_fuel boolean not null default true,
  includes_drinks boolean not null default false,
  min_hours smallint not null default 2,
  pricing_type pricing_type not null default 'hourly',
  instant_book boolean not null default false,
  cancellation_policy cancellation_policy not null default 'moderate',
  status listing_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index boats_location_idx on boats(location_id);
create index boats_status_idx on boats(status);
create index boats_type_idx on boats(type);

-- ─── BOAT PRICING ─────────────────────────────────────────────────────────────
create table boat_pricing (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references boats(id) on delete cascade,
  duration_hours smallint,
  duration_days smallint,
  price integer not null check (price > 0),
  currency char(3) not null default 'EUR',
  season season_type not null default 'all',
  valid_from date,
  valid_until date,
  constraint one_duration check (
    (duration_hours is not null and duration_days is null)
    or (duration_days is not null and duration_hours is null)
  )
);

create index boat_pricing_boat_idx on boat_pricing(boat_id);

-- ─── BOAT IMAGES ──────────────────────────────────────────────────────────────
create table boat_images (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references boats(id) on delete cascade,
  storage_url text not null,
  alt text,
  sort_order smallint not null default 0,
  is_hero boolean not null default false
);

create index boat_images_boat_idx on boat_images(boat_id);

-- ─── BOAT FEATURES ────────────────────────────────────────────────────────────
create table boat_features (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references boats(id) on delete cascade,
  feature text not null
);

create index boat_features_boat_idx on boat_features(boat_id);

-- ─── AVAILABILITY ─────────────────────────────────────────────────────────────
create table availability (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references boats(id) on delete cascade,
  date date not null,
  status availability_status not null default 'available',
  unique(boat_id, date)
);

create index availability_boat_date_idx on availability(boat_id, date);

-- ─── BOOKINGS ─────────────────────────────────────────────────────────────────
create table bookings (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references boats(id),
  renter_id uuid not null references profiles(id),
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  duration_hours numeric(5,1),
  guests_count smallint not null check (guests_count > 0),
  subtotal integer not null check (subtotal > 0),
  service_fee integer not null default 0,
  total integer not null check (total > 0),
  currency char(3) not null default 'EUR',
  status booking_status not null default 'pending',
  stripe_payment_intent_id text unique,
  special_requests text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_boat_idx on bookings(boat_id);
create index bookings_renter_idx on bookings(renter_id);
create index bookings_status_idx on bookings(status);

-- ─── REVIEWS ──────────────────────────────────────────────────────────────────
create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  reviewer_id uuid not null references profiles(id),
  reviewee_id uuid not null references profiles(id),
  boat_id uuid not null references boats(id),
  rating smallint not null check (rating between 1 and 5),
  body text,
  type review_type not null,
  created_at timestamptz not null default now(),
  unique(booking_id, type)
);

create index reviews_boat_idx on reviews(boat_id);
create index reviews_reviewee_idx on reviews(reviewee_id);

-- ─── CONVERSATIONS + MESSAGES ─────────────────────────────────────────────────
create table conversations (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid references boats(id),
  booking_id uuid references bookings(id),
  participant_ids uuid[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on messages(conversation_id);
create index messages_sender_idx on messages(sender_id);

-- ─── WISHLISTS ────────────────────────────────────────────────────────────────
create table wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  boat_id uuid not null references boats(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, boat_id)
);

-- ─── UPDATED_AT TRIGGERS ──────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_boats_updated_at before update on boats
  for each row execute procedure set_updated_at();
create trigger set_bookings_updated_at before update on bookings
  for each row execute procedure set_updated_at();
create trigger set_profiles_updated_at before update on profiles
  for each row execute procedure set_updated_at();
create trigger set_conversations_updated_at before update on conversations
  for each row execute procedure set_updated_at();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table boats enable row level security;
alter table boat_pricing enable row level security;
alter table boat_images enable row level security;
alter table boat_features enable row level security;
alter table availability enable row level security;
alter table bookings enable row level security;
alter table reviews enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table wishlists enable row level security;
alter table locations enable row level security;

-- profiles: public read, own write
create policy "profiles_read_all" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- locations: public read
create policy "locations_read_all" on locations for select using (true);

-- boats: active listings public read; host can manage own
create policy "boats_read_active" on boats for select using (status = 'active' or host_id = auth.uid());
create policy "boats_insert_own" on boats for insert with check (host_id = auth.uid());
create policy "boats_update_own" on boats for update using (host_id = auth.uid());
create policy "boats_delete_own" on boats for delete using (host_id = auth.uid());

-- boat_pricing, boat_images, boat_features: public read, host write
create policy "boat_pricing_read" on boat_pricing for select using (true);
create policy "boat_pricing_host_write" on boat_pricing for all using (
  boat_id in (select id from boats where host_id = auth.uid())
);
create policy "boat_images_read" on boat_images for select using (true);
create policy "boat_images_host_write" on boat_images for all using (
  boat_id in (select id from boats where host_id = auth.uid())
);
create policy "boat_features_read" on boat_features for select using (true);
create policy "boat_features_host_write" on boat_features for all using (
  boat_id in (select id from boats where host_id = auth.uid())
);

-- availability: public read, host write
create policy "availability_read" on availability for select using (true);
create policy "availability_host_write" on availability for all using (
  boat_id in (select id from boats where host_id = auth.uid())
);

-- bookings: renter and host of boat see own bookings
create policy "bookings_read_own" on bookings for select using (
  renter_id = auth.uid() or
  boat_id in (select id from boats where host_id = auth.uid())
);
create policy "bookings_insert_renter" on bookings for insert with check (renter_id = auth.uid());
create policy "bookings_update_own" on bookings for update using (
  renter_id = auth.uid() or
  boat_id in (select id from boats where host_id = auth.uid())
);

-- reviews: public read, reviewer write own
create policy "reviews_read_all" on reviews for select using (true);
create policy "reviews_insert_own" on reviews for insert with check (reviewer_id = auth.uid());

-- conversations: participants only
create policy "conversations_read_participant" on conversations for select using (auth.uid() = any(participant_ids));
create policy "conversations_insert" on conversations for insert with check (auth.uid() = any(participant_ids));

-- messages: conversation participants only
create policy "messages_read_participant" on messages for select using (
  conversation_id in (
    select id from conversations where auth.uid() = any(participant_ids)
  )
);
create policy "messages_insert_participant" on messages for insert with check (
  sender_id = auth.uid() and
  conversation_id in (
    select id from conversations where auth.uid() = any(participant_ids)
  )
);

-- wishlists: own only
create policy "wishlists_own" on wishlists for all using (user_id = auth.uid());

-- ─── HELPER VIEW: boats with avg rating ───────────────────────────────────────
create or replace view boats_with_stats as
select
  b.*,
  coalesce(avg(r.rating), 0)::numeric(3,2) as avg_rating,
  count(r.id) as review_count
from boats b
left join reviews r on r.boat_id = b.id
group by b.id;
