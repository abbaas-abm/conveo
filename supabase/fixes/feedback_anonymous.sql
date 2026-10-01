-- ==========================================================
-- Anonymous feedback support
-- Run in the Supabase SQL editor. Safe to run repeatedly.
-- ==========================================================

-- Anonymous submissions have no attendee, so allow attendee_id to be null.
alter table public.feedback alter column attendee_id drop not null;

-- Allow anyone (signed in or anonymous) to submit feedback.
drop policy if exists "Anyone can submit anonymous feedback" on public.feedback;
create policy "Anyone can submit anonymous feedback"
  on public.feedback for insert
  to anon, authenticated
  with check (true);
