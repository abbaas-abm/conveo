-- ==========================================================
-- Web Push subscriptions
-- Run in the Supabase SQL editor. Safe to run repeatedly.
-- ==========================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- The server normally writes/reads with the service-role key (bypasses RLS).
-- These policies let the browser client register a subscription too (anonymous
-- visitors can opt in to announcements), so push works even without the
-- service-role key configured.
drop policy if exists "Anyone can register a push subscription" on public.push_subscriptions;
create policy "Anyone can register a push subscription"
  on public.push_subscriptions
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone can update a push subscription" on public.push_subscriptions;
create policy "Anyone can update a push subscription"
  on public.push_subscriptions
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- Signed-in users can also manage their own rows.
drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id);
