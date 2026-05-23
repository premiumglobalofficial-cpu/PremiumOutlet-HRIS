# Supabase Migrations — v2 (Consolidated)

**Clean, optimized, copy-paste-ready migrations for Premium Outlets HRIS.**

This folder is a domain-grouped consolidation of the legacy `supabase/migrations/` folder (61 incremental files → **17 logical files**). The SQL bodies are preserved **verbatim** — there is no behavioral drift from the original migration chain. The only differences are:

- Files are grouped by domain instead of chronological patches
- Each consolidated file documents which legacy migrations it absorbed
- Numeric prefixes (`01_`, `02_`, …) define the strict apply order

---

## 🚀 How to use (fresh Supabase project)

In the Supabase SQL Editor, open each file in **alphabetical / numeric order** and click **Run**:

```
01_auth_and_profiles.sql
02_employees_core.sql
03_roles_and_permissions.sql
04_attendance_and_kiosk.sql
05_leave.sql
06_payroll.sql
07_loans.sql
08_tasks_projects_messaging.sql
09_notifications_and_audit.sql
10_government_compliance.sql
11_storage_buckets.sql
12_client_feature_pack.sql
13_appearance_and_flags.sql
14_constraints_and_indexes.sql
15_rls_policies.sql
16_realtime.sql
99_seed_data_optional.sql   ← optional, demo data only
```

Order matters: later files reference tables/columns created by earlier ones.

---

## 📦 File map

| #  | File                                | Contents                                                                                  | Legacy sources                                                |
|----|-------------------------------------|-------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| 01 | `01_auth_and_profiles.sql`          | `profiles` table, auth trigger, base RLS                                                  | 001                                                           |
| 02 | `02_employees_core.sql`             | `employees`, departments, job titles, contact fields, biometric_id, notification prefs    | 002, 017, 030, 034, 035, 042, 049, 053                        |
| 03 | `03_roles_and_permissions.sql`      | Role enums, account↔role sync, profile flags                                              | 003, 018, 059                                                 |
| 04 | `04_attendance_and_kiosk.sql`       | Attendance logs, face embeddings, reference images, kiosk config, QR, location pings     | 004, 022, 023, 025, 026, 033, 041, 051                        |
| 05 | `05_leave.sql`                      | Leave requests + duration, holidays type-check fix                                        | 005, 013, 043                                                 |
| 06 | `06_payroll.sql`                    | Payroll runs, payslips, deductions, simplification, signatures, payment proof/hold        | 006, 016, 024, 028, 036, 037, 038, 039, 045, 048, 054         |
| 07 | `07_loans.sql`                      | Loans + amortization                                                                      | 007                                                           |
| 08 | `08_tasks_projects_messaging.sql`   | Tasks, project assignments, tags, text channels, realtime messages                        | 008, 010, 027, 029, 031, 032, 046, 060                        |
| 09 | `09_notifications_and_audit.sql`    | Notification logs (+read), audit trail, push subscriptions, provider config, event types  | 009, 019, 021, 044, 047, 052                                  |
| 10 | `10_government_compliance.sql`      | BIR foundation, 201 files, disciplinary, jobs                                             | 056, 057, 058                                                 |
| 11 | `11_storage_buckets.sql`            | `avatars` (and related) storage buckets                                                   | 050                                                           |
| 12 | `12_client_feature_pack.sql`        | Client feature pack tables/flags                                                          | 055                                                           |
| 13 | `13_appearance_and_flags.sql`       | `appearance_settings` + module feature flags                                              | 061                                                           |
| 14 | `14_constraints_and_indexes.sql`    | Cross-table FK constraints, performance indexes, check constraints                        | 014, 015                                                      |
| 15 | `15_rls_policies.sql`               | Full RLS policy suite + realtime-table RLS toggles                                        | 011, 040                                                      |
| 16 | `16_realtime.sql`                   | `supabase_realtime` publication membership                                                | 020                                                           |
| 99 | `99_seed_data_optional.sql`         | Demo/seed data — **skip in production**                                                   | 012                                                           |

**Total:** 60 production + 1 optional seed → 17 files.

---

## 🛡️ Production checklist

After running migrations 01 → 16:

- [ ] Verify all tables exist: `select tablename from pg_tables where schemaname = 'public' order by 1;`
- [ ] Verify RLS is enabled on every public table:
  ```sql
  select tablename, rowsecurity
  from pg_tables
  where schemaname = 'public' and rowsecurity = false;
  -- Should return ZERO rows (every table must have RLS on)
  ```
- [ ] Confirm storage buckets exist: `select id, name from storage.buckets;`
- [ ] Confirm realtime publication: `select tablename from pg_publication_tables where pubname = 'supabase_realtime';`
- [ ] Create the first admin via `scripts/seed-supabase-users.ts` (do not use `99_seed_data_optional.sql` in production)

---

## 🔄 Regenerating this folder

If new migrations are added to `supabase/migrations/`, regenerate the v2 bundle:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-migrations-v2.ps1
```

The script preserves SQL verbatim — it only concatenates files into the grouped output. Update the group map in `scripts/build-migrations-v2.ps1` to include any new migration numbers.

---

## ⚠️ Do not edit these files by hand

They are generated. Edit the source migrations in `supabase/migrations/` (or add a new one), then re-run the build script.

---

© Nexvision Innovations Inc. — Premium Outlets HRIS
