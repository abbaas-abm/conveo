-- ==========================================================
-- FIX: "Database error saving new user" on signup / OTP
-- ==========================================================
-- The auth.users AFTER INSERT trigger is failing, which aborts
-- user creation. This script removes ANY stale trigger from
-- auth.users, then installs a single, defensive replacement.
--
-- Run in the Supabase SQL editor. It is safe to run repeatedly.
-- ==========================================================

-- 1. Drop every non-internal trigger on auth.users ----------
do $$
declare
  r record;
begin
  for r in
    select t.tgname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth'
      and c.relname = 'users'
      and not t.tgisinternal
  loop
    execute format('drop trigger if exists %I on auth.users', r.tgname);
  end loop;
end $$;

-- 2. Recreate a safe profile-creating function --------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    'user'::public.user_role
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    -- Never let a profile side-effect block authentication.
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. RLS: let a signed-in user create their own profile -----
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- 4. Backfill profiles for any existing auth users ----------
insert into public.profiles (id, email, role)
select u.id, u.email, 'user'::public.user_role
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
