-- =====================================================================================
-- Adhyay Placement Portal - 19. Follow-ups to 18-security-fixes.sql
--
-- Run AFTER 18-security-fixes.sql (it replaces send_deadline_reminders() from that file).
-- Idempotent: create-or-replace only. Safe to re-run. Run on a TEST COPY first.
--
-- 1. Deadline reminders skip debarred students (a debarred student cannot register, so a
--    "register before the deadline" reminder would be wrong).
-- 2. Read-only check for old drives that have no eligible branches (see the end of the file).
-- =====================================================================================

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
      and coalesce(s.debarred, false) = false
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

notify pgrst, 'reload schema';


-- =====================================================================================
-- CHECK (read-only; paste into the SQL editor)
-- Old drives with no eligible branches. Since 18-security-fixes.sql nobody can register for
-- them (the rule needs the student's branch in the list). New drives cannot be saved like this
-- (the post-job form requires at least one branch), so only old rows can show up here.
--
-- select j.id, j.title, j.status, j.deadline, c.company_name
-- from public.job_postings j
-- join public.companies c on c.id = j.company_id
-- where coalesce(array_length(j.eligible_branches, 1), 0) = 0
-- order by j.created_at desc;
--
-- For each row you either (a) close the drive and ask the company to repost it:
--   update public.job_postings set status = 'closed' where id = '<id>';
-- or (b) set the branches it was meant for:
--   update public.job_postings set eligible_branches = array['<branch 1>', '<branch 2>'] where id = '<id>';
-- Use the exact branch names from src/constants/branches.ts.
--
-- Check the reminder function after running this file (as postgres in the SQL editor):
--   select public.send_deadline_reminders();   -- returns a count, no error
-- A debarred student must get no reminder.
-- =====================================================================================
