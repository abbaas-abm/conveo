-- ==========================================================
-- Verify storage setup for speaker/event images
-- Run in the Supabase SQL editor and check the "Results" tab.
-- Each row is a check; true = healthy.
-- ==========================================================

select
  exists (
    select 1 from storage.buckets where id = 'event_images'
  ) as bucket_exists,
  exists (
    select 1 from storage.buckets where id = 'event_images' and public = true
  ) as bucket_is_public,
  exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Admins and Volunteers can upload event images'
  ) as has_insert_policy,
  exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Public Read Access on event_images'
  ) as has_read_policy,
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'volunteer')
  ) as current_user_can_upload;

-- If bucket_exists = false, run supabase/fixes/event_images_storage.sql.
-- If current_user_can_upload = false, promote your account via
-- supabase/fixes/promote_admin.sql.
