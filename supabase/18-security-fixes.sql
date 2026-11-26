-- =====================================================================================
-- Adhyay Placement Portal - 18. Security fixes (RLS hardening)
--
-- Prerequisites (run before this file): policies-check-and-fix.sql, 10-admin-manage.sql,
--   11-student-features-a.sql, 12-student-features-b.sql, 16-master.sql.
--   This file uses public.get_my_role(), public.is_debarred(), applications.offer_* columns
--   and the guard_offer_response trigger from those files.
--
-- Idempotent: every policy is dropped-if-exists then created, every function is
-- create-or-replace. Safe to re-run.
--
-- Design note: besides fixing the named PERMISSIVE policies, this file adds RESTRICTIVE
-- policies with the same rule. Postgres ORs permissive policies together, so an old
-- permissive policy created by hand in the dashboard (not in this repo) could otherwise
-- re-open the hole. Restrictive policies are ANDed with everything, so they hold even then.
--
-- Security-definer functions that write notifications (notify_offer_response,
-- send_deadline_reminders, admin_remove_user ...) run as the table owner, which is not
-- subject to RLS (unless FORCE ROW LEVEL SECURITY is on - check query V6 below), so they
-- keep working.
--
-- RUN ON A TEST COPY FIRST. Then walk through the checklist at the end of this file.
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- 0. Helper functions (SECURITY DEFINER, fixed search_path, caller = auth.uid() only)
-- -------------------------------------------------------------------------------------

-- Is the drive accepting registrations right now? (open + deadline in the future)
-- Deadlines are stored as UTC, same convention as applications_student_withdraw.
create or replace function public.is_job_open_for_registration(p_job uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.job_postings j
    where j.id = p_job
      and j.status = 'open'
      and j.deadline is not null
      and (j.deadline::timestamp at time zone 'UTC') > now()
  )
$$;

-- Is the CALLING student eligible for this drive? Mirrors the client feed filter
-- (src/app/(student)/jobs.tsx) and send_deadline_reminders():
--   cgpa >= min_cgpa (missing min = 0), branch listed (case/space-insensitive),
--   backlogs only if backlog_allowed. A profile without CGPA or branch is not eligible
--   (the app shows "profile incomplete" in that case).
-- Uses auth.uid() on purpose: it takes no student id, so it cannot be used to probe
-- another student's eligibility.
create or replace function public.is_student_eligible(p_job uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.job_postings j
    join public.students s on s.id = auth.uid()
    where j.id = p_job
      and s.cgpa is not null
      and s.branch is not null
      and btrim(s.branch) <> ''
      and s.cgpa >= coalesce(j.min_cgpa, 0)
      and (coalesce(j.backlog_allowed, false) or coalesce(s.backlog_count, 0) = 0)
      and exists (
        select 1 from unnest(coalesce(j.eligible_branches, '{}'::text[])) b
        where lower(btrim(b)) = lower(btrim(s.branch)))
  )
$$;

-- May the CALLING company notify this user? Only students who applied to one of its jobs.
create or replace function public.company_can_notify(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    join public.job_postings j on j.id = a.job_id
    where j.company_id = auth.uid()
      and a.student_id = p_user
  )
$$;

-- Is the CALLING user an approved company?
create or replace function public.is_approved_company()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select c.approved from public.companies c where c.id = auth.uid()), false)
$$;

revoke all on function public.is_job_open_for_registration(uuid) from public, anon;
revoke all on function public.is_student_eligible(uuid)          from public, anon;
revoke all on function public.company_can_notify(uuid)           from public, anon;
revoke all on function public.is_approved_company()              from public, anon;
grant execute on function public.is_job_open_for_registration(uuid) to authenticated;
grant execute on function public.is_student_eligible(uuid)          to authenticated;
grant execute on function public.company_can_notify(uuid)           to authenticated;
grant execute on function public.is_approved_company()              to authenticated;


