-- Concierge editing: let admins create/update/delete ANY host's boat and its
-- pricing/images/features. Without this, admin edits in the listing editor are
-- silently dropped by RLS (host_id != auth.uid()), so nothing saves.
-- (Inline profiles.is_admin check — the is_admin() helper isn't present in prod.)

drop policy if exists "boats_insert_own" on boats;
create policy "boats_insert_own" on boats for insert with check (host_id = auth.uid() or coalesce((select is_admin from public.profiles where id = auth.uid()),false));

drop policy if exists "boats_update_own" on boats;
create policy "boats_update_own" on boats for update using (host_id = auth.uid() or coalesce((select is_admin from public.profiles where id = auth.uid()),false));

drop policy if exists "boats_delete_own" on boats;
create policy "boats_delete_own" on boats for delete using (host_id = auth.uid() or coalesce((select is_admin from public.profiles where id = auth.uid()),false));

drop policy if exists "boat_pricing_host_write" on boat_pricing;
create policy "boat_pricing_host_write" on boat_pricing for all using (boat_id in (select id from boats where host_id = auth.uid()) or coalesce((select is_admin from public.profiles where id = auth.uid()),false));

drop policy if exists "boat_images_host_write" on boat_images;
create policy "boat_images_host_write" on boat_images for all using (boat_id in (select id from boats where host_id = auth.uid()) or coalesce((select is_admin from public.profiles where id = auth.uid()),false));

drop policy if exists "boat_features_host_write" on boat_features;
create policy "boat_features_host_write" on boat_features for all using (boat_id in (select id from boats where host_id = auth.uid()) or coalesce((select is_admin from public.profiles where id = auth.uid()),false));

drop policy if exists "availability_host_write" on availability;
create policy "availability_host_write" on availability for all using (boat_id in (select id from boats where host_id = auth.uid()) or coalesce((select is_admin from public.profiles where id = auth.uid()),false));
