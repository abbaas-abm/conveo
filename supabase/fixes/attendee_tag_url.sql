-- ==========================================================
-- Attendee tag URL + storage policy for generated badges
-- Run in the Supabase SQL editor. Safe to run repeatedly.
-- ==========================================================

alter table public.rsvps
  add column if not exists attendee_tag_url text;

-- Allow signed-in users to upload generated attendee tags into the
-- dedicated "attendee-tags/" folder of the event_images bucket. All other
-- folders in the bucket remain restricted to admins/volunteers.
drop policy if exists "Authenticated can upload attendee tags" on storage.objects;
create policy "Authenticated can upload attendee tags"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event_images'
    and (storage.foldername(name))[1] = 'attendee-tags'
  );
