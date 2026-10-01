-- ==========================================================
-- Reflections: RLS + realtime
-- Run in the Supabase SQL editor. Safe to run repeatedly.
-- ==========================================================

alter table public.reflections enable row level security;

-- Public (including anonymous visitors) can read reflections.
drop policy if exists "Anyone can view reflections" on public.reflections;
create policy "Anyone can view reflections"
  on public.reflections for select
  using (true);

-- Signed-in users can add their own reflection.
drop policy if exists "Users can add own reflections" on public.reflections;
create policy "Users can add own reflections"
  on public.reflections for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Admins can manage everything.
drop policy if exists "Admins can manage reflections" on public.reflections;
create policy "Admins can manage reflections"
  on public.reflections for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_reflections_event
  on public.reflections (event_id, created_at desc);

-- Ensure the table is published for Realtime (idempotent).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reflections'
  ) then
    alter publication supabase_realtime add table public.reflections;
  end if;
end $$;
