-- =====================================================================================
-- Adhyay Placement Portal - student features B
--   1. Resume PDFs in a private Storage bucket "resumes"
--   2. Offer accept / decline (students.offer_* on applications) + company notification
--   3. Deadline reminders (24h and 2h) every 15 minutes via pg_cron
-- Prerequisites: policies-check-and-fix.sql (public.get_my_role()) and
--                11-student-features-a.sql (student_job_prefs).
-- Enable pg_cron FIRST: Supabase Dashboard -> Database -> Extensions -> search "pg_cron" -> toggle ON.
-- Idempotent: safe to re-run.
-- =====================================================================================

-- 1. Resume bucket -----------------------------------------------------------------------
-- Private, PDF only, 5 MB. Object name is "{student uid}/resume.pdf"; students.resume_url stores
-- "resumes/{uid}/resume.pdf" (bucket/object). Old http(s) links in resume_url keep working.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880, allowed_mime_types = array['application/pdf'];

-- Student: full control of their own folder only.
drop policy if exists resumes_student_select on storage.objects;
create policy resumes_student_select on storage.objects
  for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists resumes_student_insert on storage.objects;
create policy resumes_student_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists resumes_student_update on storage.objects;
create policy resumes_student_update on storage.objects
  for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists resumes_student_delete on storage.objects;
create policy resumes_student_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- Company: read only the files of students who applied to one of ITS jobs.
drop policy if exists resumes_company_select on storage.objects;
create policy resumes_company_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resumes'
    and exists (
      select 1
      from public.applications a
      join public.job_postings j on j.id = a.job_id
      where j.company_id = auth.uid()
        and a.student_id::text = (storage.foldername(name))[1]
    )
  );

-- Admin: read everything.
drop policy if exists resumes_admin_select on storage.objects;
create policy resumes_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'resumes' and public.get_my_role() = 'admin');

-- 2. Offer response ------------------------------------------------------------------------
alter table public.applications
  add column if not exists offer_response text not null default 'pending',
  add column if not exists offer_reason text,
  add column if not exists offer_responded_at timestamptz;

alter table public.applications drop constraint if exists applications_offer_response_check;
alter table public.applications
  add constraint applications_offer_response_check check (offer_response in ('pending', 'accepted', 'declined'));

alter table public.applications drop constraint if exists applications_offer_reason_len;
alter table public.applications
  add constraint applications_offer_reason_len check (offer_reason is null or char_length(offer_reason) <= 500);

-- A student may update their own application ONLY while it is 'selected' (the trigger below limits
-- what they can change to the one-time offer answer).
drop policy if exists applications_student_offer_update on public.applications;
create policy applications_student_offer_update on public.applications
  for update to authenticated
  using (student_id = auth.uid() and status = 'selected')
  with check (student_id = auth.uid() and status = 'selected');

-- Guard: when a STUDENT updates the row, nothing but the offer answer may change, and only once.
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
    end if;
  end if;
  return new;
end $$;

drop trigger if exists applications_guard_offer on public.applications;
create trigger applications_guard_offer before update on public.applications
  for each row execute function public.guard_offer_response();

-- Notify the company when the student answers (students cannot insert notifications themselves).
create or replace function public.notify_offer_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_title   text;
  v_name    text;
begin
  if new.offer_response is distinct from old.offer_response and new.offer_response in ('accepted', 'declined') then
    select j.company_id, j.title into v_company, v_title from public.job_postings j where j.id = new.job_id;
    select coalesce(nullif(s.full_name, ''), 'A student') into v_name from public.students s where s.id = new.student_id;
    if v_company is not null then
      insert into public.notifications (user_id, message, read)
      values (
        v_company,
        v_name || ' has ' || new.offer_response || ' the offer for "' || coalesce(v_title, 'the role') || '".'
          || case when new.offer_reason is not null then ' Reason: ' || new.offer_reason else '' end,
        false);
    end if;
  end if;
  return null;
end $$;

drop trigger if exists applications_notify_offer on public.applications;
create trigger applications_notify_offer after update of offer_response on public.applications
  for each row execute function public.notify_offer_response();

-- 3. Deadline reminders ----------------------------------------------------------------------
create table if not exists public.reminder_log (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  job_id     uuid not null references public.job_postings(id) on delete cascade,
  kind       text not null check (kind in ('24h', '2h')),
  sent_at    timestamptz not null default now(),
  constraint reminder_log_unique unique (student_id, job_id, kind)
);
-- Internal table: RLS on and NO policies, so only the security-definer function below touches it.
alter table public.reminder_log enable row level security;

-- Reminds students about open drives closing soon, once per kind per drive:
--   "24h" = deadline is between 2h and 24h away,  "2h" = deadline is less than 2h away.
-- Who: has NOT applied, has NOT hidden the drive, and (saved it OR is eligible for it).
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
      and (
        coalesce(p.saved, false)
        or (
          s.cgpa is not null and s.branch is not null
          and s.cgpa >= coalesce(j.min_cgpa, 0)
          and (j.backlog_allowed or coalesce(s.backlog_count, 0) = 0)
          and exists (
            select 1 from unnest(coalesce(j.eligible_branches, '{}'::text[])) b
            where lower(btrim(b)) = lower(btrim(s.branch)))
        )
      )
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

-- Schedule every 15 minutes. If pg_cron is not enabled yet this prints a notice instead of failing:
-- enable it in the Dashboard (Database -> Extensions) and re-run this block.
do $$
begin
  create extension if not exists pg_cron;
  begin
    perform cron.unschedule('deadline-reminders');
  exception when others then
    null; -- not scheduled yet
  end;
  perform cron.schedule('deadline-reminders', '*/15 * * * *', 'select public.send_deadline_reminders()');
exception when others then
  raise notice 'pg_cron could not be scheduled (%). Enable pg_cron in Dashboard -> Database -> Extensions, then re-run this script.', sqlerrm;
end $$;

-- 4. Reload PostgREST schema cache ---------------------------------------------------------------
notify pgrst, 'reload schema';
