-- =====================================================================
-- Anonymous analytics without a service key.
-- Visitors can only record a view for a published listing / active page.
-- Nothing about the visitor (IP, location, user agent) is stored.
-- =====================================================================

create or replace function public.track_event(
  p_slug       text,
  p_type       public.event_type,
  p_src        public.event_src default 'direct',
  p_listing_id uuid default null
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_profile uuid;
begin
  select id into v_profile from public.profiles
   where slug = p_slug and onboarded_at is not null and not is_suspended;
  if v_profile is null then return; end if;

  -- Owners browsing their own page don't inflate their stats.
  if v_profile = (select auth.uid()) then return; end if;

  if p_type = 'listing_view' then
    if p_listing_id is null or not exists (
      select 1 from public.listings
       where id = p_listing_id and owner_id = v_profile and status = 'published'
    ) then
      return;
    end if;
  else
    p_listing_id := null;
  end if;

  insert into public.events (profile_id, listing_id, type, src)
  values (v_profile, p_listing_id, p_type, coalesce(p_src, 'direct'));
end $$;

revoke execute on function public.track_event(text, public.event_type, public.event_src, uuid) from public;
grant  execute on function public.track_event(text, public.event_type, public.event_src, uuid) to anon, authenticated;
