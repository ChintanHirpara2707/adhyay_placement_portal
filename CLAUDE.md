@AGENTS.md
# Adhyay Placement Portal — Full Project Handoff

Put this file in the project root as `CLAUDE.md` so Claude Code reads it automatically at the start of every session.

First instruction for Claude Code: **verify this document against the actual code before trusting it.** Sections marked "reported" or "unverified" were written from chat history, not from reading the repo. Scan the project, compare, and report differences before changing anything.

---

## 1. What this project is

"Adhyay Placement Portal" (earlier working names: Placement Portal, PlacementPortal, CareerGhar) is a real, production-intent cross-platform app that replaces manual campus recruitment (emails, WhatsApp groups, notice boards, Google Forms) with one digital platform. Reference product: Superset (joinsuperset.com).

It is a Master's-level college project (about 1 month, started around late Aug 2026) but the goal is a launchable app, not a demo. Do not build throwaway/demo-only code.

Three roles share one login system and see different screens:

| Role | Purpose |
|---|---|
| **Student** | Create profile, browse eligible drives, register/apply, track status, see interviews and notifications |
| **Company** | Register, wait for admin approval, post drives with eligibility and rounds, shortlist/reject, schedule interviews, mark round results |
| **Admin** (placement cell) | Approve companies, moderate postings, view students, analytics, broadcast notifications. Admin accounts are created manually in Supabase, never via public signup |

---

## 2. Tech stack

- React Native + Expo **SDK 57**, TypeScript, **Expo Router** (file-based). Source lives in `src/app/` (router root is `src/app`).
- Supabase: Postgres, Auth, Storage, RLS. Client in `src/lib/supabase.ts` (imported as `@/lib/supabase`).
- Zustand (`@/store/authStore`), react-hook-form + zod (custom zod resolver, `@hookform/resolvers` is NOT installed), React Native Paper, react-native-reanimated + moti, react-native-chart-kit, expo-notifications.
- Theme: central `@/theme/theme` exporting `Theme.colors`, `Theme.spacing`, `Theme.borderRadius`. Never hardcode colors.
- Shared components seen so far: `AppTopNavbar`, `JobCardSkeleton` (`@/components/SkeletonLoader`), `AnimatedPressable`, `WebOnlyDecorations`, `StatusPill`, `StatCard`, `ActivityFeedItem`.

**Run target: web.** Expo Go only supports older SDKs than 57, so development and testing use `npx expo start --web` (use `-c` to clear cache). Mobile testing needs a development build. Web-only libraries (`motion`, ReactBits patterns) must be wrapped in `Platform.OS === 'web'` and never used for core behavior.

---

## 3. Design system

- Minimalist white theme. Background `#FFFFFF` / `#F9FAFB`, text `#111827`, secondary text `#6B7280`, borders `#E5E7EB`.
- Primary accent deep blue `#1E3A8A`; success `#10B981`; warning `#F59E0B`; error `#EF4444`.
- Status pills: applied (gray), shortlisted (light blue), interview_scheduled (amber), round_cleared (teal), selected (green), rejected (red).
- Cards: 12px radius, very subtle shadow. Buttons: primary solid blue, secondary outline.
- The `src/app/(auth)/` screens (`index.tsx`, `login.tsx`, `signup.tsx`, `forgot-password.tsx`, `verify-otp.tsx`) are the **visual reference** for the whole app.
- Every screen needs a top navbar and the role's bottom tab bar. No bare unstyled lists.
- Must be responsive: on web constrain content to a centered max-width (about 600px forms, 900–1000px dashboards), reflow card grids by `useWindowDimensions`.

---

## 4. Database schema (Supabase Postgres)

Exact names. Never invent tables, columns or enum values.

