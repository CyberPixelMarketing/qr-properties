-- =====================================================================
-- Helper functions, triggers, RPCs
-- =====================================================================

-- ---------- Generic updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_updated_at      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger listings_updated_at      before update on public.listings      for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

-- ---------- Role helpers (security definer: used inside RLS, avoid recursion) ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and not is_suspended
  );
$$;

create or replace function public.is_profile_active(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = p_id and not is_suspended and onboarded_at is not null
  );
$$;

create or replace function public.is_building_published(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listings
    where id = p_id and kind = 'building' and status = 'published'
  );
$$;

-- ---------- Plans ----------
-- The plan currently in force for a profile: live subscription, else the default plan.
create or replace function public.current_plan(p_profile uuid)
returns public.plans language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p from public.subscriptions s join public.plans p on p.id = s.plan_id
      where s.profile_id = p_profile and s.status in ('active', 'trialing', 'past_due')
      order by s.created_at desc limit 1),
    (select p from public.plans p where p.is_default limit 1)
  );
$$;

-- Usage numbers for the signed-in user (dashboard + billing page).
create or replace function public.my_plan_usage()
returns table (
  plan_code text, plan_name_ar text, plan_name_en text,
  max_listings integer, listings_used bigint,
  max_imports_per_day integer, imports_today bigint
) language sql stable security definer set search_path = '' as $$
  with p as (select * from public.current_plan((select auth.uid())))
  select p.code, p.name_ar, p.name_en,
         p.max_listings,
         (select count(*) from public.listings l
            where l.owner_id = (select auth.uid()) and l.kind <> 'building'),
         p.max_imports_per_day,
         (select count(*) from public.import_jobs j
            where j.profile_id = (select auth.uid()) and j.created_at > now() - interval '1 day')
  from p;
$$;

-- ---------- Listing integrity + plan limit ----------
create or replace function public.listings_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_building public.listings;
  v_plan     public.plans;
  v_count    bigint;
begin
  -- A unit must sit in a building owned by the same advertiser.
  if new.building_id is not null then
    select * into v_building from public.listings where id = new.building_id;
    if v_building.id is null or v_building.kind <> 'building' then
      raise exception 'building_id must reference a building' using errcode = '23514';
    end if;
    if v_building.owner_id <> new.owner_id then
      raise exception 'unit and building must have the same owner' using errcode = '42501';
    end if;
  end if;

  -- Kind is fixed after creation.
  if tg_op = 'UPDATE' and new.kind <> old.kind then
    raise exception 'listing kind cannot change' using errcode = '23514';
  end if;

  -- Stamp first publish time.
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;

  -- Plan limit: buildings are containers and don't count.
  if tg_op = 'INSERT' and new.kind <> 'building' then
    v_plan := public.current_plan(new.owner_id);
    if v_plan.max_listings is not null then
      select count(*) into v_count from public.listings
        where owner_id = new.owner_id and kind <> 'building';
      if v_count >= v_plan.max_listings then
        raise exception 'PLAN_LIMIT_LISTINGS' using errcode = 'P0001',
          hint = format('limit=%s', v_plan.max_listings);
      end if;
    end if;
  end if;

  return new;
end $$;

create trigger listings_before_write
  before insert or update on public.listings
  for each row execute function public.listings_before_write();

-- Import rate limit, read from the plan.
create or replace function public.import_jobs_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_plan  public.plans;
  v_count bigint;
begin
  v_plan := public.current_plan(new.profile_id);
  if v_plan.max_imports_per_day is not null then
    select count(*) into v_count from public.import_jobs
      where profile_id = new.profile_id and created_at > now() - interval '1 day';
    if v_count >= v_plan.max_imports_per_day then
      raise exception 'PLAN_LIMIT_IMPORTS' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger import_jobs_before_insert
  before insert on public.import_jobs
  for each row execute function public.import_jobs_before_insert();

-- ---------- Profile protection ----------
-- Users may edit their own profile but never their role / suspension flag.
-- Security invoker on purpose: current_user must be the caller's role.
create or replace function public.profiles_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.is_suspended is distinct from old.is_suspended)
     and current_user in ('anon', 'authenticated')
     and not public.is_admin() then
    raise exception 'not allowed to change role or suspension' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- Reserved slugs (routes and brand-sensitive words).
create or replace function public.is_reserved_slug(p_slug text)
returns boolean language sql immutable set search_path = '' as $$
  select lower(p_slug) = any (array[
    'admin','api','app','auth','dashboard','login','logout','signup','register',
    'pricing','settings','support','help','about','terms','privacy','www','mail',
    'static','assets','public','new','edit','qr','poster','ar','en'
  ]);
