-- ==========================================================
-- RSVP position + GUEST_SPEAKER enum value
-- Run in the Supabase SQL editor. Safe to run repeatedly.
-- ==========================================================

alter type public.user_position add value if not exists 'GUEST_SPEAKER';

alter table public.rsvps
  add column if not exists position public.user_position;
