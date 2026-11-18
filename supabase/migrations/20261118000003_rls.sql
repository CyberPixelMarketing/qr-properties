-- =====================================================================
-- Row Level Security — every table is locked down.
-- Advertisers see/edit only their own rows; admins see everything;
-- the public sees only published content of active advertisers.
-- =====================================================================

alter table public.plans            enable row level security;
alter table public.profiles         enable row level security;
alter table public.credential_links enable row level security;
alter table public.listings         enable row level security;
alter table public.listing_images   enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.events           enable row level security;
alter table public.import_jobs      enable row level security;

-- ---------- plans ----------
create policy plans_read on public.plans for select
  using (is_active or (select public.is_admin()));
create policy plans_admin_write on public.plans for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- profiles ----------
create policy profiles_read on public.profiles for select
  using (
    (onboarded_at is not null and not is_suspended)
    or id = (select auth.uid())
    or (select public.is_admin())
  );
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_admin_update on public.profiles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy profiles_admin_delete on public.profiles for delete to authenticated
  using ((select public.is_admin()));
-- (inserts happen only through the auth trigger)

-- ---------- credential_links ----------
create policy credential_links_read on public.credential_links for select
  using (public.is_profile_active(profile_id) or profile_id = (select auth.uid()) or (select public.is_admin()));
create policy credential_links_own_insert on public.credential_links for insert to authenticated
  with check (profile_id = (select auth.uid()));
create policy credential_links_own_update on public.credential_links for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy credential_links_own_delete on public.credential_links for delete to authenticated
  using (profile_id = (select auth.uid()));

-- ---------- listings ----------
create policy listings_read on public.listings for select
  using (
    (
      status = 'published'
      and public.is_profile_active(owner_id)
      and (building_id is null or public.is_building_published(building_id))
    )
    or owner_id = (select auth.uid())
    or (select public.is_admin())
  );
create policy listings_own_insert on public.listings for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy listings_own_update on public.listings for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy listings_own_delete on public.listings for delete to authenticated
  using (owner_id = (select auth.uid()));
create policy listings_admin_update on public.listings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy listings_admin_delete on public.listings for delete to authenticated
  using ((select public.is_admin()));

-- ---------- listing_images (visibility follows the parent listing) ----------
create policy listing_images_read on public.listing_images for select
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy listing_images_own_insert on public.listing_images for insert to authenticated
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())));
create policy listing_images_own_update on public.listing_images for update to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())));
create policy listing_images_own_delete on public.listing_images for delete to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())));
create policy listing_images_admin_delete on public.listing_images for delete to authenticated
  using ((select public.is_admin()));

-- ---------- subscriptions (written by server/admin only) ----------
create policy subscriptions_read on public.subscriptions for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));
create policy subscriptions_admin_write on public.subscriptions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- events (inserted by the server with the service key) ----------
create policy events_read on public.events for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

-- ---------- import_jobs ----------
create policy import_jobs_read on public.import_jobs for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));
create policy import_jobs_own_insert on public.import_jobs for insert to authenticated
  with check (profile_id = (select auth.uid()));
create policy import_jobs_own_update on public.import_jobs for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- =====================================================================
-- Storage: public-read buckets, each user writes only under "<uid>/..."
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',        'avatars',        true, 2 * 1024 * 1024,  array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('listing-images', 'listing-images', true, 8 * 1024 * 1024,  array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy storage_own_insert on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'listing-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy storage_own_update on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'listing-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy storage_own_delete on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'listing-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
-- Owners may list their own folder (needed for upsert/cleanup); public reads go via public URLs.
create policy storage_own_select on storage.objects for select to authenticated
  using (
    bucket_id in ('avatars', 'listing-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