$$;

alter table public.profiles
  add constraint profiles_slug_not_reserved check (slug is null or not public.is_reserved_slug(slug));

create or replace function public.is_slug_available(p_slug text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'
     and not public.is_reserved_slug(p_slug)
     and not exists (
       select 1 from public.profiles
       where slug = p_slug and id <> coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid)
     );
$$;

-- ---------- New auth user -> profile + free subscription ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '');
begin
  insert into public.profiles (id, contact_email, display_name)
  values (new.id, new.email, case when char_length(v_name) between 2 and 120 then v_name end);

  insert into public.subscriptions (profile_id, plan_id, status)
  select new.id, p.id, 'active' from public.plans p where p.is_default limit 1;

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Public page: listings sorted by distance ----------
-- Runs as the caller (security invoker) so RLS still decides visibility.
-- The visitor's coordinates are only parameters; nothing is stored.
create or replace function public.get_advertiser_listings(
  p_slug text,
  p_lat  double precision default null,
  p_lng  double precision default null
)
returns table (
  id           uuid,
  kind         public.listing_kind,
  building_id  uuid,
  purpose      public.listing_purpose,
  title        text,
  description  text,
  price_aed    numeric,
  bedrooms     smallint,
  bathrooms    smallint,
  area_sqft    numeric,
  address_text text,
  lat          double precision,
  lng          double precision,
  distance_m   double precision,
  image_paths  text[],
  published_at timestamptz
)
language sql stable security invoker set search_path = public, extensions as $$
  with origin as (
    select case when p_lat is not null and p_lng is not null
      then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end as g
  )
  select
    l.id, l.kind, l.building_id, l.purpose, l.title, l.description,
    l.price_aed, l.bedrooms, l.bathrooms, l.area_sqft,
    coalesce(l.address_text, b.address_text),
    coalesce(l.lat, b.lat),
    coalesce(l.lng, b.lng),
    case when o.g is not null then st_distance(coalesce(l.location, b.location), o.g) end,
    coalesce((select array_agg(i.storage_path order by i.sort_order, i.created_at)
                from public.listing_images i where i.listing_id = l.id), '{}'),
    l.published_at
  from public.listings l
  join public.profiles p on p.id = l.owner_id
  left join public.listings b on b.id = l.building_id
  cross join origin o
  where p.slug = p_slug
    and l.status = 'published'
    and (l.building_id is null or b.status = 'published')
  order by
    case when o.g is not null then st_distance(coalesce(l.location, b.location), o.g) end asc nulls last,
    l.published_at desc nulls last;
$$;

-- ---------- Dashboard stats for the signed-in advertiser ----------
create or replace function public.my_stats(p_days integer default 30)
returns table (page_views bigint, qr_scans bigint, listing_views bigint)
language sql stable security definer set search_path = '' as $$
  select
    count(*) filter (where type = 'page_view'),
    count(*) filter (where type = 'page_view' and src = 'qr'),
    count(*) filter (where type = 'listing_view')
  from public.events
  where profile_id = (select auth.uid())
    and created_at > now() - make_interval(days => greatest(1, least(p_days, 365)));
$$;

create or replace function public.my_listing_views(p_days integer default 30)
returns table (listing_id uuid, views bigint)
language sql stable security definer set search_path = '' as $$
  select e.listing_id, count(*)
  from public.events e
  where e.profile_id = (select auth.uid())
    and e.type = 'listing_view'
    and e.listing_id is not null
    and e.created_at > now() - make_interval(days => greatest(1, least(p_days, 365)))
  group by e.listing_id;
$$;

-- Lock down: only expose RPCs that are meant to be called from the client.
revoke execute on function public.listings_before_write()      from public, anon, authenticated;
revoke execute on function public.import_jobs_before_insert()  from public, anon, authenticated;
revoke execute on function public.profiles_guard()             from public, anon, authenticated;
revoke execute on function public.handle_new_user()            from public, anon, authenticated;
revoke execute on function public.current_plan(uuid)           from public, anon, authenticated;
revoke execute on function public.my_plan_usage()              from public, anon;
revoke execute on function public.my_stats(integer)            from public, anon;
revoke execute on function public.my_listing_views(integer)    from public, anon;
grant  execute on function public.my_plan_usage()              to authenticated;
grant  execute on function public.my_stats(integer)            to authenticated;
grant  execute on function public.my_listing_views(integer)    to authenticated;
grant  execute on function public.get_advertiser_listings(text, double precision, double precision) to anon, authenticated;
grant  execute on function public.is_slug_available(text)      to authenticated;
