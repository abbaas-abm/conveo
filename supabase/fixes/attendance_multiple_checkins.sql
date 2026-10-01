-- ==========================================================
-- Allow multiple check-ins per attendee per event
-- (e.g. a multi-day event: check in on day 1, day 2, ...)
--
-- The attendance table was created with UNIQUE(event_id, attendee_id),
-- which blocked a second check-in. This removes that constraint and
-- replaces it with a normal (non-unique) index for performance.
--
-- Run in the Supabase SQL editor. Safe to run repeatedly.
-- ==========================================================

-- Drop every UNIQUE constraint on public.attendance (there is normally
-- just attendance_event_id_attendee_id_key).
do $$
declare
  conname text;
begin
  for conname in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'attendance'
      and c.contype = 'u'
  loop
    execute format('alter table public.attendance drop constraint %I', conname);
  end loop;
end $$;

-- In case a standalone unique index exists (not backed by a constraint).
drop index if exists public.attendance_event_id_attendee_id_key;

-- Keep lookups fast now that the uniqueness is gone.
create index if not exists idx_attendance_event_attendee
  on public.attendance (event_id, attendee_id);

-- Optional: verify no unique constraints remain on attendance.
-- select conname, contype from pg_constraint
--   where conrelid = 'public.attendance'::regclass and contype = 'u';
