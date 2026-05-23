# Premium Outlets HRIS — Project Context

**Powered by Nexvision Innovations Inc.** · White-label of NexHRIS

This document is the canonical map of the codebase. Read this before making any structural changes.

---

## 1. Architectural Pillars

### 1.1 Next.js App Router (Server-first)
- Routes live in `src/app/[role]/…` where `[role]` is one of `admin | hr | finance | employee`.
- Role-prefixed routing enforces RBAC at the URL layer — middleware (`src/proxy.ts`) blocks role mismatches before any handler runs.
- API routes live in `src/app/api/**/route.ts` — RESTful, all use `createServerSupabaseClient` for user-scoped queries or `createAdminSupabaseClient` for service-role operations.

### 1.2 Zustand Stores
- One store per domain (`payroll.store.ts`, `attendance.store.ts`, `leave.store.ts`, etc.).
- Stores hold **client-side cache + UI state**. Persistence is always remote (Supabase) — stores call `fetch('/api/…')` and update local state.
- Pattern: each store exposes `fetch*()`, `add*()`, `update*()`, `delete*()`, plus computed selectors via React hooks.

### 1.3 Supabase Backend
- **Auth**: Supabase Auth (email + password), role propagated via JWT claim.
- **Postgres**: All business data; RLS policies enforce row-level access per role.
- **Storage**: Profile photos, payslip PDFs, document uploads.
- **Edge Functions**: Background tasks (notifications dispatch, scheduled payroll close).

### 1.4 PWA & Kiosk
- Service worker (`public/sw.js`) caches face-api models and offline shell.
- Kiosk mode (`/kiosk/face`, `/kiosk/qr`) runs unauthenticated check-in via local biometric/QR validation against tenant-scoped HMAC tokens.

---

## 2. Module Map

### 2.1 Attendance
- **Pages**: `src/app/[role]/attendance/`
- **Store**: `src/store/attendance.store.ts`
- **API**: `src/app/api/attendance/`
- **Kiosk**: `src/app/kiosk/face`, `src/app/kiosk/qr`
- **Features**: Clock-in/out, geo-fencing, late/absent/undertime auto-detection, exception flags, CSV import/export, biometric (face) recognition, QR code with HMAC validation.

### 2.2 Payroll
- **Pages**: `src/app/[role]/payroll/` (sub-routes: `_views/admin-view.tsx`, `settings`, `runs`)
- **Store**: `src/store/payroll.store.ts`
- **Components**: `src/components/payroll/` (readiness checklist, run wizard, payslip viewer, schedule settings)
- **API**: `src/app/api/payroll/`
- **Compliance**: SSS, PhilHealth, Pag-IBIG, BIR withholding, 13th-month pay, loan amortization with 30% net-pay cap.
- **Auto-deductions**: late, absent, undertime — toggleable per run.
- **Run lifecycle**: `draft → published → signed → paid` with `payment_hold` exception status.

### 2.3 Leave
- **Pages**: `src/app/[role]/leave/`
- **Store**: `src/store/leave.store.ts`
- **Features**: Multi-type, accrual computation, approval chain, blocks payroll lock when pending in period.

### 2.4 Tasks & Projects
- **Pages**: `src/app/[role]/tasks/`, `src/app/[role]/projects/`
- **Stores**: `src/store/tasks.store.ts`, `src/store/projects.store.ts`
- **Features**: Kanban, due dates, assignees, project QR code (HMAC) for on-site time tracking.

### 2.5 Notifications & Messaging
- **Stores**: `src/store/notifications.store.ts`, `src/store/messages.store.ts`
- **Push**: Web Push (`src/app/api/push/`) with VAPID keys.
- **In-app**: Persistent feed + per-user preferences.

### 2.6 Government Reports
- **Pages**: `src/app/[role]/gov-reports/`
- **Reports**: BIR Alphalist (1604-C/-F), SSS R-3, PhilHealth RF-1, Pag-IBIG MCRF.

