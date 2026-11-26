# अध्याय · Adhyay Placement Portal

A campus placement platform that connects **students**, **companies** and the **placement cell (admin)** in one app. It replaces scattered emails, WhatsApp groups, Google Forms and spreadsheets with one system that has real, trackable workflows.

MSc IT project, LJ University.

**Live demo:** https://adhyayplacement.vercel.app

---

## Why Adhyay?

| Problem today | What Adhyay does |
|---|---|
| Eligibility checked by hand | Drives are filtered by CGPA, branch and backlogs, and the database refuses ineligible registrations |
| Miscommunication over email / WhatsApp | In-app notifications for every status change, plus deadline reminders |
| Applicants tracked in spreadsheets | Live application pipeline with rounds, interviews and offers |
| Placement stats compiled manually | Admin dashboard computes placement %, average CTC and branch-wise results |
| Unverified companies | Admin approval before a company can post drives |

---

## Features

### Student
- Sign up with email or Google (with Terms / Privacy consent), then complete a profile: branch, CGPA, backlogs, skills, phone
- **Resume as a PDF upload** (private storage, PDF only, up to 5 MB) and a one-page **Download CV** generated from the profile
- Job feed with only the drives the student is eligible for, search, deadline sorting and urgency colours
- Save drives or mark them "Not interested"; both sync across devices
- Full drive announcement (about, eligibility, job profiles, rounds and dates, CTC, stipend, bond, location)
- One-tap registration with duplicate prevention; **withdraw** while still "applied" and before the deadline
- Application tracker with status filters and a status timeline
- **Offer accept / decline** (once, with an optional reason) when selected; the company is notified
- Interview schedule ("Round X of N"), including reschedules and cancellations with the company's note
- **Deadline reminders** 24 hours and 2 hours before an eligible drive closes (skipped once registered or hidden)
- Notifications grouped by Today / Earlier, with mark-as-read

### Company
- Registration, then admin approval before posting; a rejected company sees the reason and can resubmit
- Company logo upload (shown in the student feed)
- Post drives with eligibility rules and a multi-round pipeline (round names and dates)
- Applicant list with shortlist / reject; the student is notified automatically
- Schedule, reschedule or cancel interviews per round, then mark each round Selected / Rejected
- Rounds advance automatically; the final round marks the student as selected

### Admin (placement cell)
- Approve or reject company registrations (with a reason)
- Moderate and close job postings
- Student and company directories with search, filters and paging
- **Debar** (with a reason, kept in a history) or **remove** a student or company
- **Support tickets**: users contact the placement cell from Help; admins reply and resolve
- Analytics: students, companies, placement %, average CTC, branch-wise chart
- Broadcast announcements to all students or one branch

### Platform
- Role-based routing and guards (student / company / admin)
- Row Level Security on every table; eligibility, approval and notification rules are enforced in the database, not only in the app
- **Realtime refresh**: dashboards, lists and notifications update by themselves when data changes (Supabase Realtime)
- Password reset with an email OTP
- Responsive layout for web and mobile; loading, error and empty states on every list
- Help / FAQ and Terms / Privacy pages

---

## Tech Stack

| Layer | Technology |
|---|---|
| App | React Native 0.86, React 19.2, **Expo SDK 57**, Expo Router, TypeScript |
| Backend | **Supabase**: Postgres, Auth, Storage, Row Level Security, Realtime, pg_cron |
| State | Zustand |
| Forms | react-hook-form + zod |
| UI | React Native Paper, Moti, Reanimated, react-native-chart-kit |
| Hosting | Vercel (static web export) |

---

## Project Structure

```
src/
  app/
    index.tsx     public landing page
    help.tsx      FAQ + contact the placement cell
    legal.tsx     Terms and Privacy
    (auth)/       login, signup, choose-role, forgot-password, verify-otp
    (student)/    dashboard, jobs, job/[id], applications, interviews, notifications, profile
    (company)/    dashboard, my-jobs, post-job, applicants/[jobId], applicant/[id], notifications, profile
    (admin)/      dashboard, approvals, jobs, students, companies, queries, broadcast, notifications, profile
  components/     shared UI (navbar, loaders, cards, tables, ui/kit)
  hooks/          role guard, load state, realtime refresh, pagination, safe navigation
  lib/            auth session, resume upload, CV export, formatting, interviews, alerts, Google auth
  store/          Zustand stores (auth, feed, alerts, loading)
  theme/          design tokens (design.ts)
supabase/         SQL files to run in the Supabase SQL Editor
web/              separate Vite prototype (not the deployed app)
```

---

## Database Overview