```
users          id uuid PK (FK auth.users), email, role user_role(student|company|admin), created_at
students       id uuid PK (FK users), full_name, branch, cgpa numeric, backlog_count int default 0,
               resume_url text, skills text[], phone
companies      id uuid PK (FK users), company_name, description, website, approved bool default false
job_postings   id uuid PK, company_id FK companies, title, description, ctc numeric, min_cgpa numeric,
               eligible_branches text[], backlog_allowed bool, deadline timestamp,
               status job_status(open|closed), created_at,
               total_rounds int default 1, round_names text[] default '{}'          -- rounds migration (confirmed applied)
               job_profiles text[], stipend numeric, bond_years numeric,
               location text, round_dates text[]                                   -- announcement migration (UNVERIFIED, check)
applications   id uuid PK, student_id FK students, job_id FK job_postings,
               status application_status(applied|shortlisted|interview_scheduled|selected|rejected|round_cleared),
               applied_at, current_round int default 1
interviews     id uuid PK, application_id FK applications, round_number int, date_time timestamp,
               mode interview_mode(online|offline), notes text,
               result interview_result(pending|cleared|rejected) default 'pending'
notifications  id uuid PK, user_id FK users, message, read bool default false, created_at
```

Migration history and lessons:
- The rounds migration originally failed because `ALTER TYPE ... ADD VALUE` cannot be used in the same transaction as other DDL, and the SQL Editor rolled everything back. Run enum additions as their own statement, then the column additions separately, then `NOTIFY pgrst, 'reload schema';`.
- The announcement-fields migration (`job_profiles`, `stipend`, `bond_years`, `location`, `round_dates`) was given to the user but **it is not confirmed that it was run.** Check `information_schema.columns` before relying on those fields.
- If the API returns `42703 column does not exist` after a migration, reload the PostgREST schema cache.
- `ctc` unit is not standardized (lakhs vs rupees). Check the stored values and add one `formatCTC()` helper.

### RLS (Row Level Security)

Enabled on all tables. Intent: students see only their own data; companies see applicants for their own jobs; admins see everything.
- A policy that selects from its own table inside USING/WITH CHECK (e.g. admin check on `users`) causes recursion. Replace with a `security definer` function such as `get_my_role()`.
- **Known incident:** inserting into `interviews` failed with "new row violates row-level security policy". Fix is an INSERT policy for authenticated companies where the application's job belongs to `auth.uid()`. Confirm it exists in `pg_policies`.
- `notifications` INSERT must allow companies and admins to insert rows for other users (shortlist, interview, result, broadcast). Verify this policy too.
- `applications` UPDATE must allow the owning company; `companies` UPDATE must allow admin approval.
- Test every role's flow after any policy change. RLS failures often look like empty data or a button doing nothing.

---

## 5. Authentication and routing

- Signup (`src/app/(auth)/signup.tsx`): role toggle Student/Company only. Calls `supabase.auth.signUp`, then inserts into `users` (id, email, role) and the matching `students` or `companies` row (`approved=false`). Note: the screen still shows the brand text "Placement Porter" (typo). Should read "Adhyay Placement Portal".
- Login: signs in, fetches `role` from `users`, redirects by exact role string to `/(student)/dashboard`, `/(company)/dashboard`, `/(admin)/dashboard`.
- Role guard hook on all three route groups so a company can never view student screens. Reported complete.
- Earlier bug: company signup landing on student screens. Reported fixed with role fetch, "self-repair" and exact redirect. Re-verify.
- Session timing: never insert into the DB right after `signUp()` unless a session exists. Email confirmation should be OFF for development, otherwise the `users` insert fails RLS with a 403.
- Forgot password: `forgot-password.tsx` calls `resetPasswordForEmail(email)`, then `verify-otp.tsx` calls `verifyOtp({email, token, type:'recovery'})` then `updateUser({password})`. Add a 60s resend cooldown.
  - Supabase has been sending **8-digit codes** in testing, not 6. Validation must accept the real length.
  - The email template (Dashboard → Authentication → Email Templates → Reset Password) must use `{{ .Token }}`, not `{{ .ConfirmationURL }}`. A branded HTML template was written (deep-blue code box).
  - Email sending: Resend was tried and failed (cannot send from gmail.com; its test sender only delivers to the account owner). Switched to **custom SMTP with Gmail** (`smtp.gmail.com`, port 587, username = Gmail, password = a Google App Password). Never commit those credentials. Supabase shows a "personal email provider" warning, which is safe to ignore. If it misbehaves, check Supabase Auth Logs. The default Supabase sender is limited to about 30 emails/hour.
  - Reported bug: Send OTP / Reset Password buttons intermittently unresponsive (suspected zod length mismatch, missing `handleSubmit`, silent validation, rate limit). A fix prompt was issued. Status unverified.

