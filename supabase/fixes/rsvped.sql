-- ==========================================================
-- RSVP gate
-- Only emails present in public.rsvped may register for events.
-- Run in the Supabase SQL editor. Safe to run repeatedly.
-- ==========================================================

-- Lock the list down: no direct reads/writes. The registration flow checks it
-- through the security-definer function below, so the raw emails are never
-- exposed to the client.
alter table public.rsvped enable row level security;

-- Fast, case/space-insensitive lookup.
create index if not exists idx_rsvped_email_lower
  on public.rsvped (lower(btrim(email)));

-- Returns true when the *signed-in* user's email is on the RSVP list.
-- Uses auth.email() so a caller can only ever check their own address.
create or replace function public.has_rsvped()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rsvped r
    where r.email is not null
      and lower(btrim(r.email)) = lower(btrim(auth.email()))
  );
$$;

revoke all on function public.has_rsvped() from public;
grant execute on function public.has_rsvped() to authenticated;

-- ------------------------------------------------------------------
-- Optional: if you also want admins to browse/manage the list from the
-- app (via RLS), uncomment the policy below. Service-role/table-editor
-- access already bypasses RLS, so it is not required for the gate.
-- ------------------------------------------------------------------
-- create policy "Admins can manage rsvped"
--   on public.rsvped for all to authenticated
--   using (public.is_admin())
--   with check (public.is_admin());