-- -------------------------------------------------------------------------------------
-- A1. applications INSERT: only a fresh, eligible registration for an open drive
-- -------------------------------------------------------------------------------------
-- The app inserts { student_id, job_id, status: 'applied' } and lets every other column
-- default (current_round 1, offer_response 'pending'). WITH CHECK sees the defaults.
drop policy if exists applications_student_insert on public.applications;
create policy applications_student_insert on public.applications
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.get_my_role() = 'student'
    and status = 'applied'
    and coalesce(current_round, 1) = 1
    and offer_response = 'pending'
    and offer_reason is null
    and offer_responded_at is null
    and public.is_job_open_for_registration(job_id)
    and public.is_student_eligible(job_id)
  );

-- Same rule as RESTRICTIVE, so no other (legacy) permissive INSERT policy can bypass it.
drop policy if exists applications_insert_guard on public.applications;
create policy applications_insert_guard on public.applications
  as restrictive for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.get_my_role() = 'student'
    and status = 'applied'
    and coalesce(current_round, 1) = 1
    and offer_response = 'pending'
    and offer_reason is null
    and offer_responded_at is null
    and public.is_job_open_for_registration(job_id)
    and public.is_student_eligible(job_id)
  );

-- applications_not_debarred (restrictive, 10-admin-manage.sql) is left untouched.

-- One registration per student per drive. Add a constraint only if no unique
-- constraint / unique index on exactly (student_id, job_id) exists yet.
do $$
begin
  if not exists (
    select 1
    from pg_index i
    where i.indrelid = 'public.applications'::regclass
      and i.indisunique
      and (
        select array_agg(a.attname::text order by a.attname)
        from unnest(i.indkey) k
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k
      ) = array['job_id', 'student_id']
  ) then
    alter table public.applications
      add constraint applications_student_job_unique unique (student_id, job_id);
  end if;
end $$;


-- -------------------------------------------------------------------------------------
-- A2. applications UPDATE: students may not change their own status
-- -------------------------------------------------------------------------------------
-- Already true: applications_student_offer_update only matches status = 'selected', and the
-- guard_offer_response trigger raises if a student changes status / job_id / student_id /
-- current_round / applied_at. Two hardening steps:
--
-- (a) RESTRICTIVE update policy, so a legacy "students can update own applications" policy
--     cannot widen access. Students: only their own 'selected' row. Companies: only rows of
--     their own jobs. Admin: allowed (the app does not update applications as admin today).
drop policy if exists applications_update_guard on public.applications;
create policy applications_update_guard on public.applications
  as restrictive for update to authenticated
  using (
    public.get_my_role() = 'admin'
    or (student_id = auth.uid() and status = 'selected')
    or exists (select 1 from public.job_postings j where j.id = applications.job_id and j.company_id = auth.uid())
  )
  with check (
    public.get_my_role() = 'admin'
    or (student_id = auth.uid() and status = 'selected')
    or exists (select 1 from public.job_postings j where j.id = applications.job_id and j.company_id = auth.uid())
  );

-- (b) guard_offer_response, same behaviour as 12-student-features-b.sql, plus: a student
--     cannot write offer_responded_at by hand (it is always server time, or unchanged).
create or replace function public.guard_offer_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() = old.student_id and public.get_my_role() = 'student' then
    if new.status is distinct from old.status
       or new.job_id is distinct from old.job_id
       or new.student_id is distinct from old.student_id
       or new.current_round is distinct from old.current_round
       or new.applied_at is distinct from old.applied_at then
      raise exception 'Students can only answer the offer';
    end if;
    if new.offer_response is distinct from old.offer_response
       or new.offer_reason is distinct from old.offer_reason then
      if old.offer_response <> 'pending' then
        raise exception 'You have already answered this offer';
      end if;
      if new.offer_response not in ('accepted', 'declined') then
        raise exception 'Choose accept or decline';
      end if;
      new.offer_reason := nullif(btrim(coalesce(new.offer_reason, '')), '');
      new.offer_responded_at := now();
    else
      new.offer_responded_at := old.offer_responded_at;
    end if;
  end if;
  return new;
