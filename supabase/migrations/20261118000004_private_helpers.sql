-- =====================================================================
-- Move RLS helper functions out of the API-exposed "public" schema.
-- Policies reference functions by OID, so they keep working after the move,
-- but the helpers can no longer be called directly via /rest/v1/rpc.
-- =====================================================================

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

alter function public.is_admin()                   set schema private;
alter function public.is_profile_active(uuid)      set schema private;
alter function public.is_building_published(uuid)  set schema private;
alter function public.current_plan(uuid)           set schema private;
alter function public.is_reserved_slug(text)       set schema private;

-- Functions that call the moved helpers by qualified name must be updated.
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and not is_suspended
  );
$$;

create or replace function public.my_plan_usage()
returns table (
  plan_code text, plan_name_ar text, plan_name_en text,
  max_listings integer, listings_used bigint,
  max_imports_per_day integer, imports_today bigint
) language sql stable security definer set search_path = '' as $$
  with p as (select * from private.current_plan((select auth.uid())))
  select p.code, p.name_ar, p.name_en,
         p.max_listings,
         (select count(*) from public.listings l
            where l.owner_id = (select auth.uid()) and l.kind <> 'building'),
         p.max_imports_per_day,
         (select count(*) from public.import_jobs j
            where j.profile_id = (select auth.uid()) and j.created_at > now() - interval '1 day')
  from p;
$$;

create or replace function public.listings_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_building public.listings;
  v_plan     public.plans;
  v_count    bigint;
begin
  if new.building_id is not null then
    select * into v_building from public.listings where id = new.building_id;
    if v_building.id is null or v_building.kind <> 'building' then
      raise exception 'building_id must reference a building' using errcode = '23514';
    end if;
    if v_building.owner_id <> new.owner_id then
      raise exception 'unit and building must have the same owner' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.kind <> old.kind then
    raise exception 'listing kind cannot change' using errcode = '23514';
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;

  if tg_op = 'INSERT' and new.kind <> 'building' then
    v_plan := private.current_plan(new.owner_id);
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

create or replace function public.import_jobs_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_plan  public.plans;
  v_count bigint;
begin
  v_plan := private.current_plan(new.profile_id);
  if v_plan.max_imports_per_day is not null then
    select count(*) into v_count from public.import_jobs
      where profile_id = new.profile_id and created_at > now() - interval '1 day';
    if v_count >= v_plan.max_imports_per_day then
      raise exception 'PLAN_LIMIT_IMPORTS' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create or replace function public.profiles_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.is_suspended is distinct from old.is_suspended)
     and current_user in ('anon', 'authenticated')
     and not private.is_admin() then
    raise exception 'not allowed to change role or suspension' using errcode = '42501';
  end if;
  return new;
end $$;

create or replace function public.is_slug_available(p_slug text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'
     and not private.is_reserved_slug(p_slug)
     and not exists (
       select 1 from public.profiles
       where slug = p_slug and id <> coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid)
     );
$$;

-- Slug check is for signed-in users only.
revoke execute on function public.is_slug_available(text) from public, anon;
grant  execute on function public.is_slug_available(text) to authenticated;

-- Private helpers: callable inside policies by the API roles, but not exposed over REST.
grant execute on function private.is_admin()                  to anon, authenticated;
grant execute on function private.is_profile_active(uuid)     to anon, authenticated;
grant execute on function private.is_building_published(uuid) to anon, authenticated;
grant execute on function private.is_reserved_slug(text)      to anon, authenticated;
