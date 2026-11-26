@AGENTS.md
# Adhyay Placement Portal — Project Guide for Claude Code

## 0. HARD RULES (no exceptions)
1. NEVER open, read, grep, cat, diff, edit or quote `src/lib/supabase.ts`. The owner has forbidden it.
   Importing `@/lib/supabase` in other files is fine. Exclude it from every search
   (`grep --exclude=supabase.ts`, `git diff -- . ':(exclude)src/lib/supabase.ts'`).
2. Read https://docs.expo.dev/versions/v57.0.0/ before writing any Expo / React Native code (AGENTS.md).
3. Do not touch `package.json`, `app.json`, `babel.config.js` or `eas.json` unless the owner asks.
4. Never put Supabase keys, service-role keys or SMTP passwords in any file.
5. Never invent schema. Use only tables, columns and enums that exist in `supabase/*.sql` (section 4).
6. Do NOT run anything against a live database. Only write SQL files; the owner runs them on a test copy first.
7. When this file or README.md disagree with the code or `supabase/*.sql`, trust the code and the SQL.
8. Do not commit or push unless the owner says so.

---

## 1. What this project is
A production-intent campus placement app (MSc IT project, LJ University) that replaces emails, WhatsApp
groups and Google Forms. Three roles share one login and see different route groups:

| Role | Purpose |
|---|---|
| **Student** | Profile + resume PDF, eligible drives, register / withdraw, track status, interviews, offer accept / decline |
| **Company** | Register, wait for admin approval, post drives with rounds, shortlist / reject, schedule interviews, mark round results |
| **Admin** (placement cell) | Approve / reject companies, moderate drives, students & companies directories, debar / remove, support tickets, analytics, broadcast. Admins are made by hand in SQL, never via signup |

## 2. Tech stack
- Expo **SDK 57**, React Native 0.86, React 19.2, TypeScript, **Expo Router** (router root `src/app`).
  Expo Router no longer allows importing `@react-navigation/*` in app code; use `expo-router` entry points.
- Supabase: Postgres, Auth (email + Google), Storage, RLS, Realtime, pg_cron. Client imported as `@/lib/supabase`.
- Zustand (`src/store`), react-hook-form + zod (`@hookform/resolvers` is NOT installed; custom resolver),
  React Native Paper, Reanimated + Moti, react-native-chart-kit.
- **Design tokens: `@/theme/design` only** (`C` colours, `R` radii, `S` spacing, `T` type, `TOUCH`, `shadow()`,
  `paperTheme`). Shared primitives in `src/components/ui/kit.tsx`. Never hardcode colours; add a token instead.