end $$;
-- (trigger applications_guard_offer from 12-student-features-b.sql already points at this function)


-- -------------------------------------------------------------------------------------
-- A3. notifications INSERT: admin -> anyone; company -> only its own applicants
-- -------------------------------------------------------------------------------------
drop policy if exists notifications_staff_insert on public.notifications;
create policy notifications_staff_insert on public.notifications
  for insert to authenticated
  with check (
    public.get_my_role() = 'admin'
    or (public.get_my_role() = 'company' and public.company_can_notify(user_id))
  );

drop policy if exists notifications_insert_guard on public.notifications;
create policy notifications_insert_guard on public.notifications
  as restrictive for insert to authenticated
  with check (
    public.get_my_role() = 'admin'
    or (public.get_my_role() = 'company' and public.company_can_notify(user_id))
  );


-- -------------------------------------------------------------------------------------
-- A4. job_postings: insert only by an approved, non-debarred company, as itself;
--     update / delete only own jobs (admin may update, e.g. close a posting)
-- -------------------------------------------------------------------------------------
-- job_postings_company_all (FOR ALL, company_id = auth.uid()) and job_postings_admin_update
-- stay as they are. job_postings_not_debarred (restrictive insert) stays as it is.
drop policy if exists job_postings_insert_guard on public.job_postings;
create policy job_postings_insert_guard on public.job_postings
  as restrictive for insert to authenticated
  with check (
    company_id = auth.uid()
    and public.get_my_role() = 'company'
    and public.is_approved_company()
    and not public.is_debarred()
  );

