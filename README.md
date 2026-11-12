# अध्याय · Adhyay Placement Portal

A centralized, automated campus placement platform that connects **students**, **companies** and the **placement cell (admin)** in one app. It replaces scattered emails, WhatsApp groups, Google Forms and spreadsheets with a single system that has real, trackable workflows.

**Live demo:** https://adhyayplacement.vercel.app

---

## Why Adhyay?

| Problem today | What Adhyay does |
|---|---|
| Eligibility checked by hand | Drives are filtered automatically by CGPA, branch and backlogs |
| Miscommunication over email / WhatsApp | In-app notifications for every status change |
| Applicants tracked in spreadsheets | Live application pipeline with rounds and interviews |
| Placement stats compiled manually | Admin dashboard computes placement %, average CTC and branch-wise results |
| Unverified companies | Admin approval gate before a company can post drives |

---

## Features

### Student
- Sign up with email or Google, then complete a profile (branch, CGPA, backlogs, skills, resume link)
- Job feed showing only drives the student is eligible for, with search and deadline urgency
- Full drive announcement view (about, eligibility, rounds, dates, CTC, stipend, bond, location)
- One-tap registration with duplicate prevention
- Application tracker with status filters
- Interview schedule showing "Round X of N"
- Notifications grouped by Today / Earlier, with mark-as-read

### Company
- Registration followed by admin approval before posting
- Post drives with eligibility rules and a multi-round hiring pipeline
- Applicant list with shortlist / reject actions (students are notified automatically)
- Schedule interviews per round, then mark each round Selected / Rejected
- Rounds advance automatically; the final round marks the student as placed

### Admin (Placement Cell)
- Approve or reject company registrations
- Moderate and close job postings
- Searchable student directory
- Analytics: total students and companies, placement %, average CTC, branch-wise chart
- Broadcast announcements to all students or a branch

### Platform
- Role-based routing and guards (student / company / admin)
- Password reset with email OTP
- Responsive layout for web and mobile
- Loading skeletons, error states and empty states on every list

---

## Tech Stack

| Layer | Technology |
|---|---|
| App | React Native, **Expo SDK 57**, Expo Router (file-based routing), TypeScript |
| Backend | **Supabase**: Postgres, Auth, Row Level Security |
| State | Zustand |
| Forms | react-hook-form + zod |
| UI | React Native Paper, Moti, Reanimated, react-native-chart-kit |
| Hosting | Vercel (static web export) |

---

## Project Structure

```
src/
  app/
    (auth)/       login, signup, choose-role, forgot-password, verify-otp
    (student)/    dashboard, jobs, job/[id], applications, interviews, notifications, profile
    (company)/    dashboard, my-jobs, post-job, applicants/[jobId], applicant/[id], notifications, profile
    (admin)/      dashboard, approvals, jobs, students, broadcast, notifications, profile
  components/     shared UI (navbar, loaders, cards, tables)
  hooks/          role guard, load state, safe navigation
  lib/            auth session, formatting, interviews, alerts, Google auth
  store/          Zustand stores (auth, feed, alerts, loading)
  theme/          design tokens
supabase/         SQL files to run in the Supabase SQL Editor
web/              separate Vite prototype (not the deployed app)
```

---

## Database Overview

```
users          id, email, role (student | company | admin)
students       id, full_name, branch, cgpa, backlog_count, resume_url, skills[], phone
companies      id, company_name, description, website, approved
job_postings   id, company_id, title, description, ctc, min_cgpa, eligible_branches[],
               backlog_allowed, deadline, status, total_rounds, round_names[],
               round_dates[], job_profiles[], stipend, bond_years, location
applications   id, student_id, job_id, status, applied_at, current_round
interviews     id, application_id, round_number, date_time, mode, notes, result
notifications  id, user_id, message, read, created_at
```

Application status flow: `applied` → `shortlisted` → `interview_scheduled` → `round_cleared` → … → `selected` (or `rejected` at any step).

Row Level Security is enabled on every table: students see their own data, companies see applicants of their own jobs, and admins see everything.

---

## Getting Started

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project

### 1. Install

```bash
git clone https://github.com/ChintanHirpara2707/adhyay_placement_portal.git
cd adhyay_placement_portal
npm install
```

### 2. Configure Supabase

Add your project URL and anon key to the Supabase client configuration. Never commit service-role keys or SMTP passwords.

### 3. Set up the database

Open the Supabase **SQL Editor** and run, in order:

1. Your base schema (tables and enums from the Database Overview)
2. `supabase/policies-check-and-fix.sql` (RLS policies, `get_my_role()` helper, unique application constraint)
3. `supabase/google-oauth.sql` (only if you use Google sign-in)

Run `notify pgrst, 'reload schema';` after any schema change.

### 4. Supabase Auth settings

In **Authentication → URL Configuration**, add your site and redirect URLs (for example `http://localhost:8081` and your Vercel URL). During development, turn **email confirmation off**.

For password-reset OTP, the *Reset Password* email template must use `{{ .Token }}`.

### 5. Run

```bash
npx expo start --web      # web (recommended)
npx expo start -c --web   # clear cache
```

Mobile testing needs a development build, because Expo Go does not support SDK 57.

### 6. Create an admin

Admins are never created from public signup. Sign up a normal user, then in the SQL Editor:

```sql
update public.users set role = 'admin' where email = 'you@example.com';
```

---

## Deployment (Vercel)

`vercel.json` is already configured:

- Build command: `npx expo export -p web`
- Output directory: `dist`
- All routes rewrite to `/` for client-side routing

Push to GitHub, import the repo in Vercel, and deploy.

---

## Typical Flow

1. A company signs up and the admin approves it.
2. The company posts a drive with eligibility rules and rounds.
3. Eligible students see the drive and register.
4. The company shortlists applicants and schedules interviews.
5. After each interview, the company marks Selected or Rejected. Rounds advance automatically.
6. The final round marks the student as placed, and the admin dashboard updates.

---

## Roadmap

- Real-time updates with Supabase Realtime
- Push and email notifications
- PDF resume upload with Supabase Storage
- Extended student profile (10th / 12th / bachelor percentages, enrollment number)
- Placement policy engine (one-offer rule, dream tiers)
- Placement report export (PDF / Excel)
- Bulk shortlist and CSV export for companies
- Student data verification and bulk CSV import
- Calendar sync for interviews and deadlines
- Targeted broadcasts and job match scores

---

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run web` | Start for web |
| `npm run android` / `npm run ios` | Start for a native target |
| `npm run lint` | Lint the project |

---

## License

See [LICENSE](./LICENSE).
