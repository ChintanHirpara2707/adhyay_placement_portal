-- =====================================================================================
-- Adhyay Placement Portal - master script for the 10 feature batch.
-- One section per feature, appended as each feature is built. Idempotent: safe to re-run.
-- Run the WHOLE file in the Supabase SQL Editor each time a new section is added.
-- Prerequisite: public.get_my_role() from policies-check-and-fix.sql.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- FEATURE 1 - Company reschedule / cancel interview
-- -------------------------------------------------------------------------------------
alter table public.interviews add column if not exists status text not null default 'scheduled';
alter table public.interviews drop constraint if exists interviews_status_check;
alter table public.interviews
  add constraint interviews_status_check check (status in ('scheduled', 'cancelled'));

-- Optional reason the company gives when it reschedules or cancels (shown to the student).
alter table public.interviews add column if not exists reschedule_note text;
alter table public.interviews drop constraint if exists interviews_reschedule_note_len;
alter table public.interviews
  add constraint interviews_reschedule_note_len check (reschedule_note is null or char_length(reschedule_note) <= 500);

-- (interviews_company_update / interviews_student_select policies already cover these columns.)

notify pgrst, 'reload schema';

-- -------------------------------------------------------------------------------------
-- FEATURE 2 - Company logo (shown in the student job feed and announcement)
-- -------------------------------------------------------------------------------------
alter table public.companies add column if not exists logo_url text;

-- Public bucket (logos are shown to every student). PNG/JPEG/WebP, 2 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-logos', 'company-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

-- Anyone can read logos; only a company can write, and only inside its own folder "{uid}/...".
drop policy if exists company_logos_public_select on storage.objects;
create policy company_logos_public_select on storage.objects
  for select to anon, authenticated using (bucket_id = 'company-logos');

drop policy if exists company_logos_company_insert on storage.objects;
create policy company_logos_company_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-logos' and (storage.foldername(name))[1] = auth.uid()::text
              and public.get_my_role() = 'company');

drop policy if exists company_logos_company_update on storage.objects;
create policy company_logos_company_update on storage.objects
  for update to authenticated
  using (bucket_id = 'company-logos' and (storage.foldername(name))[1] = auth.uid()::text
         and public.get_my_role() = 'company')
  with check (bucket_id = 'company-logos' and (storage.foldername(name))[1] = auth.uid()::text
              and public.get_my_role() = 'company');

drop policy if exists company_logos_company_delete on storage.objects;
create policy company_logos_company_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-logos' and (storage.foldername(name))[1] = auth.uid()::text
         and public.get_my_role() = 'company');

notify pgrst, 'reload schema';

-- -------------------------------------------------------------------------------------
-- FEATURE 3 - Debar reason + debar history (reason is shown to the student at sign-in)
-- (Needs 10-admin-manage.sql for the `debarred` columns and protect_debarred trigger.)
-- -------------------------------------------------------------------------------------
alter table public.students  add column if not exists debar_reason text;
alter table public.companies add column if not exists debar_reason text;

alter table public.students  drop constraint if exists students_debar_reason_len;
alter table public.students
  add constraint students_debar_reason_len check (debar_reason is null or char_length(debar_reason) <= 500);
alter table public.companies drop constraint if exists companies_debar_reason_len;
alter table public.companies
  add constraint companies_debar_reason_len check (debar_reason is null or char_length(debar_reason) <= 500);

-- Append-only audit trail. No foreign key on purpose: the history survives if the account is removed.
create table if not exists public.debar_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  role       text not null check (role in ('student', 'company')),
  action     text not null check (action in ('debarred', 'undebarred')),
  reason     text,
  acted_by   uuid,
  created_at timestamptz not null default now()
);
create index if not exists debar_history_user_idx on public.debar_history (user_id, created_at desc);

alter table public.debar_history enable row level security;

-- Admin reads everything; a student/company reads only their own history.
-- Rows are written by the trigger below (SECURITY DEFINER), so there is no UPDATE/DELETE policy at all.
drop policy if exists debar_history_admin_select on public.debar_history;
create policy debar_history_admin_select on public.debar_history
  for select to authenticated using (public.get_my_role() = 'admin');

drop policy if exists debar_history_own_select on public.debar_history;
create policy debar_history_own_select on public.debar_history
  for select to authenticated using (user_id = auth.uid());

drop policy if exists debar_history_admin_insert on public.debar_history;
create policy debar_history_admin_insert on public.debar_history
  for insert to authenticated with check (public.get_my_role() = 'admin');

