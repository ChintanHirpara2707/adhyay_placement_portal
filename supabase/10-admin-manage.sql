-- =====================================================================================
-- Adhyay Placement Portal - admin manage (debar / remove students & companies)
-- Run once in the Supabase SQL Editor (needs policies-check-and-fix.sql applied first,
-- for public.get_my_role()). Idempotent: safe to re-run.
-- =====================================================================================

-- 1. Debarred flag ---------------------------------------------------------------------
alter table public.students  add column if not exists debarred boolean not null default false;
alter table public.companies add column if not exists debarred boolean not null default false;

-- 2. Helper: is the calling user debarred? ---------------------------------------------
create or replace function public.is_debarred()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select debarred from public.students  where id = auth.uid()), false)
      or coalesce((select debarred from public.companies where id = auth.uid()), false)
$$;

-- 3. Admin read / update / delete ------------------------------------------------------
drop policy if exists users_admin_select on public.users;
create policy users_admin_select on public.users
  for select to authenticated using (public.get_my_role() = 'admin');

drop policy if exists students_admin_select on public.students;
create policy students_admin_select on public.students
  for select to authenticated using (public.get_my_role() = 'admin');

drop policy if exists students_admin_update on public.students;
create policy students_admin_update on public.students
  for update to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

drop policy if exists students_admin_delete on public.students;
create policy students_admin_delete on public.students
  for delete to authenticated using (public.get_my_role() = 'admin');

-- companies: companies_admin_all (policies-check-and-fix.sql) already grants admin select/update/delete.
drop policy if exists companies_admin_select on public.companies;
create policy companies_admin_select on public.companies
  for select to authenticated using (public.get_my_role() = 'admin');

-- 4. Debarred users cannot apply or post (RESTRICTIVE = ANDed with every permissive policy)
drop policy if exists applications_not_debarred on public.applications;
create policy applications_not_debarred on public.applications
  as restrictive for insert to authenticated with check (not public.is_debarred());

drop policy if exists job_postings_not_debarred on public.job_postings;
create policy job_postings_not_debarred on public.job_postings
  as restrictive for insert to authenticated with check (not public.is_debarred());

-- 5. Only an admin may change `debarred` (users can update their own row, so they could un-debar themselves)
create or replace function public.protect_debarred()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.debarred is distinct from old.debarred
     and auth.uid() is not null                       -- SQL editor / service role pass through
     and public.get_my_role() is distinct from 'admin' then
    raise exception 'Only an admin can change the debarred status';
  end if;
  return new;
end $$;

drop trigger if exists protect_debarred_students on public.students;
create trigger protect_debarred_students before update on public.students
  for each row execute function public.protect_debarred();

drop trigger if exists protect_debarred_companies on public.companies;
create trigger protect_debarred_companies before update on public.companies
  for each row execute function public.protect_debarred();

-- 6. Remove a student/company and everything attached to it ----------------------------
-- Security definer so no service_role key is ever needed in the app. Also deletes the
-- login (auth.users) so the account cannot sign back in.
create or replace function public.admin_remove_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.user_role;
begin
  if public.get_my_role() is distinct from 'admin' then
    raise exception 'Only an admin can remove users';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot remove your own account';
  end if;

  select role into r from public.users where id = target;
  if r is null then raise exception 'User not found'; end if;
  if r = 'admin' then raise exception 'Admin accounts cannot be removed here'; end if;

  if r = 'student' then
    delete from public.interviews
      where application_id in (select id from public.applications where student_id = target);
    delete from public.applications where student_id = target;
    delete from public.students where id = target;
  else
    delete from public.interviews
      where application_id in (
        select a.id from public.applications a
        join public.job_postings j on j.id = a.job_id
        where j.company_id = target);
    delete from public.applications
      where job_id in (select id from public.job_postings where company_id = target);
    delete from public.job_postings where company_id = target;
    delete from public.companies where id = target;
  end if;

  delete from public.notifications where user_id = target;
  delete from public.users where id = target;
  delete from auth.users where id = target;
end $$;

revoke all on function public.admin_remove_user(uuid) from public, anon;
grant execute on function public.admin_remove_user(uuid) to authenticated;

-- 7. Reload PostgREST schema cache ------------------------------------------------------
notify pgrst, 'reload schema';