drop policy if exists job_postings_update_guard on public.job_postings;
create policy job_postings_update_guard on public.job_postings
  as restrictive for update to authenticated
  using (company_id = auth.uid() or public.get_my_role() = 'admin')
  with check (company_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists job_postings_delete_guard on public.job_postings;
create policy job_postings_delete_guard on public.job_postings
  as restrictive for delete to authenticated
  using (company_id = auth.uid() or public.get_my_role() = 'admin');


-- -------------------------------------------------------------------------------------
-- A6. Deadline reminders go ONLY to students eligible for the drive
-- -------------------------------------------------------------------------------------
-- Same as 12-student-features-b.sql except: a saved drive no longer earns a reminder on its own.
-- Still skipped: students who already registered or hid the drive. pg_cron keeps calling
-- this function by name, so the schedule does not need to change.
create or replace function public.send_deadline_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with windows(kind, lo, hi) as (
    values ('24h', interval '2 hours', interval '24 hours'),
           ('2h',  interval '0 hours', interval '2 hours')
  ),
  due as (
    select s.id as student_id, j.id as job_id, w.kind
    from public.job_postings j
    join windows w
      on (j.deadline::timestamp at time zone 'UTC') >  now() + w.lo
     and (j.deadline::timestamp at time zone 'UTC') <= now() + w.hi
    join public.students s on true
    left join public.student_job_prefs p on p.student_id = s.id and p.job_id = j.id
    where j.status = 'open'
      and not exists (select 1 from public.applications a where a.student_id = s.id and a.job_id = j.id)
      and coalesce(p.hidden, false) = false
      and s.cgpa is not null
      and s.branch is not null
      and btrim(s.branch) <> ''
      and s.cgpa >= coalesce(j.min_cgpa, 0)
      and (coalesce(j.backlog_allowed, false) or coalesce(s.backlog_count, 0) = 0)
      and exists (
        select 1 from unnest(coalesce(j.eligible_branches, '{}'::text[])) b
        where lower(btrim(b)) = lower(btrim(s.branch)))
  ),
  logged as (
    insert into public.reminder_log (student_id, job_id, kind)
    select student_id, job_id, kind from due
    on conflict (student_id, job_id, kind) do nothing
    returning student_id, job_id, kind
  ),
  sent as (
    insert into public.notifications (user_id, message, read)
    select l.student_id,
           'Reminder: registration for "' || j.title || '" closes in about '
             || case l.kind when '24h' then '24 hours' else '2 hours' end || '. Register before the deadline.',
           false
    from logged l
    join public.job_postings j on j.id = l.job_id
    returning 1
  )
  select count(*) into v_count from sent;
  return coalesce(v_count, 0);
end $$;

-- Only the scheduler (postgres) runs this; it must not be callable from the app.
revoke all on function public.send_deadline_reminders() from public, anon, authenticated;


-- -------------------------------------------------------------------------------------
-- A7. An application's student_id and job_id can never change from the app
-- -------------------------------------------------------------------------------------
-- RLS cannot compare old and new values, so a company could otherwise move one of its
-- applications to a different student. Blocks every signed-in caller (student, company,
-- admin); the SQL editor / service role (auth.uid() is null) can still fix data by hand.
create or replace function public.protect_application_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and (new.student_id is distinct from old.student_id or new.job_id is distinct from old.job_id) then
    raise exception 'An application cannot be moved to another student or drive';
  end if;
  return new;
end $$;

drop trigger if exists applications_protect_identity on public.applications;
create trigger applications_protect_identity before update on public.applications
  for each row execute function public.protect_application_identity();


-- -------------------------------------------------------------------------------------
-- A8. applied_at is always the server time of the insert (cannot be back-dated)
-- -------------------------------------------------------------------------------------
-- Applies to inserts from the app; SQL editor / service role imports keep their value.
-- Changing applied_at later is already blocked for students (guard_offer_response).
create or replace function public.stamp_applied_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.applied_at := now();
  end if;
  return new;
end $$;

drop trigger if exists applications_stamp_applied_at on public.applications;
create trigger applications_stamp_applied_at before insert on public.applications
  for each row execute function public.stamp_applied_at();


notify pgrst, 'reload schema';


-- =====================================================================================
-- A5. VERIFY (paste into the SQL editor one at a time; all read-only)
-- =====================================================================================
-- V1. Every policy on the three tables (look for the *_guard rows with permissive = RESTRICTIVE):
-- select tablename, policyname, permissive, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename in ('applications', 'notifications', 'job_postings')
-- order by tablename, cmd, permissive, policyname;
--
-- V2. Any OTHER permissive INSERT/UPDATE policy you did not expect (should list only the ones
--     named in this repo; anything else was created by hand and is now capped by the guards):
-- select tablename, policyname, cmd from pg_policies
-- where schemaname = 'public' and tablename in ('applications', 'notifications', 'job_postings')
--   and permissive = 'PERMISSIVE' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
--   and policyname not in ('applications_student_insert', 'applications_company_update',
--     'applications_student_offer_update', 'applications_student_withdraw',
--     'notifications_staff_insert', 'notifications_own_update',
--     'job_postings_company_all', 'job_postings_admin_update');
--
-- V3. Helper functions exist, are SECURITY DEFINER and pin search_path:
-- select proname, prosecdef, proconfig from pg_proc
-- where pronamespace = 'public'::regnamespace
--   and proname in ('is_student_eligible', 'is_job_open_for_registration', 'company_can_notify',
--                   'is_approved_company', 'get_my_role', 'is_debarred', 'guard_offer_response',
--                   'send_deadline_reminders', 'protect_application_identity', 'stamp_applied_at');
--
-- V4. Unique (student_id, job_id) on applications:
-- select indexrelid::regclass, indisunique from pg_index
-- where indrelid = 'public.applications'::regclass and indisunique;
--
-- V5. Triggers still attached (expect applications_protect_identity and
--     applications_stamp_applied_at next to the older ones):
-- select tgname, tgrelid::regclass from pg_trigger
-- where not tgisinternal and tgrelid = 'public.applications'::regclass;
--
-- V6. FORCE RLS must be OFF, otherwise security-definer functions that insert
--     notifications (offer response, deadline reminders) would be blocked:
-- select relname, relrowsecurity, relforcerowsecurity from pg_class
-- where relnamespace = 'public'::regnamespace
--   and relname in ('applications', 'notifications', 'job_postings');
--
-- V7. Duplicate registrations that would stop the unique constraint being added:
-- select student_id, job_id, count(*) from public.applications
-- group by 1, 2 having count(*) > 1;


-- =====================================================================================
-- MANUAL TEST CHECKLIST (do it in the app on the TEST copy, signed in as each role)
-- Tip: from the browser console you can also try direct calls with the app's supabase
-- client, e.g. supabase.from('applications').insert({...}). "Fail" = RLS error 42501
-- ("new row violates row-level security policy") or 0 rows affected.
-- =====================================================================================
-- STUDENT (eligible profile: CGPA + branch filled in)
--   [ ] Register for an open, eligible drive before its deadline      -> SUCCEEDS
--   [ ] Register for the same drive again                             -> FAILS (23505 unique, app says "Already Registered")
--   [ ] Insert an application with status 'selected' or 'shortlisted' -> FAILS
--   [ ] Insert an application with current_round = 3                  -> FAILS
--   [ ] Insert an application with student_id = another student       -> FAILS
--   [ ] Insert an application with applied_at = '2020-01-01'          -> SUCCEEDS, but the row shows the current time
--   [ ] Register for a drive whose deadline has passed                -> FAILS
--   [ ] Register for a closed drive                                   -> FAILS
--   [ ] Register for a drive with min_cgpa above your CGPA            -> FAILS
--   [ ] Register for a drive whose branches do not include yours      -> FAILS
--   [ ] With backlog_count > 0, register for a drive with backlog_allowed = false -> FAILS
--   [ ] Clear your CGPA (profile incomplete) and register             -> FAILS
--   [ ] Withdraw an 'applied' registration before the deadline        -> SUCCEEDS
--   [ ] Update your own application's status to 'selected'            -> FAILS
--   [ ] When 'selected': accept or decline the offer once             -> SUCCEEDS, company gets a notification
--   [ ] Answer the offer a second time                                -> FAILS ("already answered")
--   [ ] Insert a notification for anyone                              -> FAILS
--   [ ] Insert a job_postings row                                     -> FAILS
--   [ ] Debarred student registers                                    -> FAILS
--
-- COMPANY (approved)
--   [ ] Post a drive                                                  -> SUCCEEDS
--   [ ] Close / reopen own drive (My Jobs)                            -> SUCCEEDS
--   [ ] Update or delete ANOTHER company's drive                      -> FAILS (0 rows)
--   [ ] Insert a drive with company_id = another company              -> FAILS
--   [ ] Shortlist / reject an applicant (student gets a notification) -> SUCCEEDS
--   [ ] Schedule an interview, mark a round result (student notified) -> SUCCEEDS
--   [ ] Insert a notification for a student who did NOT apply to you  -> FAILS
--   [ ] Insert a notification for an admin or another company         -> FAILS
--   [ ] Update an application of another company's drive              -> FAILS (0 rows)
--   [ ] Update own applicant's student_id or job_id                   -> FAILS ("cannot be moved")
-- COMPANY (not approved yet, or rejected)
--   [ ] Post a drive (bypassing the app check)                        -> FAILS
-- COMPANY (debarred)
--   [ ] Post a drive                                                  -> FAILS
--
-- ADMIN
--   [ ] Broadcast to all / a branch                                   -> SUCCEEDS
--   [ ] Reject a company with a reason (company notified)             -> SUCCEEDS
--   [ ] Resolve a support query (user notified)                       -> SUCCEEDS
--   [ ] Close any posting (Admin -> Jobs)                             -> SUCCEEDS
--   [ ] Remove a student / company                                    -> SUCCEEDS
--   [ ] Insert an application                                         -> FAILS (admins do not register)
--
-- BACKGROUND
--   [ ] select public.send_deadline_reminders();  (as postgres in the SQL editor) -> returns a count, no RLS error
--   [ ] A student who SAVED a drive but is NOT eligible gets no reminder; an eligible student who did not
--       hide it does (set a test drive's deadline ~20 hours ahead, run the function, check notifications)
-- =====================================================================================