-- Log every change of `debarred` automatically, with who did it and the reason given.
create or replace function public.log_debar_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.debarred is distinct from old.debarred then
    insert into public.debar_history (user_id, role, action, reason, acted_by)
    values (
      new.id,
      case tg_table_name when 'students' then 'student' else 'company' end,
      case when new.debarred then 'debarred' else 'undebarred' end,
      case when new.debarred then new.debar_reason else null end,
      auth.uid());
  end if;
  return null;
end $$;

drop trigger if exists students_log_debar on public.students;
create trigger students_log_debar after update of debarred on public.students
  for each row execute function public.log_debar_change();

drop trigger if exists companies_log_debar on public.companies;
create trigger companies_log_debar after update of debarred on public.companies
  for each row execute function public.log_debar_change();

-- Only an admin may change `debarred` OR `debar_reason` (replaces the version from 10-admin-manage.sql).
create or replace function public.protect_debarred()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.debarred is distinct from old.debarred or new.debar_reason is distinct from old.debar_reason)
     and auth.uid() is not null                       -- SQL editor / service role pass through
     and public.get_my_role() is distinct from 'admin' then
    raise exception 'Only an admin can change the debarred status';
  end if;
  return new;
end $$;

notify pgrst, 'reload schema';

-- -------------------------------------------------------------------------------------
-- FEATURE 4 - Company rejection reason on admin approval (company sees it on its dashboard)
-- A rejected company is KEPT (approved = false, rejection_reason set) instead of deleted, so it can
-- read the reason, fix its profile and resubmit. Admin can still delete it from the Companies page.
-- -------------------------------------------------------------------------------------
alter table public.companies add column if not exists rejection_reason text;
alter table public.companies drop constraint if exists companies_rejection_reason_len;
alter table public.companies
  add constraint companies_rejection_reason_len check (rejection_reason is null or char_length(rejection_reason) <= 500);

-- Review state belongs to the admin: a company may not approve itself or write a rejection reason.
-- It MAY clear rejection_reason (that is how it resubmits for review).
create or replace function public.protect_company_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and public.get_my_role() is distinct from 'admin' then
    if new.approved is distinct from old.approved then
      raise exception 'Only an admin can change company approval';
    end if;
    if new.rejection_reason is distinct from old.rejection_reason and new.rejection_reason is not null then
      raise exception 'Only an admin can set a rejection reason';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists companies_protect_review on public.companies;
create trigger companies_protect_review before update on public.companies
  for each row execute function public.protect_company_review();

notify pgrst, 'reload schema';

-- -------------------------------------------------------------------------------------
-- FEATURE 7 - Pagination (20 per page) for admin lists
-- Two read-only views so search / filters / sorting / counts all run in the database and
-- .range() pages stay correct. security_invoker = the caller's RLS applies, so only admins
-- (who can read these tables) see everyone; any other user sees nothing beyond their own row.
-- Needs the `debarred`, `debar_reason`, `rejection_reason`, `logo_url` columns from earlier sections.
-- -------------------------------------------------------------------------------------
create or replace view public.admin_student_list
with (security_invoker = true) as
select
  s.id, s.full_name, s.branch, s.cgpa, s.backlog_count, s.phone, s.skills, s.resume_url,
  s.debarred, s.debar_reason,
  u.email, u.created_at as registered_at,
  coalesce(a.placed, false)      as placed,
  coalesce(a.app_count, 0)::int  as app_count
from public.students s
left join public.users u on u.id = s.id
left join (
  select student_id, bool_or(status = 'selected') as placed, count(*) as app_count
  from public.applications
  group by student_id
) a on a.student_id = s.id;

create or replace view public.admin_company_list
with (security_invoker = true) as
select
  c.id, c.company_name, c.description, c.website, c.approved,
  c.debarred, c.debar_reason, c.rejection_reason, c.logo_url,
  u.email, u.created_at as registered_at
from public.companies c
left join public.users u on u.id = c.id;

revoke all on public.admin_student_list from public, anon;
revoke all on public.admin_company_list from public, anon;
grant select on public.admin_student_list to authenticated;
grant select on public.admin_company_list to authenticated;

-- Supports newest-first notification paging.
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists applications_student_applied_idx on public.applications (student_id, applied_at desc);

notify pgrst, 'reload schema';

