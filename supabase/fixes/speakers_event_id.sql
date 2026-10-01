-- ==========================================================
-- Speakers -> Event linkage (optional hardening)
-- Run only if you want the FK + index enforced. Safe to run
-- repeatedly. Assumes public.speakers.event_id already exists.
-- ==========================================================

create index if not exists idx_speakers_event on public.speakers(event_id);

do $$
begin
  alter table public.speakers
    add constraint speakers_event_id_fkey
    foreign key (event_id) references public.events(id) on delete cascade;
exception
  when duplicate_object then null;
  when undefined_column then null;
  when invalid_foreign_key then null;
end $$;