---

## 6. Screens and what each should do

### Student (`src/app/(student)/`)
- `dashboard` — greeting, profile-completion bar, stat cards (applications, upcoming interviews, selected), top recommended jobs, recent activity from notifications. This is the landing screen after login.
- `jobs` — eligibility-filtered feed (CGPA >= min_cgpa, branch in eligible_branches, backlog rule), search, "Applied" badge, sort by deadline, urgency colour when deadline is under 2 days, company name via join `select('*, companies(company_name)')`. The existing implementation lives in the old `home.tsx`: it loads the student's `cgpa, branch, backlog_count`, shows a "profile incomplete" banner if CGPA or branch is missing, fetches `status='open'` postings, filters client-side, uses Moti staggered entrances and `JobCardSkeleton` loading.
- `job/[id]` — apply with duplicate prevention and deadline-passed state. **Planned redesign** as a full announcement (see section 8).
- `applications` — status filter tabs, status pills.
- `interviews` — upcoming/past toggle, "Round X of N: round name".
- `notifications` — Today/Earlier groups, mark read / mark all read.
- `profile` — name, branch dropdown, CGPA, phone, skill chips, **resume as a pasted link** (file upload was abandoned: Storage bucket/RLS issues). Field is an optional URL. Helper text tells students to share the Drive link as "Anyone with the link can view".

### Company (`src/app/(company)/`)
- `dashboard` — approval gate (pending-approval message until admin approves), stats, activity.
- `my-jobs` — list, open/closed toggle, applicant counts.
- `post-job` — title, description, CTC, min CGPA, branch chips, backlog switch, deadline, rounds builder (count plus a name and date per round), planned extras (profiles, stipend, bond, location).
- `applicants/[jobId]` — status tabs, shortlist/reject with notification to the student.
- `applicant/[id]` — student detail, resume link, schedule interview, mark round result.
- `profile`, plus `notifications` (see bugs).

### Admin (`src/app/(admin)/`)
- `dashboard` (stats, branch-wise chart, placement %, average CTC, pending badge), `approvals`, `jobs` (moderation, close postings), `students` (searchable), `broadcast`, `profile`, plus `notifications` (see bugs).

### Shared
- Top navbar: logo, notification bell with unread badge, profile avatar menu with logout. Bell must route by role.
- Public: native splash screen (deep blue), landing page with marquee, then login/signup. See section 8.

---

## 7. Core business flow

1. Company signs up, admin approves, company posts a drive (with rounds).
2. Student sees only eligible drives, registers (inserts application, status `applied`).
3. Company shortlists (status `shortlisted`, notification) or rejects.
4. Company schedules an interview for the application's current round. Form should pull the round name and date from `job_postings.round_names/round_dates` at index `current_round`. Writes an `interviews` row, sets status `interview_scheduled`, notifies the student.
5. **After the interview time passes** and `interviews.result` is still `pending`, the company sees "Mark Round Result" with **Selected / Rejected**.
   - Rejected: result `rejected`, application `rejected`, notify student.
   - Selected and not last round: result `cleared`, `current_round += 1`, status `round_cleared`, notify, offer "Schedule Next Round".
   - Selected and last round (`current_round == total_rounds`): status `selected`, notify "you have been placed".
