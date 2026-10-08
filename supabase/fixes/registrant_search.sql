-- ==========================================================
-- Registrant search for the support-team check-in scanner.
-- Lets a volunteer type part of a name/email and pick a
-- registered attendee instead of typing the whole address.
-- Run in the Supabase SQL editor. Safe to run repeatedly.
-- ==========================================================

create index if not exists idx_registrations_event_status
  on public.registrations (event_id, status);

create or replace function public.search_event_registrants(
  p_event_id uuid,
  p_term text,
  p_limit int default 8
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  email text,
  "position" text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.first_name, p.last_name, p.email, r.position::text
  from public.registrations r
  join public.profiles p on p.id = r.attendee_id
  where r.event_id = p_event_id
    and r.status = 'CONFIRMED'
    and coalesce(trim(p_term), '') <> ''
    and (
      p.email ilike '%' || p_term || '%'
      or p.first_name ilike '%' || p_term || '%'
      or p.last_name ilike '%' || p_term || '%'
    )
    -- Only staff may enumerate registrants.
    and exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.role in ('admin', 'volunteer')
    )
  order by p.first_name nulls last, p.last_name nulls last
  limit greatest(coalesce(p_limit, 8), 1);
$$;

revoke all on function public.search_event_registrants(uuid, text, int) from public;
grant execute on function public.search_event_registrants(uuid, text, int) to authenticated;
