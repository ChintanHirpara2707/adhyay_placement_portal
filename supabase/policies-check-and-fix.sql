-- =====================================================================================
-- Adhyay Placement Portal - RLS check + idempotent fixes
-- Run in the Supabase SQL Editor. Section 1 is read-only. Sections 2+ only ADD permissive
-- policies / a constraint (they never remove existing ones), so they are safe to run, but
-- review section 1 first and skip blocks you already have.
-- =====================================================================================

-- ---------- 1. DIAGNOSTICS (read-only) ----------------------------------------------
-- 1a. Every policy on the tables the app writes to.
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('users','students','companies','job_postings','applications','interviews','notifications')
order by tablename, cmd, policyname;

-- 1b. Policies that query their OWN table (these cause "infinite recursion" errors).
--     Replace any hit with a security-definer helper such as get_my_role() below.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and (
    (tablename = 'users'        and (qual ilike '%from users%'        or with_check ilike '%from users%'))
 or (tablename = 'applications' and (qual ilike '%from applications%' or with_check ilike '%from applications%'))
  );

-- 1c. Is RLS on everywhere?
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('users','students','companies','job_postings','applications','interviews','notifications');

-- 1d. Does the signup trigger exist? (signup.tsx relies on it to create users/students/companies rows)
select tgname, tgrelid::regclass as on_table from pg_trigger
where tgname ilike '%new_user%' and not tgisinternal;

-- ---------- 2. HELPER (avoids recursive policies) -----------------------------------
create or replace function public.get_my_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

-- ---------- 3. NOTIFICATIONS --------------------------------------------------------
-- Companies and admins insert rows for OTHER users (shortlist, interview, result, broadcast).
drop policy if exists notifications_staff_insert on public.notifications;
create policy notifications_staff_insert on public.notifications
  for insert to authenticated
  with check (public.get_my_role() in ('company', 'admin'));

-- Everyone reads / marks-read their own notifications (mark-as-read is an UPDATE).
drop policy if exists notifications_own_select on public.notifications;
create policy notifications_own_select on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Admin sees all (broadcast history).
drop policy if exists notifications_admin_select on public.notifications;
create policy notifications_admin_select on public.notifications
  for select to authenticated using (public.get_my_role() = 'admin');

-- ---------- 4. APPLICATIONS ---------------------------------------------------------
-- Student registers for a drive (own row only) and reads own rows.
drop policy if exists applications_student_insert on public.applications;
create policy applications_student_insert on public.applications
  for insert to authenticated with check (student_id = auth.uid());

drop policy if exists applications_student_select on public.applications;
create policy applications_student_select on public.applications
  for select to authenticated using (student_id = auth.uid());

-- Company reads and updates applications for ITS OWN jobs (shortlist / reject / round results).
drop policy if exists applications_company_select on public.applications;
create policy applications_company_select on public.applications
  for select to authenticated
  using (exists (select 1 from public.job_postings j where j.id = applications.job_id and j.company_id = auth.uid()));

drop policy if exists applications_company_update on public.applications;
create policy applications_company_update on public.applications
  for update to authenticated
  using (exists (select 1 from public.job_postings j where j.id = applications.job_id and j.company_id = auth.uid()))
  with check (exists (select 1 from public.job_postings j where j.id = applications.job_id and j.company_id = auth.uid()));

-- Admin reads everything (dashboard analytics).
drop policy if exists applications_admin_select on public.applications;
create policy applications_admin_select on public.applications
  for select to authenticated using (public.get_my_role() = 'admin');

-- One registration per student per drive (the app also checks; this makes it airtight).
-- If this fails you already have duplicate rows: delete them first.
alter table public.applications
  drop constraint if exists applications_student_job_unique;
alter table public.applications
  add constraint applications_student_job_unique unique (student_id, job_id);

-- ---------- 5. INTERVIEWS -----------------------------------------------------------
drop policy if exists interviews_company_insert on public.interviews;
create policy interviews_company_insert on public.interviews
  for insert to authenticated
  with check (exists (
    select 1 from public.applications a
    join public.job_postings j on j.id = a.job_id
    where a.id = interviews.application_id and j.company_id = auth.uid()));

drop policy if exists interviews_company_update on public.interviews;
create policy interviews_company_update on public.interviews
  for update to authenticated
  using (exists (
    select 1 from public.applications a
    join public.job_postings j on j.id = a.job_id
    where a.id = interviews.application_id and j.company_id = auth.uid()))
  with check (exists (
    select 1 from public.applications a
    join public.job_postings j on j.id = a.job_id
    where a.id = interviews.application_id and j.company_id = auth.uid()));

drop policy if exists interviews_company_select on public.interviews;
create policy interviews_company_select on public.interviews
  for select to authenticated
  using (exists (
    select 1 from public.applications a
    join public.job_postings j on j.id = a.job_id
    where a.id = interviews.application_id and j.company_id = auth.uid()));

drop policy if exists interviews_student_select on public.interviews;
create policy interviews_student_select on public.interviews
  for select to authenticated
  using (exists (select 1 from public.applications a where a.id = interviews.application_id and a.student_id = auth.uid()));

-- ---------- 6. COMPANIES (admin approval / rejection) -------------------------------
drop policy if exists companies_admin_all on public.companies;
create policy companies_admin_all on public.companies
  for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- Company edits its own profile.
drop policy if exists companies_own_update on public.companies;
create policy companies_own_update on public.companies
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------- 7. JOB POSTINGS (admin can close any posting) ---------------------------
drop policy if exists job_postings_admin_update on public.job_postings;
create policy job_postings_admin_update on public.job_postings
  for update to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- Company manages its own postings.
drop policy if exists job_postings_company_all on public.job_postings;
create policy job_postings_company_all on public.job_postings
  for all to authenticated
  using (company_id = auth.uid()) with check (company_id = auth.uid());

-- ---------- 8. After any schema or policy change ------------------------------------
notify pgrst, 'reload schema';
