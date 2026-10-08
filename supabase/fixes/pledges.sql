-- ==========================================================
-- Pledges: table, RLS + storage policy for generated documents
-- Run in the Supabase SQL editor. Safe to run repeatedly.
-- ==========================================================

create table if not exists public.pledges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  pledge_text text not null,
  pledge_document_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pledges_event
  on public.pledges (event_id, created_at desc);

-- One pledge per person per event. De-duplicate any pre-existing rows first so
-- the unique index can be created safely (keeps the earliest pledge).
delete from public.pledges
where id in (
  select id from (
    select id,
           row_number() over (
             partition by user_id, event_id order by created_at asc
           ) as rn
    from public.pledges
    where user_id is not null and event_id is not null
  ) ranked
  where ranked.rn > 1
);

create unique index if not exists ux_pledges_user_event
  on public.pledges (user_id, event_id);

alter table public.pledges enable row level security;

drop policy if exists "Anyone can view pledges" on public.pledges;
create policy "Anyone can view pledges"
  on public.pledges for select using (true);

drop policy if exists "Users can create own pledges" on public.pledges;
create policy "Users can create own pledges"
  on public.pledges for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own pledges" on public.pledges;
create policy "Users can update own pledges"
  on public.pledges for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins can manage pledges" on public.pledges;
create policy "Admins can manage pledges"
  on public.pledges for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Allow signed-in users to upload generated pledge documents into the
-- dedicated "pledges/" folder of the event_images bucket.
drop policy if exists "Authenticated can upload pledge documents" on storage.objects;
create policy "Authenticated can upload pledge documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event_images'
    and (storage.foldername(name))[1] = 'pledges'
  );