```
users                       id, email, role (student | company | admin), created_at, consent_at
students                    id, full_name, branch, cgpa, backlog_count, resume_url, skills[], phone,
                            debarred, debar_reason
companies                   id, company_name, description, website, approved, logo_url,
                            rejection_reason, debarred, debar_reason
job_postings                id, company_id, title, description, ctc, min_cgpa, eligible_branches[],
                            backlog_allowed, deadline, status (open | closed), created_at,
                            total_rounds, round_names[], round_dates[], job_profiles[],
                            stipend, bond_years, location
applications                id, student_id, job_id, status, applied_at, current_round,
                            offer_response (pending | accepted | declined), offer_reason, offer_responded_at
interviews                  id, application_id, round_number, date_time, mode, notes, result,
                            status (scheduled | cancelled), reschedule_note
notifications               id, user_id, message, read, created_at
student_job_prefs           student_id, job_id, saved, hidden
application_status_history  application_id, status, changed_at
debar_history               user_id, role, action, reason, acted_by, created_at
support_tickets             user_id, role, subject, message, status (open | resolved), admin_reply
reminder_log                student_id, job_id, kind (24h | 2h)
views: admin_student_list, admin_company_list
```

Application status flow: `applied` → `shortlisted` → `interview_scheduled` → `round_cleared` → … → `selected` (or `rejected` at any step).

---

## Getting Started

### Prerequisites
- Node.js 22.13 or newer (required by Expo SDK 57)
- A [Supabase](https://supabase.com) project

### 1. Install

```bash
git clone https://github.com/ChintanHirpara2707/adhyay_placement_portal.git
cd adhyay_placement_portal
npm install
```

### 2. Configure Supabase

Point the Supabase client at your project URL and **anon** key. Only the anon key belongs in the app. Never commit a service-role key, database password or SMTP password.

### 3. Set up the database

Open the Supabase **SQL Editor** and run, in this order:

1. Your base schema (tables and enums from the Database Overview, plus the `handle_new_user` signup trigger)
2. `supabase/policies-check-and-fix.sql` (core RLS policies, `get_my_role()`, unique registration)
3. `supabase/google-oauth.sql` (only if you use Google sign-in)
4. `supabase/10-admin-manage.sql` (debar / remove)
5. `supabase/11-student-features-a.sql` (saved / hidden drives, withdraw, status timeline)
6. `supabase/12-student-features-b.sql` (resume bucket, offer response, deadline reminders). Enable the **pg_cron** extension first (Database → Extensions).
7. `supabase/16-master.sql` (interview reschedule, company logos, debar history, rejection reason, admin views, support tickets, consent, realtime)
8. `supabase/17-admin-users-read.sql`
9. `supabase/18-security-fixes.sql` (stricter RLS for registrations, notifications and job postings). Test it on a copy of the database first; the file ends with verification queries and a test checklist.

Every file is idempotent. Run `notify pgrst, 'reload schema';` after any schema change.

### 4. Supabase Auth settings

In **Authentication → URL Configuration**, add your site and redirect URLs (for example `http://localhost:8081` and your Vercel URL). For development you can turn email confirmation off.

For the password-reset OTP, the *Reset Password* email template must use `{{ .Token }}`. The code length is whatever Supabase sends (it has been 8 digits).

### 5. Run

```bash
npx expo start --web      # web (recommended)
npx expo start -c --web   # clear the bundler cache
```

Native testing needs a development build, because Expo Go does not support SDK 57.

### 6. Create an admin

Admins are never created through public signup. Sign up a normal user, then in the SQL Editor:

```sql
update public.users set role = 'admin' where email = 'you@example.com';
```

---

## Web build and deployment (Vercel)

```bash
npx expo export -p web    # static build into dist/
```

`vercel.json` already uses that build command, serves `dist`, and rewrites every route to `/` for client-side routing. Push to GitHub, import the repo in Vercel and deploy.

---

## Typical Flow

1. A company signs up and the admin approves it.
2. The company posts a drive with eligibility rules and rounds.
3. Eligible students see the drive and register (or save it and get reminded before the deadline).
4. The company shortlists applicants and schedules interviews.
5. After each interview, the company marks Selected or Rejected. Rounds advance automatically.
6. A selected student accepts or declines the offer, and the admin dashboard updates.

---

## Roadmap

- Push and email notifications (in-app notifications today)
- Extended student profile (10th / 12th / bachelor percentages, enrollment number)
- Placement policy engine (one-offer rule, dream tiers)
- Placement report export (PDF / Excel)
- Bulk shortlist and CSV export for companies
- Student data verification and bulk CSV import
- Calendar sync for interviews and deadlines
- Job match scores

---

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run web` | Start for web |
| `npm run android` / `npm run ios` | Build and run a native development build |
| `npm run lint` | Lint the project (`expo lint`) |
| `npx expo export -p web` | Production web build |

---

## License

See [LICENSE](./LICENSE).