### 2.7 Settings & Admin
- **Pages**: `src/app/[role]/settings/`
- **Features**: Theme density (compact/relaxed), sidebar variant, location config, notification prefs, kiosk policies, appearance settings (per-tenant logo, colors).

---

## 3. Database Schema Overview

Full schema in [`currentdb.md`](currentdb.md). High-level groups:

| Group                | Key tables                                                                            |
| -------------------- | ------------------------------------------------------------------------------------- |
| Identity & Roles     | `auth.users`, `employees`, `departments`                                              |
| Time & Attendance    | `attendance_logs`, `shifts`, `shift_assignments`, `attendance_exceptions`             |
| Payroll              | `payroll_runs`, `payslips`, `payslip_deductions`, `pay_schedule_config`, `loans`      |
| Leave                | `leave_types`, `leave_requests`, `leave_balances`                                     |
| Work                 | `projects`, `tasks`, `task_comments`                                                  |
| Communications       | `messages`, `notifications`, `notification_preferences`, `push_subscriptions`         |
| Compliance           | `gov_contributions`, `bir_alphalist_entries`                                          |
| Documents & Settings | `documents`, `app_settings`, `kiosk_config`, `appearance_settings`                    |

All tables have `created_at`, `updated_at`, and (where relevant) `tenant_id` for multi-tenant scoping. RLS is mandatory.

---

## 4. Key Design Decisions (carry-overs from NexHRIS)

1. **Role-prefixed routes** — `/admin/*`, `/hr/*`, `/finance/*`, `/employee/*`. A user accessing the wrong prefix is redirected by middleware.
2. **Net pay clamping** — payslip generation uses `netPay = Math.max(0, rawNetPay)` so net is never stored negative.
3. **Readiness checklist before payroll lock** — checks: missing clock-outs, payslips exist, no missing-salary employees, no pending leave in period. Blockers prevent locking the run.
4. **Demo mode** — set `NEXT_PUBLIC_DEMO_MODE=true` to bypass Supabase reads for deductions/templates (seed data injected client-side).
5. **HMAC-signed QR / face tokens** — `QR_HMAC_SECRET` env var must be set in production.

---

## 5. Testing Strategy

- **Unit / regression**: `src/__tests__/features/*.test.ts` — Jest, pure-function and store-level tests.
- **Coverage**: `npm run test:coverage` → `coverage/lcov-report/index.html`.
- **CI**: GitHub Actions runs `npm run test:ci` on every push.
- **Manual smoke**: After every release, walk the payroll run wizard end-to-end on staging.

---

## 6. Deployment

- **Target**: Vercel, region `sin1` (Singapore — closest to PH).
- **`vercel.json`** sets API max duration to 30s and aggressively caches static assets.
- **Env vars**: Configure in Vercel → Settings → Environment Variables (see [`ENVIRONMENT.md`](ENVIRONMENT.md)).
- **Database**: Supabase project, region SEA. Run migrations once via SQL editor (see [`MIGRATIONS.md`](MIGRATIONS.md)).

---

## 7. Where to Look First

| If you need to…                       | Go to                                                          |
| ------------------------------------- | -------------------------------------------------------------- |
| Add an API endpoint                   | `src/app/api/<module>/route.ts`                                |
| Add a new page                        | `src/app/[role]/<module>/page.tsx`                             |
| Add a Zustand store action            | `src/store/<module>.store.ts`                                  |
| Re-skin the UI                        | `src/app/globals.css` (CSS variables only)                     |
| Change a Supabase table               | Create a new migration in `supabase/migrations/`               |
| Add a test                            | `src/__tests__/features/<module>.test.ts`                      |
| Update PWA name / icons               | `src/app/manifest.ts` + `public/` icons                        |
| Adjust route protection               | `src/proxy.ts`                                                 |

---

© Nexvision Innovations Inc.
