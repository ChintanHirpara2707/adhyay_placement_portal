-- =====================================================================================
-- Admin can read public.users (company / student emails on Approvals, Students, Companies)
-- Run once in the Supabase SQL Editor. Needs public.get_my_role() from policies-check-and-fix.sql.
-- Idempotent: the same policy also appears in 10-admin-manage.sql, so re-running either is harmless.
-- Uses the security-definer get_my_role() so the policy never queries `users` itself (that recursed before).
-- =====================================================================================
drop policy if exists users_admin_select on public.users;
create policy users_admin_select on public.users
  for select to authenticated
  using (public.get_my_role() = 'admin');

notify pgrst, 'reload schema';
