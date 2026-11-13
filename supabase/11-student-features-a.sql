-- =====================================================================================
-- Adhyay Placement Portal - student features A
--   1. Saved / hidden drives synced across devices   (student_job_prefs)
--   2. Withdraw a registration before the deadline   (applications DELETE policy)
--   3. Application status timeline                   (application_status_history + trigger)
-- Run once in the Supabase SQL Editor (needs public.get_my_role() from policies-check-and-fix.sql).
-- Idempotent: safe to re-run.
-- =====================================================================================

-- 1. Saved / hidden drives -------------------------------------------------------------
create table if not exists public.student_job_prefs (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  job_id     uuid not null references public.job_postings(id) on delete cascade,
  saved      boolean not null default false,
  hidden     boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint student_job_prefs_pair_unique unique (student_id, job_id)
);

alter table public.student_job_prefs enable row level security;

drop policy if exists student_job_prefs_own_select on public.student_job_prefs;
create policy student_job_prefs_own_select on public.student_job_prefs
  for select to authenticated using (student_id = auth.uid());

drop policy if exists student_job_prefs_own_insert on public.student_job_prefs;
create policy student_job_prefs_own_insert on public.student_job_prefs
  for insert to authenticated with check (student_id = auth.uid());

drop policy if exists student_job_prefs_own_update on public.student_job_prefs;
create policy student_job_prefs_own_update on public.student_job_prefs
  for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists student_job_prefs_own_delete on public.student_job_prefs;
create policy student_job_prefs_own_delete on public.student_job_prefs
  for delete to authenticated using (student_id = auth.uid());

-- 2. Withdraw: a student may delete ONLY their own application while it is still 'applied'
--    and the drive's deadline has not passed. (Deadlines are stored as UTC.)
drop policy if exists applications_student_withdraw on public.applications;
create policy applications_student_withdraw on public.applications
  for delete to authenticated
  using (
    student_id = auth.uid()
    and status = 'applied'
    and exists (
      select 1 from public.job_postings j
      where j.id = applications.job_id
        and (j.deadline::timestamp at time zone 'UTC') > now()
    )
  );

-- 3. Status timeline --------------------------------------------------------------------
create table if not exists public.application_status_history (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  status         public.application_status not null,
  changed_at     timestamptz not null default now()
);

create index if not exists application_status_history_app_idx
  on public.application_status_history (application_id, changed_at);

alter table public.application_status_history enable row level security;

-- Read-only for everyone: rows are written only by the trigger below (no INSERT/UPDATE/DELETE policy).
drop policy if exists status_history_student_select on public.application_status_history;
create policy status_history_student_select on public.application_status_history
  for select to authenticated
  using (exists (
    select 1 from public.applications a
    where a.id = application_status_history.application_id and a.student_id = auth.uid()));

drop policy if exists status_history_company_select on public.application_status_history;
create policy status_history_company_select on public.application_status_history
  for select to authenticated
  using (exists (
    select 1 from public.applications a
    join public.job_postings j on j.id = a.job_id
    where a.id = application_status_history.application_id and j.company_id = auth.uid()));

drop policy if exists status_history_admin_select on public.application_status_history;
create policy status_history_admin_select on public.application_status_history
  for select to authenticated using (public.get_my_role() = 'admin');

create or replace function public.log_application_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_status_history (application_id, status) values (new.id, new.status);
  elsif new.status is distinct from old.status then
    insert into public.application_status_history (application_id, status) values (new.id, new.status);
  end if;
  return null;
end $$;

drop trigger if exists applications_log_status on public.applications;
create trigger applications_log_status
  after insert or update of status on public.applications
  for each row execute function public.log_application_status();

-- Backfill for applications that already exist (exact "applied" time; later steps were not recorded,
-- so a non-applied current status is stamped with the time you run this script).
insert into public.application_status_history (application_id, status, changed_at)
select a.id, 'applied', coalesce(a.applied_at, now())
from public.applications a
where not exists (select 1 from public.application_status_history h where h.application_id = a.id);

insert into public.application_status_history (application_id, status, changed_at)
select a.id, a.status, now()
from public.applications a
where a.status <> 'applied'
  and not exists (
    select 1 from public.application_status_history h
    where h.application_id = a.id and h.status = a.status);

-- 4. Reload PostgREST schema cache ------------------------------------------------------
notify pgrst, 'reload schema';