-- -------------------------------------------------------------------------------------
-- FEATURE 8 - Help / contact the placement cell (support_tickets)
-- -------------------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  role        text,                                  -- set by trigger from the caller's real role
  subject     text not null check (char_length(subject) between 3 and 120),
  message     text not null check (char_length(message) between 10 and 2000),
  status      text not null default 'open' check (status in ('open', 'resolved')),
  admin_reply text check (admin_reply is null or char_length(admin_reply) <= 1000),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists support_tickets_status_idx on public.support_tickets (status, created_at desc);
create index if not exists support_tickets_user_idx   on public.support_tickets (user_id, created_at desc);

alter table public.support_tickets enable row level security;

-- A user files tickets as themselves, always 'open' and without a reply; reads only their own.
drop policy if exists support_tickets_own_insert on public.support_tickets;
create policy support_tickets_own_insert on public.support_tickets
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'open' and admin_reply is null and resolved_at is null);

drop policy if exists support_tickets_own_select on public.support_tickets;
create policy support_tickets_own_select on public.support_tickets
  for select to authenticated using (user_id = auth.uid());

-- Admin reads everything and answers / resolves. Nobody can delete tickets.
drop policy if exists support_tickets_admin_select on public.support_tickets;
create policy support_tickets_admin_select on public.support_tickets
  for select to authenticated using (public.get_my_role() = 'admin');

drop policy if exists support_tickets_admin_update on public.support_tickets;
create policy support_tickets_admin_update on public.support_tickets
  for update to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

-- Stamp the real role and stop spam: at most 5 tickets per user per hour.
create or replace function public.prepare_support_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.role := public.get_my_role()::text;
  if (select count(*) from public.support_tickets
        where user_id = new.user_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'You have sent too many queries recently. Please wait a while before sending another.';
  end if;
  return new;
end $$;

drop trigger if exists support_tickets_prepare on public.support_tickets;
create trigger support_tickets_prepare before insert on public.support_tickets
  for each row execute function public.prepare_support_ticket();

notify pgrst, 'reload schema';

-- -------------------------------------------------------------------------------------
-- FEATURE 9 - Terms / Privacy consent (users.consent_at)
-- Email sign-up: the app sends `terms_accepted: true` in the auth metadata, and the handle_new_user trigger
--   creates the users row. This BEFORE INSERT trigger on public.users reads that metadata and stamps the time,
--   so handle_new_user itself does not need to change.
-- Google sign-in: the choose-role screen inserts the users row itself with consent_at set.
-- Either way the stored time is the SERVER's now(), so it cannot be backdated. Existing users keep NULL
-- (they signed up before consent was collected).
-- -------------------------------------------------------------------------------------
alter table public.users add column if not exists consent_at timestamptz;

create or replace function public.stamp_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_accepted boolean;
begin
  select coalesce(u.raw_user_meta_data ->> 'terms_accepted', '') = 'true'
    into v_accepted
  from auth.users u
  where u.id = new.id;

  if new.consent_at is not null or coalesce(v_accepted, false) then
    new.consent_at := now();
  end if;
  return new;
end $$;

drop trigger if exists users_stamp_consent on public.users;
create trigger users_stamp_consent before insert on public.users
  for each row execute function public.stamp_consent();

-- Once recorded, consent_at is never rewritten; a still-NULL value may be set once (server time).
create or replace function public.protect_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.consent_at is distinct from old.consent_at then
    if old.consent_at is not null then
      new.consent_at := old.consent_at;
    elsif new.consent_at is not null then
      new.consent_at := now();
    end if;
  end if;
  return new;
end $$;

drop trigger if exists users_protect_consent on public.users;
create trigger users_protect_consent before update on public.users
  for each row execute function public.protect_consent();

notify pgrst, 'reload schema';

-- -------------------------------------------------------------------------------------
-- FEATURE 10 - Realtime: screens refresh themselves when the data changes (no reload / pull-to-refresh)
-- Realtime respects RLS: every user only receives change events for rows they are allowed to SELECT.
-- Also: Dashboard -> Database -> Replication / Realtime must be enabled for the project (it is by default).
-- -------------------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['notifications', 'applications', 'interviews', 'job_postings', 'companies', 'students', 'support_tickets']
  loop
    if to_regclass('public.' || t) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t)
    then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Needed so DELETE / filtered UPDATE events carry the whole old row (e.g. a withdrawn application, filtered by student_id).
alter table public.notifications  replica identity full;
alter table public.applications   replica identity full;
alter table public.interviews     replica identity full;
alter table public.job_postings   replica identity full;
alter table public.companies      replica identity full;
alter table public.students       replica identity full;
alter table public.support_tickets replica identity full;

notify pgrst, 'reload schema';
