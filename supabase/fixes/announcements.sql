-- ==========================================================
-- Announcements: schema hardening + Row Level Security
-- Run in the Supabase SQL editor. Safe to run repeatedly.
-- ==========================================================

-- The original event_id had a bogus gen_random_uuid() default.
alter table public.announcements
  alter column event_id drop default;

-- Ensure referential integrity (the constraint may already exist).
do $$
begin
  alter table public.announcements
    add constraint announcements_event_id_fkey
    foreign key (event_id) references public.events (id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

-- Announcements belong to an event; make event_id required when safe.
do $$
begin
  if not exists (select 1 from public.announcements where event_id is null) then
    alter table public.announcements alter column event_id set not null;
  end if;
end $$;

create index if not exists idx_announcements_event
  on public.announcements (event_id, created_at desc);

-- Row Level Security
alter table public.announcements enable row level security;

drop policy if exists "Anyone can view announcements" on public.announcements;
create policy "Anyone can view announcements"
  on public.announcements for select
  using (true);

drop policy if exists "Admins can manage announcements" on public.announcements;
create policy "Admins can manage announcements"
  on public.announcements for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
