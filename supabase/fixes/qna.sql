-- ==========================================================
-- Event Q&A
-- Run in the Supabase SQL editor. Safe to run repeatedly.
-- ==========================================================

create table if not exists public.qna (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  speaker_id uuid null,
  question text not null,
  answered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The app's speakers live in public.speakers (not profiles), so the speaker
-- reference must point there.
alter table public.qna drop constraint if exists qna_speaker_id_fkey;
alter table public.qna drop constraint if exists qna_speaker_id_fkey1;
alter table public.qna
  add constraint qna_speaker_id_fkey
  foreign key (speaker_id) references public.speakers(id) on delete set null;

create index if not exists idx_qna_event_id on public.qna(event_id);
create index if not exists idx_qna_user_id on public.qna(user_id);
create index if not exists idx_qna_speaker_id on public.qna(speaker_id);
create index if not exists idx_qna_answered on public.qna(answered);

create or replace function public.update_qna_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_qna_updated_at on public.qna;
create trigger trg_qna_updated_at
  before update on public.qna
  for each row
  execute function public.update_qna_updated_at();

-- Event visibility toggle
alter table public.events
  add column if not exists has_questions boolean not null default true;

-- ---------- Row Level Security ----------
alter table public.qna enable row level security;

drop policy if exists "Users can ask questions" on public.qna;
create policy "Users can ask questions"
  on public.qna for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users read own questions" on public.qna;
create policy "Users read own questions"
  on public.qna for select to authenticated
  using (user_id = auth.uid() or public.is_admin_or_volunteer());

drop policy if exists "Support team update questions" on public.qna;
create policy "Support team update questions"
  on public.qna for update to authenticated
  using (public.is_admin_or_volunteer())
  with check (public.is_admin_or_volunteer());

drop policy if exists "Admins delete questions" on public.qna;
create policy "Admins delete questions"
  on public.qna for delete to authenticated
  using (public.is_admin());

-- ---------- Realtime ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'qna'
  ) then
    alter publication supabase_realtime add table public.qna;
  end if;
end $$;
