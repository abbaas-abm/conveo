-- ==========================================================
-- Featured moments: RLS policies
-- Table: public.event_featured
--   id UUID PK default gen_random_uuid()
--   event_id UUID NOT NULL -> public.events(id) ON DELETE CASCADE
--   title TEXT NOT NULL
--   description TEXT NULL
--   image_url TEXT NOT NULL
--   created_at / updated_at TIMESTAMPTZ NOT NULL default now()
--
-- Also requires: alter table public.events add column has_featured boolean
--   not null default true;
--
-- Run in the Supabase SQL editor. Safe to run repeatedly.
-- ==========================================================

alter table public.event_featured enable row level security;

-- Featured moments are public content (shown on the event page).
drop policy if exists "Featured moments are public" on public.event_featured;
create policy "Featured moments are public"
  on public.event_featured
  for select
  using (true);

-- Only admins can create / update / delete them.
drop policy if exists "Admins manage featured moments" on public.event_featured;
create policy "Admins manage featured moments"
  on public.event_featured
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Helpful index for per-event reads.
create index if not exists idx_event_featured_event
  on public.event_featured (event_id, created_at);
