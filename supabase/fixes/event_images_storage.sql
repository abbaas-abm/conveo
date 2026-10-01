-- ==========================================================
-- Storage bucket + policies for event / speaker images
-- Bucket: event_images (public read)
-- Run in the Supabase SQL editor. Safe to run repeatedly.
-- ==========================================================

insert into storage.buckets (id, name, public)
values ('event_images', 'event_images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public Read Access on event_images" on storage.objects;
create policy "Public Read Access on event_images"
  on storage.objects for select
  using (bucket_id = 'event_images');

drop policy if exists "Admins and Volunteers can upload event images" on storage.objects;
create policy "Admins and Volunteers can upload event images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event_images' and public.is_admin_or_volunteer()
  );

drop policy if exists "Admins and Volunteers can update event images" on storage.objects;
create policy "Admins and Volunteers can update event images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'event_images' and public.is_admin_or_volunteer()
  );

drop policy if exists "Admins can delete event images" on storage.objects;
create policy "Admins can delete event images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event_images' and public.is_admin());
