-- ==========================================================
-- Promote a user to admin
-- ==========================================================
-- After a user has signed up and completed onboarding, run this
-- in the Supabase SQL editor (replace the email) to grant them
-- access to /admin.
-- ==========================================================

update public.profiles
set role = 'admin'::public.user_role
where email = 'you@example.com';

-- Verify:
-- select id, email, role, onboarding from public.profiles order by created_at desc;
