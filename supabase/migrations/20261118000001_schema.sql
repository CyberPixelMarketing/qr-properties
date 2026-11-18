-- =====================================================================
-- QR Properties — core schema
-- =====================================================================

create extension if not exists postgis with schema extensions;

-- ---------- Enums ----------
create type public.account_type     as enum ('office', 'individual');
create type public.user_role        as enum ('advertiser', 'admin');
create type public.listing_kind     as enum ('apartment', 'building', 'unit');
create type public.listing_purpose  as enum ('sale', 'rent');
create type public.listing_status   as enum ('draft', 'published', 'hidden');
create type public.sub_status       as enum ('active', 'trialing', 'past_due', 'canceled');
create type public.billing_interval as enum ('month', 'year');
create type public.event_type       as enum ('page_view', 'listing_view');
create type public.event_src        as enum ('qr', 'direct', 'share');
create type public.import_status    as enum ('pending', 'succeeded', 'failed');

-- ---------- Plans ----------
-- Limits live here so they can change without a deploy. NULL limit = unlimited.
create table public.plans (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  name_ar             text not null,
  name_en             text not null,
  price_monthly_aed   numeric(10,2),
  price_yearly_aed    numeric(10,2),
  max_listings        integer check (max_listings is null or max_listings >= 0),
  max_imports_per_day integer check (max_imports_per_day is null or max_imports_per_day >= 0),
  is_default          boolean not null default false,
  is_active           boolean not null default true,
  is_public           boolean not null default true,
  is_coming_soon      boolean not null default false,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now()
);
create unique index plans_single_default on public.plans (is_default) where is_default;

-- ---------- Profiles (advertisers) ----------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  account_type  public.account_type,
  display_name  text check (char_length(display_name) between 2 and 120),
  slug          text unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  logo_path     text,
  bio           text check (char_length(bio) <= 600),
  phone         text check (char_length(phone) <= 30),
  whatsapp      text check (char_length(whatsapp) <= 30),
  contact_email text check (char_length(contact_email) <= 254),
  locale        text not null default 'ar' check (locale in ('ar', 'en')),
  role          public.user_role not null default 'advertiser',
  is_suspended  boolean not null default false,
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_onboarded_complete check (
    onboarded_at is null
    or (display_name is not null and slug is not null and account_type is not null)
  )
);

-- Flexible "credential links" (licence, permit, website, socials...)
create table public.credential_links (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  label      text not null check (char_length(label) between 1 and 80),
  url        text not null check (url ~* '^https?://' and char_length(url) <= 2048),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index credential_links_profile_idx on public.credential_links (profile_id, sort_order);

-- ---------- Listings (apartment | building | unit) ----------
-- One table for all three kinds so images, views and sharing work uniformly.
-- Units belong to a building and inherit its location (they store none).
create table public.listings (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  kind         public.listing_kind not null,
  building_id  uuid references public.listings (id) on delete cascade,
  purpose      public.listing_purpose,
  status       public.listing_status not null default 'draft',
  title        text not null check (char_length(title) between 1 and 200),
  description  text check (char_length(description) <= 8000),
  price_aed    numeric(14,2) check (price_aed is null or price_aed >= 0),
  bedrooms     smallint check (bedrooms is null or bedrooms between 0 and 50),
  bathrooms    smallint check (bathrooms is null or bathrooms between 0 and 50),
  area_sqft    numeric(10,2) check (area_sqft is null or area_sqft > 0),
  maps_url     text check (maps_url is null or char_length(maps_url) <= 2048),
  lat          double precision check (lat is null or lat between -90 and 90),
  lng          double precision check (lng is null or lng between -180 and 180),
  location     extensions.geography(Point, 4326) generated always as (
                 case when lat is not null and lng is not null
                   then extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
                 end
               ) stored,
  address_text text check (char_length(address_text) <= 300),
  source_url   text check (source_url is null or char_length(source_url) <= 2048),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz,

  -- Units must point at a building; nothing else may.
  constraint listings_unit_has_building check ((kind = 'unit') = (building_id is not null)),
  -- Units inherit location and never store their own.
  constraint listings_unit_no_location check (kind <> 'unit' or (lat is null and lng is null and maps_url is null)),
  -- Apartments and buildings need a location before they leave draft.
  constraint listings_location_required check (
    kind = 'unit' or status = 'draft' or (lat is not null and lng is not null and maps_url is not null)
  ),
  -- Sellable things (apartment/unit) need purpose + price before they leave draft.
  constraint listings_sellable_complete check (
    kind = 'building' or status = 'draft' or (purpose is not null and price_aed is not null)
  ),
  constraint listings_lat_lng_together check ((lat is null) = (lng is null))
);
create index listings_owner_idx    on public.listings (owner_id, status, published_at desc);
create index listings_building_idx on public.listings (building_id);
create index listings_location_idx on public.listings using gist (location);

create table public.listing_images (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) <= 500),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index listing_images_listing_idx on public.listing_images (listing_id, sort_order);

-- ---------- Subscriptions (payment-ready, inactive for now) ----------
create table public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null references public.profiles (id) on delete cascade,
  plan_id            uuid not null references public.plans (id),
  status             public.sub_status not null default 'active',
  billing_interval   public.billing_interval,
  current_period_end timestamptz,
  provider           text,          -- e.g. 'stripe' later
  provider_ref       text,          -- provider subscription id
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index subscriptions_one_live
  on public.subscriptions (profile_id) where status in ('active', 'trialing', 'past_due');
create index subscriptions_plan_idx on public.subscriptions (plan_id);

-- ---------- Analytics events (no IP, no visitor location) ----------
create table public.events (
  id         bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  type       public.event_type not null,
  src        public.event_src not null default 'direct',
  created_at timestamptz not null default now()
);
create index events_profile_idx on public.events (profile_id, created_at desc);
create index events_listing_idx on public.events (listing_id);

-- ---------- Import-from-URL jobs (also used for rate limiting) ----------
create table public.import_jobs (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  url        text not null check (char_length(url) <= 2048),
  status     public.import_status not null default 'pending',
  error      text,
  listing_id uuid references public.listings (id) on delete set null,
  created_at timestamptz not null default now()
);
create index import_jobs_profile_idx on public.import_jobs (profile_id, created_at desc);
create index import_jobs_listing_idx on public.import_jobs (listing_id);

-- ---------- Reference data: plans ----------
insert into public.plans
  (code, name_ar, name_en, price_monthly_aed, price_yearly_aed, max_listings, max_imports_per_day, is_default, is_coming_soon, sort_order)
values
  ('free',     'المجانية',  'Free',     0,    0,    25,   10,   true,  false, 0),
  ('pro',      'الاحترافية', 'Pro',      null, null, 200,  50,   false, true,  1),
  ('business', 'الأعمال',   'Business', null, null, null, 200,  false, true,  2);