- Run target is web: `npx expo start --web` (`-c` clears cache). Production: `npx expo export -p web` → `dist/`,
  deployed on Vercel (`vercel.json`). Native testing needs a development build (Expo Go doesn't support SDK 57).
- Web-only APIs (mouse events, `motion`) must sit behind `Platform.OS === 'web'` and never carry core behaviour.

## 3. Design system
White canvas, charcoal text (`C.ink`), muted secondary (`C.muted`), hairline borders (`C.line`), blue accent
(`C.accent`), deep blue `C.navy`. Status tones come from `statusToneFor()` in `kit.tsx`
(applied → warning, shortlisted / interview_scheduled → accent, round_cleared → teal, selected → success,
rejected → danger, withdrawn → muted, debarred → danger). Cards `R.card`, touch targets ≥ `TOUCH` (44).
Every screen has the top navbar and its role's tab bar; content is centred with a max width on web and grids
reflow with `useWindowDimensions` / `useBreakpoint`. The `(auth)` screens are the visual reference.

## 4. Database (source of truth: `supabase/*.sql`)
Enums: `user_role(student|company|admin)`, `job_status(open|closed)`,
`application_status(applied|shortlisted|interview_scheduled|round_cleared|selected|rejected)`,
`interview_mode(online|offline)`, `interview_result(pending|cleared|rejected)`.

```
users           id (FK auth.users), email, role user_role, created_at, consent_at
students        id (FK users), full_name, branch, cgpa, backlog_count, resume_url, skills text[], phone,
                debarred bool, debar_reason
companies       id (FK users), company_name, description, website, approved bool, logo_url,
                rejection_reason, debarred bool, debar_reason
job_postings    id, company_id, title, description, ctc, min_cgpa, eligible_branches text[], backlog_allowed,
                deadline (stored as UTC), status job_status, created_at, total_rounds, round_names text[],
                round_dates text[], job_profiles text[], stipend, bond_years, location
applications    id, student_id, job_id, status application_status, applied_at, current_round (default 1),
                offer_response (pending|accepted|declined), offer_reason, offer_responded_at
                UNIQUE (student_id, job_id)
interviews      id, application_id, round_number, date_time, mode, notes, result,
                status (scheduled|cancelled), reschedule_note
notifications   id, user_id, message, read, created_at
student_job_prefs           id, student_id, job_id, saved, hidden, updated_at   UNIQUE (student_id, job_id)
application_status_history  id, application_id, status, changed_at   (written by trigger only)
debar_history               id, user_id, role, action (debarred|undebarred), reason, acted_by, created_at
support_tickets             id, user_id, role, subject, message, status (open|resolved), admin_reply,
                            created_at, resolved_at
reminder_log                id, student_id, job_id, kind (24h|2h), sent_at   (internal, no policies)
views (security_invoker): admin_student_list, admin_company_list
```
Storage buckets: `resumes` (private, PDF, 5 MB, object `{uid}/resume.pdf`; `students.resume_url` stores
`resumes/{uid}/resume.pdf`, old http links still work) and `company-logos` (public, 2 MB).

SQL files, run in order: base schema → `policies-check-and-fix.sql` → `google-oauth.sql` → `10-admin-manage.sql`
→ `11-student-features-a.sql` → `12-student-features-b.sql` (needs pg_cron) → `16-master.sql`
→ `17-admin-users-read.sql` → `18-security-fixes.sql`. All idempotent; later files override earlier ones.

Helpers (SECURITY DEFINER, `search_path = public`): `get_my_role()`, `is_debarred()`, `admin_remove_user()`,
`send_deadline_reminders()` (pg_cron every 15 min; eligible students only, not registered or hidden), and from 18: `is_student_eligible(job)`,
`is_job_open_for_registration(job)`, `company_can_notify(user)`, `is_approved_company()`.
Triggers: `guard_offer_response`, `notify_offer_response`, `log_application_status`, `protect_application_identity`
(student_id / job_id never change), `stamp_applied_at` (applied_at = server time on insert), `protect_debarred`,
`log_debar_change`, `protect_company_review`, `prepare_support_ticket`, `stamp_consent`, `protect_consent`.

RLS rules (after 18): a student can only insert an `applied`, round-1 registration for an open drive before its
deadline that they are eligible for, and cannot change their own status (only answer an offer once).
Notifications: admin → anyone; company → only students who applied to its jobs; students never insert
(triggers do it for them). Job postings: only an approved, non-debarred company inserts its own; only the owner
(or admin) updates / deletes. Restrictive `*_guard` policies back these up.

Lessons: `ALTER TYPE ... ADD VALUE` must run in its own statement. After a migration, `notify pgrst, 'reload schema';`
(fixes `42703 column does not exist`). Never write a policy that selects from its own table; use a
security-definer helper. RLS failures often look like empty data or "0 rows" — the app shows `NO_ROWS_MESSAGE`.

## 5. Auth and routing
- Signup (student / company only) passes role + `terms_accepted` in auth metadata; the `handle_new_user` trigger
  creates the `users` / `students` / `companies` rows (`approved = false`). Google users pick a role on
  `(auth)/choose-role`, which inserts their own rows.
- Login reads `users.role` and routes to `/(student)/dashboard`, `/(company)/dashboard`, `/(admin)/dashboard`.
  `useRoleGuard` protects each group. Debarred users see the reason at sign-in.
- Forgot password: `resetPasswordForEmail` → `verify-otp` (`verifyOtp type 'recovery'`, accepts the real code
  length, Supabase has sent 8 digits) → `updateUser({ password })`. Template must use `{{ .Token }}`.
  SMTP is configured in the Supabase dashboard (credentials never in the repo).

## 6. Screens
- Public: `index` (landing + partner marquee), `help` (FAQ + support ticket), `legal` (Terms / Privacy), `(auth)/*`.
- Student: `dashboard`, `jobs` (eligibility-filtered feed, saved / hidden), `job/[id]` (full announcement, register,
  not interested), `applications` (filters, timeline, withdraw, offer accept / decline), `interviews`,
  `notifications`, `profile` (resume PDF upload, Download CV). `home` is a legacy screen.
- Company: `dashboard` (approval gate, rejection reason + resubmit), `my-jobs`, `post-job` (rounds builder,
  redirects to my-jobs after publish), `applicants/[jobId]`, `applicant/[id]` (resume, schedule / reschedule /
  cancel interview, round result), `notifications`, `profile` (logo). `home` is legacy.
- Admin: `dashboard`, `approvals`, `jobs`, `students`, `companies`, `queries` (support tickets), `broadcast`,
  `notifications`, `profile`.
- Lists refresh live through `useRealtimeRefresh` (tables in the `supabase_realtime` publication, see 16-master.sql).
- Landing marquee: approved companies from the DB + `constants/showcaseCompanies.ts` (empty on purpose; the owner
  adds real logos). No unverified numbers on the landing page.

## 7. Core flow
Company signs up → admin approves → company posts a drive with rounds → eligible student registers (`applied`)
→ company shortlists / rejects (notifies) → schedules an interview for `current_round` (status
`interview_scheduled`) → after the interview time, marks the round: rejected → `rejected`; cleared and not last →
`round_cleared`, `current_round + 1`; cleared on the last round → `selected` → student accepts / declines the offer
(company notified by trigger).

## 8. Conventions
- Every Supabase call handles errors with a visible message (`showAlert`). No silent failures
  (decorative fallbacks may `console.warn` in `__DEV__`).
- Loading, empty and error states on every list. Forms: react-hook-form + zod, inline errors, submit disabled in flight.
- Theme tokens only (`@/theme/design`). Small steps; verify with `npx tsc --noEmit`, `npx expo lint`,
  `npx expo export -p web`.
