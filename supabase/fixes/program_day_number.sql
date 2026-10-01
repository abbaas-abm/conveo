-- ==========================================================
-- Programme blocks: day_number column + index
-- Run in the Supabase SQL editor. Safe to run repeatedly.
-- ==========================================================

alter table public.event_program_blocks
  add column if not exists day_number int not null default 1;

create index if not exists idx_program_blocks_event_day
  on public.event_program_blocks (event_id, day_number, display_order);
