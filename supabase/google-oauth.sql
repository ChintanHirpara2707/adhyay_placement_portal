-- =====================================================================================
-- Google sign-in: database checks and policies
-- Run in the Supabase SQL Editor. Read section 1 first - it decides whether section 2 is needed.
-- =====================================================================================

-- ---------- 1. DIAGNOSTIC: what does the signup trigger do for a user with no role metadata? ----
-- Email signup passes the role in auth metadata and the trigger (handle_new_user) creates the
-- users/students/companies rows. A Google user has NO role in metadata. Read the function:
select pg_get_functiondef(p.oid) as definition
from pg_proc p
where p.proname = 'handle_new_user' and p.pronamespace = 'public'::regnamespace;

-- Look for what happens when raw_user_meta_data->>'role' is NULL:
--   a) it inserts role 'student' by default  -> Google users silently become students and never see the
--      role screen. Change the function so it RETURNs early when the role is not 'student' or 'company'.
--   b) it errors on NULL                     -> Google sign-in fails with "Database error saving new user".
--      Same fix.
-- The only change needed is an early exit near the top of the function body, for example:
--
--   declare r text := new.raw_user_meta_data->>'role';
--   begin
--     if r is null or r not in ('student', 'company') then
--       return new;   -- OAuth user: the app asks for a role on /choose-role and creates the rows itself
--     end if;
--     ... (your existing inserts, unchanged) ...
--
-- (Keep the rest of your function as it is; only add the early return.)

-- ---------- 2. POLICIES the choose-role screen needs ---------------------------------------
-- The screen inserts the user's OWN rows. These policies allow exactly that and nothing more:
-- a user can create only their own row, can never create an admin, and a company starts unapproved.

drop policy if exists users_self_insert on public.users;
create policy users_self_insert on public.users
  for insert to authenticated
  with check (id = auth.uid() and role in ('student', 'company'));

drop policy if exists students_self_insert on public.students;
create policy students_self_insert on public.students
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists companies_self_insert on public.companies;
create policy companies_self_insert on public.companies
  for insert to authenticated
  with check (id = auth.uid() and approved = false);

-- The app also reads its own users row (role lookup). Make sure that exists:
drop policy if exists users_self_select on public.users;
create policy users_self_select on public.users
  for select to authenticated
  using (id = auth.uid());

notify pgrst, 'reload schema';

-- ---------- 3. DASHBOARD SETTINGS (cannot be done in SQL) ---------------------------------
-- Authentication > Providers > Google: enable it and paste the Google OAuth client ID + secret.
--   In Google Cloud Console the authorised redirect URI is: https://<project-ref>.supabase.co/auth/v1/callback
-- Authentication > URL Configuration > Redirect URLs: add every origin the app runs on, e.g.
--   http://localhost:8081      http://localhost:8082      (Expo web dev server, whichever port you use)
--   https://<your-production-domain>
--   placementporter://         (native build; Expo Go uses an exp://... URL - add the one the app logs)
-- Authentication > Providers > Email: leave "Confirm email" as you have it. Automatic account linking
--   (Google + an existing email/password account with the same email) only happens when that email is verified.
