# Premium Outlets HRIS — Supabase Migrations Guide

**Powered by Nexvision Innovations Inc.**

This document is the **single source of truth** for setting up the Supabase database for Premium Outlets HRIS.
All SQL files live under [`supabase/migrations/`](supabase/migrations/) and are intended to be applied **in order** the first time the database is provisioned.

---

## 1. Quick Setup — Fresh Supabase Project

1. Create a new Supabase project (region: **Southeast Asia (Singapore)**).
2. Open the **SQL Editor** in the Supabase dashboard.
3. For each file in `supabase/migrations/`, in **lexical order** (001 → 061):
   - Open the file in your editor.
   - Copy its contents.
   - Paste into a new SQL editor query.
   - Run.
   - Verify there are no errors before moving to the next file.

> Tip: The Supabase dashboard lets you keep multiple SQL snippets. Save each migration as a named snippet (e.g. `001_auth_profiles`) so you can re-run them on staging/preview without re-pasting.

After all 61 files are applied, your schema, indexes, RLS policies, and seed data will be ready.

---

## 2. Migration Manifest (apply in this order)

| #   | File                                                         | Purpose                                                            |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| 001 | `001_auth_profiles.sql`                                      | Auth → profiles linkage                                            |
| 002 | `002_employees.sql`                                          | Core `employees` table                                             |
| 003 | `003_roles_permissions.sql`                                  | Roles + permission matrix                                          |
| 004 | `004_attendance.sql`                                         | Attendance logs, shifts, exceptions                                |
| 005 | `005_leave.sql`                                              | Leave types, requests, balances                                    |
| 006 | `006_payroll.sql`                                            | Payroll runs, payslips, deductions                                 |
| 007 | `007_loans.sql`                                              | Loan ledger + amortization                                         |
| 008 | `008_tasks_messaging.sql`                                    | Tasks + in-app messaging                                           |
| 009 | `009_audit_notifications.sql`                                | Audit log + notifications backbone                                 |
| 010 | `010_projects_timesheets_settings.sql`                       | Projects, timesheet entries, app settings                          |
| 011 | `011_rls_policies.sql`                                       | **Row-Level Security** policies for all tables                     |
| 012 | `012_seed_data.sql`                                          | Initial seed data (leave types, government rates, etc.)            |
| 013 | `013_fix_holidays_type_check.sql`                            | Holiday `type` enum check fix                                      |
| 014 | `014_add_missing_fk_constraints.sql`                         | Foreign-key integrity                                              |
| 015 | `015_add_indexes_and_checks.sql`                             | Performance indexes + check constraints                            |
| 016 | `016_fix_loans_timestamp.sql`                                | Timestamp default fix on loans                                     |
| 017 | `017_align_employee_roles.sql`                               | Role string normalization                                          |
| 018 | `018_seed_profile_flags.sql`                                 | Profile completeness flags                                         |
| 019 | `019_extend_event_types.sql`                                 | Calendar event type expansion                                      |
| 020 | `020_enable_realtime.sql`                                    | Enables Supabase Realtime on key tables                            |
| 021 | `021_expand_event_types.sql`                                 | Further event type expansion                                       |
| 022 | `022_kiosk_face_recognition_enhancement.sql`                 | Kiosk + face recognition columns                                   |
| 023 | `023_face_embedding_support.sql`                             | `face_embeddings` table                                            |
| 024 | `024_finance_rls_fixes.sql`                                  | Finance-role RLS adjustments                                       |
| 025 | `025_employee_attendance_log_write.sql`                      | Employee write policy on attendance logs                           |
| 026 | `026_face_reference_images.sql`                              | Stored face reference images                                       |
| 027 | `027_project_constraints.sql`                                | Project name + date constraints                                    |
| 028 | `028_payroll_run_payslips_junction.sql`                      | `payroll_run_payslips` mapping table                               |
| 029 | `029_project_assignments_junction.sql`                       | `project_assignments` mapping table                                |
| 030 | `030_employees_add_contact_fields.sql`                       | Address, emergency contact fields                                  |
| 031 | `031_tasks_project_id.sql`                                   | Tasks → projects FK                                                |
| 032 | `032_task_tags.sql`                                          | Task tagging                                                       |
| 033 | `033_fix_location_pings_rls.sql`                             | Location pings RLS                                                 |
| 034 | `034_job_titles.sql`                                         | Job titles catalogue                                               |
| 035 | `035_departments.sql`                                        | Departments catalogue                                              |
| 036 | `036_deduction_overrides.sql`                                | Per-employee deduction overrides                                   |
| 037 | `037_fix_deduction_rls.sql`                                  | Deduction RLS fix                                                  |
| 038 | `038_payroll_signature_config.sql`                           | Payslip signature config                                           |
| 039 | `039_fix_payroll_fk_cascade.sql`                             | Payroll FK cascade fix                                             |
| 040 | `040_realtime_missing_tables_disable_rls.sql`                | Realtime / RLS adjustments                                         |
| 041 | `041_face_recognition_test_account.sql`                      | Seed face-recognition test account                                 |
| 042 | `042_employees_add_job_title.sql`                            | Add `job_title` column                                             |
| 043 | `043_leave_requests_add_duration.sql`                        | Half-day / hourly leave support                                    |
| 044 | `044_notification_logs_add_read.sql`                         | `read_at` on notification logs                                     |
| 045 | `045_payroll_simplification.sql`                             | Payroll schema simplification                                      |
| 046 | `046_text_channels_realtime.sql`                             | Realtime for messaging channels                                    |
| 047 | `047_push_subscriptions.sql`                                 | Web Push subscriptions                                             |
| 048 | `048_payroll_payment_proof.sql`                              | Payment proof upload column                                        |
| 049 | `049_employees_notification_preferences.sql`                 | Per-employee notification prefs                                    |
| 050 | `050_avatars_storage_bucket.sql`                             | Avatars bucket + policies                                          |
| 051 | `051_kiosk_config.sql`                                       | Kiosk runtime config                                               |
| 052 | `052_notification_provider_config.sql`                       | Notification provider config                                       |
| 053 | `053_employees_biometric_id.sql`                             | Hardware biometric ID column                                       |
| 054 | `054_payslip_payment_hold.sql`                               | `payment_hold` payslip status                                      |
| 055 | `055_client_feature_pack.sql`                                | Per-tenant feature flags                                           |
| 056 | `056_bir_compliance_foundation.sql`                          | BIR compliance scaffolding                                         |
| 057 | `057_employee_201_files_disciplinary.sql`                    | 201 files + disciplinary records                                   |
| 058 | `058_jobs.sql`                                               | Jobs / postings                                                    |
| 059 | `059_fix_account_role_sync.sql`                              | Auth ↔ role sync trigger fix                                       |
| 060 | `060_tasks_schema_updates.sql`                               | Task schema updates                                                |
| 061 | `061_appearance_module_flags.sql`                            | Appearance customization + module toggles                          |