6. Admin dashboard aggregates placement stats. For testing, schedule interviews with a past date/time so the result buttons appear.

---

## 8. Feature status

**Reported complete (by the previous OpenCode agent; verify):** auth, role guard, all three dashboards, student pages, company pages, admin pages, post-job form, apply flow, shortlist/reject plus notifications, analytics, broadcast, resume-link profile.

**Prompts issued, status unknown (verify each in the code):**
- Multi-round post-job form and round-result flow (Feature 1 was written, Feature 2 was held pending migration, which has since been applied).
- Full announcement view on job detail: sections CAMPUS PLACEMENT DRIVE, ABOUT, ELIGIBILITY (shows "No Criteria" if empty), JOB PROFILES, DRIVE DETAILS (round, date), REGISTRATION REQUIREMENTS (deadline), LOGISTICS & CONDUCT (roles with CTC, stipend, bond, location), and Register / Not Interested buttons. "Not Interested" is a local dismissal, not stored in the DB. CTC is a single value per posting, so it is shown for all roles.
- Splash screen, landing page, partner marquee. Marquee merges approved companies from the DB (text chips) with showcase logos from `assets/images/partner-logos/` listed in `constants/showcaseCompanies.ts` (kept empty by default so a missing image can't crash the app; example entries are commented out). Fallback text "New companies joining soon".
- Forgot-password flow and its button fixes.
- Student home improvements: CTC formatting, applied badge, deadline sorting, result count, web max-width.
- Responsive redesign of every page to match the auth screens, delivered in batches (Student, then Company, then Admin).

**Open bugs to fix:**
1. Post Job: after "Publish Job Posting" the page does not redirect, so users double-click and create duplicate jobs. Fix: `router.replace('/(company)/my-jobs')`, disable the button while submitting, `isSubmitting` guard, only one row created.
2. Notification bell in the company and admin navbars redirects to login. Probably the routes do not exist under those groups or the bell is hardcoded to the student route. Create the screens and route by role.
3. Schedule Interview form is not driven by the posted rounds (round name, suggested date).
4. Interview insert RLS (see section 4), if not already fixed.
5. Tab icons rendered as empty boxes on web (icon font not loading). Reported earlier; confirm it is fixed.
6. No logout in the original build. Reported fixed.

---

## 9. Conventions and rules for Claude Code

- Do not change `package.json`, `app.json` or `babel.config.js` unless asked. Reanimated plugin must be last in babel plugins.
- Never invent schema. If a field is missing, ask.
- Every Supabase call needs error handling with a visible message (Alert/toast). No silent failures.
- Loading and empty states on every list.
- Forms: react-hook-form + zod, inline errors, disable submit while in flight.
- Prevent duplicate applications (guard in code, ideally a unique constraint on student_id + job_id).
- Theme tokens only.
- Work in small steps and test after each. Fix and verify one issue at a time.
- Do not put Supabase keys or SMTP passwords in committed files.

---

## 10. Suggested first session

1. Scan the repo and report what exists versus sections 6 and 8.
2. Run the app on web and list crashes.
3. Verify the DB against section 4 (columns, enums, RLS policies in `pg_policies`).
4. Fix the open bugs in section 8, one at a time.
5. Finish the unverified features, then the responsive redesign in batches.

---

## 11. Documentation (separate from code)

Already drafted in chat for the college report: introduction, existing system, objectives, scope, requirement determination, data dictionary, user stories, sprint backlog, test plan, enhancements, conclusion, bibliography. UML prompts were written for Eraser.io (sequence, activity, class) and GitMind (use case). Resume line drafted: "Placement Portal | 2026 — React Native, Expo, TypeScript, Supabase, PostgreSQL, RLS". Not covered yet: deployment/hosting, final demo video, push notifications on web (limited; in-app notifications are the fallback).