> When new migrations are added later, **append** them to this list — never re-order or rename existing ones.

---

## 3. Required Storage Buckets

Create the following buckets in **Supabase → Storage**. Migration 050 creates `avatars`; create the others manually unless a future migration handles them:

| Bucket      | Public? | Notes                                                       |
| ----------- | ------- | ----------------------------------------------------------- |
| `avatars`   | Yes     | Employee profile photos (created by migration 050).         |
| `documents` | No      | 201 files, contracts, etc. Signed URLs only.                |
| `payslips`  | No      | Generated payslip PDFs. Signed URLs only.                   |
| `faces`     | No      | Reference face images for kiosk recognition.                |

---

## 4. Auth Configuration

In **Supabase → Authentication → Providers**:
1. Enable **Email** provider.
2. Disable **Confirm email** during initial setup (re-enable later).
3. Set **Site URL** = your production URL (e.g. `https://hris.premiumoutlets.ph`).
4. Add redirect URLs for any preview deployments.

In **Authentication → Email Templates**: customize the templates with Premium Outlets branding (white/black/gold).

---

## 5. Realtime

Migrations 020, 040, and 046 enable Realtime on the following tables — verify in **Database → Replication**:

- `notifications`, `messages`, `attendance_logs`, `payroll_runs`, `tasks`, `task_comments`

If any are missing, toggle them on manually.

---

## 6. Seeding & First Login

After all migrations run:

1. Migration 012 inserts default leave types, government contribution tables, and roles.
2. Create your first admin user:
   - In Supabase **Authentication → Users → Add user** (email + password).
   - In **SQL Editor**:
     ```sql
     -- Promote that user to admin
     update public.employees
       set role = 'admin', status = 'active'
       where email = 'admin@premiumoutlets.ph';
     ```
3. Log in at `/login` with that user.

For deeper seeding (test employees, sample payroll), see the scripts in [`scripts/`](scripts/):
- `seed-supabase-users.ts` — bulk-create employees from a CSV.
- `seed-payroll-test-data.ts` — sample payroll runs for QA.
- `seed-face-account.ts` — kiosk face-recognition test account.

Run them with `npx tsx scripts/<file>.ts` after setting `.env.local`.

---

## 7. Verifying the Setup

After applying all migrations, run these sanity checks in the SQL editor:

```sql
-- Count migration objects
select 'tables', count(*) from information_schema.tables where table_schema = 'public'
union all
select 'rls', count(*) from pg_policies where schemaname = 'public'
union all
select 'indexes', count(*) from pg_indexes where schemaname = 'public';

-- Confirm employees + auth.users linkage works
select id, email, role from public.employees limit 5;
```

Expected: ~50+ public tables, 100+ RLS policies, many indexes, and a populated `employees` table for any seeded users.

---

## 8. Rollback / Re-provisioning

The migrations are **forward-only**. If you need to start over:

1. Spin up a fresh Supabase project.
2. Re-apply migrations 001 → latest in order.
3. Update `.env.local` / Vercel envs with the new project's keys.

**Never drop tables in production.** Always use a new Supabase project for re-provisioning.

---

© Nexvision Innovations Inc.
