# Client Feature Requests — NexHRMS Planning Document

> **Last Updated:** May 8, 2026
> **Status:** Planning / Implementation Backlog
> **System Version:** Next.js 15 App Router · Zustand 23 stores · Supabase 52 migrations

---

## Overview

This document captures client-requested features, connected to the existing codebase architecture, with a clear implementation plan for each item. Each request is broken down into: what is being asked, what already exists, what is missing, and what needs to be built.

---

## Feature 1 — Late & Absence Auto-Deduction in Payroll

### Client Request
> "Absent auto deduct or manual, late and O.T auto compute (per hour if late) computation for salary per hr and per day of their work hours"
> "695 per day / 8"

### What This Means
- When an employee is late, the system should automatically calculate the deduction amount based on their hourly rate.
- Formula: `hourly_rate = daily_rate / standard_hours_per_day` (e.g., ₱695 ÷ 8 = ₱86.875/hr)
- Late deduction = `(late_minutes / 60) × hourly_rate`
- Absent deduction = `daily_rate × absent_days`
- **Undertime deduction** — if an employee's shift is 8 hours but they only render 6 hours, the 2 missing hours are automatically deducted: `undertime_deduction = (shift_hours - actual_hours_worked) × hourly_rate`
- This deduction should be reflected automatically in the payslip when payroll is generated.
- Option to apply deductions **automatically** (system computes from attendance logs) or **manually** (admin adjusts values).

### Current System State

| Component | File | Status |
|-----------|------|--------|
| `late_minutes` column in attendance logs | `attendance_logs` table (DB) | ✅ Exists |
| `AttendanceLog.lateMinutes` TypeScript field | `src/types/index.ts` line ~280 | ✅ Exists |
| Attendance Rule Sets (`standard_hours_per_day`, `grace_minutes`) | `attendance_rule_sets` table (DB) | ✅ Exists |
| `Payslip` type with `earnings` / `deductions` arrays | `src/types/index.ts` | ✅ Exists |
| `PayrollAdjustment` for manual overrides | `src/store/payroll.store.ts` | ✅ Exists |
| `ShiftTemplate` with `startTime`, `endTime`, `hoursPerDay` | `src/store/attendance.store.ts` | ✅ Exists |
| `AttendanceLog.hours` (actual hours worked per day) | `attendance_logs` table (DB) | ✅ Exists |
| **Auto-deduction logic that reads `lateMinutes` and adds to payslip** | `src/lib/` | ❌ **MISSING** |
| **`daily_rate` / `hourly_rate` derived from employee salary** | `src/lib/payroll-utils.ts` (or similar) | ❌ **MISSING** |
| **Undertime deduction logic (`shift_hours - actual_hours`)** | `src/lib/` | ❌ **MISSING** |
| **Absent day auto-deduction in payslip generation flow** | `src/store/payroll.store.ts` → `issuePayslip` | ❌ **MISSING** |

### Implementation Plan

1. **Create `src/lib/payroll-deductions.ts`** — pure utility functions:
   ```ts
   computeDailyRate(monthlySalary: number, workDaysPerMonth: number): number
   computeHourlyRate(dailyRate: number, hoursPerDay: number): number
   computeLateDeduction(lateMinutes: number, hourlyRate: number): number
   computeAbsentDeduction(absentDays: number, dailyRate: number): number
   computeUndertimeDeduction(shiftHours: number, actualHoursWorked: number, hourlyRate: number): number
   // e.g. shift=8, actual=6 → (8-6) × hourlyRate = 2 × ₱86.875 = ₱173.75 deducted
   ```

2. **Update `issuePayslip()` in `src/store/payroll.store.ts`** — before issuing, pull attendance logs for the period, count absent days and total late minutes, compute undertime per day (`shift_hours - log.hours` for logs where `log.hours < shift_hours`), auto-append all deduction line items.

3. **Add toggle in Payroll Settings UI** (`src/app/[role]/payroll/_views/admin-view.tsx`) — "Auto-compute late & absent deductions" ON/OFF switch, stored in `paySchedule` config.

4. **DB: Store deduction breakdown** — `payslips` table already has `deductions jsonb`; add `late_deduction`, `absent_deduction`, `undertime_deduction` as named entries in the JSON.

### Acceptance Criteria
- [ ] Employee with 30 late minutes on a ₱695/day salary has `₱43.44` auto-added to deductions
- [ ] Employee absent 1 day has `₱695.00` auto-deducted
- [ ] Employee with an 8-hour shift who clocks out after 6 hours has `₱173.75` (2 hrs × ₱86.875) auto-deducted as undertime
- [ ] No undertime deduction is applied if `actual_hours >= shift_hours` (worked full shift or more)
- [ ] Admin can override any auto-computed deduction via `PayrollAdjustment`
- [ ] Deduction breakdown (late / absent / undertime) is visible as separate line items on the employee payslip view

---

## Feature 2 — Customizable Payroll Run Period (Per User or Global)

### Client Request
> "For payroll runs make sure it depends on the user when they issue it — it should be based on the days of the last run, customizable per user or for all"

### What This Means
- Payroll admins should be able to define the exact cut-off period when issuing a run (e.g., April 16–30, May 1–15).
- The period should auto-suggest based on the last run's end date.
- Pay frequency (weekly, bi-weekly, semi-monthly, monthly) should be configurable **globally** for all employees, or **overridden per individual employee**.
- When payroll is issued, it only includes attendance and hours worked within the defined period.

### Current System State

| Component | File | Status |
|-----------|------|--------|
| `PayScheduleConfig` with `defaultFrequency`, `semiMonthlyFirstCutoff`, etc. | `src/store/payroll.store.ts` `DEFAULT_PAY_SCHEDULE` | ✅ Exists (global) |
| `Employee.pay_frequency` per-employee field | `employees` DB table | ✅ Exists |
| Payroll run `runDate` field | `src/types/index.ts` `PayrollRun` | ✅ Exists |
| **`periodStart` / `periodEnd` on payroll runs** | `PayrollRun` type | ❌ **MISSING** |
| **Auto-suggest next period based on last run** | UI or store logic | ❌ **MISSING** |
| **Period date picker in "Create Payroll Run" dialog** | `src/app/[role]/payroll/` | ❌ **MISSING** |
| **Filter attendance logs by period when computing payslip** | `issuePayslip()` logic | ❌ **MISSING** |

### Implementation Plan

1. **Extend `PayrollRun` type** (`src/types/index.ts`):
   ```ts
   interface PayrollRun {
     // existing fields...
     periodStart: string;  // ISO date "2026-04-16"
     periodEnd: string;    // ISO date "2026-04-30"
   }
   ```

2. **Update `createDraftRun()` in `payroll.store.ts`** — accept `periodStart`/`periodEnd`, auto-suggest by looking at `runs` array for the latest `periodEnd` and adding 1 day.

3. **Add period date pickers to the "Create Run" UI** — show suggested period, allow admin to adjust before confirming.

4. **Wire attendance query to period** — when building payslips, filter `attendance_logs` where `date BETWEEN periodStart AND periodEnd`.

5. **Per-employee override** — in employee profile edit, allow setting `pay_frequency` different from the global default.

### Acceptance Criteria
- [ ] "Create Payroll Run" dialog shows suggested period dates (last period end + 1 day)
- [ ] Admin can override start and end date before creating the run
- [ ] Payslip computation only includes attendance within that period
- [ ] Employees with a different `pay_frequency` than global are handled separately

---

## Feature 3 — Overtime Auto-Compute & Editable OT Threshold

### Client Request
> "Overtime threshold make it editable"
> "Request OT"

### What This Means
- The threshold for what counts as overtime (e.g., after 8 hours worked = OT starts) must be configurable by an admin, not hardcoded.
- OT pay = `(OT hours) × (hourly_rate × OT multiplier)`. The multiplier (e.g., 1.25× for regular OT, 1.30× for rest day) should also be editable.
- Employees should be able to **submit an OT request** for upcoming or completed overtime; supervisors/admins approve it.
- Approved OT hours should auto-populate into the payslip earnings.

### Current System State

| Component | File | Status |
|-----------|------|--------|
| `OvertimeRequest` type with `status: pending/approved/rejected` | `src/types/index.ts` line 358 | ✅ Exists |
| `submitOvertimeRequest()`, `approveOvertime()`, `rejectOvertime()` | `src/store/attendance.store.ts` | ✅ Exists |
| `attendance_rule_sets.overtime_requires_approval` DB column | `attendance_rule_sets` table | ✅ Exists |
| `attendance_rule_sets.standard_hours_per_day` (the OT threshold) | `attendance_rule_sets` table | ✅ Exists (DB) |
| `attendance:approve_overtime` permission type | `src/types/index.ts` line 776 | ✅ Exists |
| **UI to edit `standard_hours_per_day` / OT threshold in Settings** | `src/app/[role]/settings/` or attendance settings | ❌ **MISSING** |
| **OT multiplier (`1.25×`, `1.30×`) editable config** | `attendance_rule_sets` or new config | ❌ **MISSING** |
| **Auto-add approved OT hours to payslip earnings** | `issuePayslip()` or payslip computation | ❌ **MISSING** |
| **Employee-facing OT request form** | Attendance page, employee view | ❌ Needs verification |

### Implementation Plan

1. **Settings UI — OT Configuration panel** (`src/app/[role]/settings/attendance.tsx` or within existing settings):
   - Field: "Standard hours per day (OT starts after)" — editable number input
   - Field: "OT Rate Multiplier" — e.g., `1.25` for regular days, `1.30` for rest days, `2.00` for holidays
   - Save to `attendance_rule_sets` via API

2. **Add OT multipliers to `attendance_rule_sets`** DB (migration needed):
   ```sql
   ALTER TABLE attendance_rule_sets
     ADD COLUMN ot_multiplier_regular NUMERIC DEFAULT 1.25,
     ADD COLUMN ot_multiplier_rest_day NUMERIC DEFAULT 1.30,
     ADD COLUMN ot_multiplier_holiday NUMERIC DEFAULT 2.00;
   ```

3. **Auto-compute OT earnings in payslip** — in `issuePayslip()`, fetch approved OT requests for the employee within the period, compute `ot_hours × hourly_rate × multiplier`, append to `earnings`.

4. **Employee OT Request form** — if not fully wired in the UI, add an "Request OT" button in the attendance employee view that opens a modal with: date, expected hours, reason.

### Acceptance Criteria
- [ ] Admin can change OT threshold (default 8 hrs) from the settings page
- [ ] Admin can set OT pay multipliers per day type
- [ ] Employee can submit OT request with date + hours + reason
- [ ] Approved OT hours appear as a separate line in the payslip earnings
- [ ] OT earnings = `ot_hours × (daily_rate / std_hours) × ot_multiplier`

---

## Feature 4 — Per-Project Fixed QR Codes (Downloadable & Printable)

### Client Request
> "Each project should have a fixed QR code — make sure they can download so they can print or just print button — and when employee scans the QR it will record as long as they are in the correct location and scan"

### What This Means
- Every project gets one **permanent** QR code (not a rotating/expiring token) that represents that project location.
- The QR code encodes the `project_id` + an HMAC signature for tamper-proofing.
- Admins can download the QR as a PNG or directly print it from the browser.
- When an employee scans the project QR (via the kiosk or their phone), the system:
  1. Decodes and validates the QR
  2. Checks if the employee is assigned to that project
  3. Checks geofence (employee must be within `geofenceRadiusMeters` of the project location)
  4. Records the attendance event (`IN` or `OUT`) with `project_id` attached

### Current System State

| Component | File | Status |
|-----------|------|--------|
| `Project` type with `id`, `location`, `geofenceRadiusMeters`, `verificationMethod` | `src/types/index.ts` line 685 | ✅ Exists |
| `verificationMethod: "qr_only" \| "face_only" \| "face_or_qr"` per project | `Project` interface | ✅ Exists |
| Kiosk QR scan page (`/kiosk/qr`) with geofence check | `src/app/kiosk/qr/page.tsx` | ✅ Exists |
| `qr_tokens` table for rotating session tokens | `qr_tokens` DB table | ✅ Exists |
| **`project_qr_secret` or static QR payload per project** | `Project` type / `projects` DB table | ❌ **MISSING** |
| **QR code generation for a project (PNG output)** | Any page or utility | ❌ **MISSING** |
| **"Download QR" / "Print QR" button on Project detail page** | `src/app/[role]/projects/` | ❌ **MISSING** |
| **API route to validate a project QR scan** | `src/app/api/kiosk/` or `src/app/api/project-verification/` | ❌ Needs verification |

### Implementation Plan

1. **Add `qrSecret` to `Project` type** and `projects` DB table:
   ```sql
   ALTER TABLE projects ADD COLUMN qr_secret TEXT;
   ```
   - On project creation, auto-generate: `qr_secret = nanoid(32)` stored in DB
   - QR payload: `{ projectId, secret }` — signed/encoded as Base64 JSON

2. **QR Code generation utility** (`src/lib/project-qr.ts`):
   ```ts
   generateProjectQRPayload(project: Project): string  // returns encoded string
   validateProjectQRPayload(payload: string, projects: Project[]): Project | null
   ```
   - Use `qrcode` npm package to render QR to canvas/PNG

3. **"Download QR" & "Print QR" buttons on Project management page**:
   - `src/app/[role]/projects/page.tsx` or project detail modal
   - Download: renders QR to `<canvas>`, calls `canvas.toBlob()` → download PNG file named `{project-name}-qr.png`
   - Print: opens `window.print()` with a print-friendly layout showing QR + project name + address

4. **Update kiosk QR scan handler** to accept project QR payloads:
   - Currently handles `qr_tokens` (session tokens); add a second branch for `project_qr` type
   - Validate `secret` matches the project record
   - Enforce geofence check before recording attendance event
   - Record `attendance_events` row with `project_id`

5. **Security**: Project QR secret must never be exposed via client-side API without auth. Validation happens server-side only.

### Acceptance Criteria
- [ ] Each project has a unique, permanent QR code visible in the project management page
- [ ] "Download QR" exports a PNG with the project name as the filename
- [ ] "Print QR" opens a print dialog with the QR code and project name/address
- [ ] Scanning the project QR on the kiosk records attendance only if: (a) employee is assigned to that project AND (b) employee is within the geofence radius
- [ ] Invalid or tampered QR shows an error on the kiosk screen

---

## Feature 5 — Employee Import / Export with Downloadable Template

### Client Request
> "Import export in employees and download template"

### What This Means
- Admins and HR can **export** the current employee list to an Excel/CSV file.
- Admins can **import** employees in bulk by uploading an Excel/CSV file.
- A **template file** should be downloadable so the user knows the exact column format expected.
- Import should validate each row before inserting and show which rows have errors.

### Current System State

| Component | File | Status |
|-----------|------|--------|
| `src/lib/export-utils.ts` — export utilities (XLSX/CSV) | `src/lib/export-utils.ts` | ✅ Exists |
| Import API for **payroll** with dryRun validation | `src/app/api/import/payroll/route.ts` | ✅ Exists |
| Import API for **attendance** with dryRun validation | `src/app/api/import/attendance/route.ts` | ✅ Exists |
| `ImportDataDialog` component with per-row validation UI | `src/components/import-data-dialog.tsx` | ✅ Exists |
| **Export employees to Excel/CSV** | `src/app/api/export/` or export-utils | ❌ Needs verification |
| **Import employees API route** (`/api/import/employees`) | `src/app/api/import/employees/route.ts` | ❌ **MISSING** |
| **Employee import template file** | `public/templates/` or generated on demand | ❌ **MISSING** |
| **Import/Export buttons on Employees Manage page** | `src/app/[role]/employees/manage/` | ❌ Needs verification |

### Implementation Plan

1. **Create `src/app/api/import/employees/route.ts`** — following the same dryRun pattern as payroll/attendance imports:
   - Accept: `name`, `email`, `role`, `department`, `daily_rate`, `pay_frequency`, `work_type`, `hire_date`, `phone`
   - DryRun mode: validate each row (required fields, valid role enum, valid email format, duplicate email check)
   - Live mode: create employee record via `supabase-server` admin client, invite user via `auth.admin.inviteUserByEmail()`

2. **Employee export API** (`src/app/api/export/employees/route.ts`) or extend `export-utils.ts`:
   - Accept optional filters: `department`, `status`, `role`
   - Return XLSX with all employee fields

3. **Template download** — generate on-demand (no static file needed):
   - `GET /api/import/employees?template=true` → returns an XLSX with header row only and example data in row 2

4. **Wire UI** on Employees Manage page:
   - "Export Employees" button → calls export API, triggers browser download
   - "Import Employees" button → opens existing `ImportDataDialog` pointed at `/api/import/employees`
   - "Download Template" link inside the dialog

### Template Columns
| Column | Required | Notes |
|--------|----------|-------|
| `name` | ✅ | Full name |
| `email` | ✅ | Must be unique; used for login |
| `role` | ✅ | One of: `admin`, `hr`, `finance`, `employee`, `supervisor`, `payroll_admin`, `auditor` |
| `department` | ❌ | Free text |
| `daily_rate` | ✅ | Numeric (e.g., `695`) |
| `pay_frequency` | ✅ | `monthly`, `semi_monthly`, `bi_weekly`, `weekly` |
| `work_type` | ✅ | `WFH`, `WFO`, `HYBRID`, `ONSITE` |
| `hire_date` | ✅ | ISO date `YYYY-MM-DD` |
| `phone` | ❌ | Mobile number |

### Acceptance Criteria
- [ ] "Export" button on Employees Manage page downloads an XLSX with all active employees
- [ ] "Download Template" produces a clean XLSX with headers + 1 example row
- [ ] Upload a template file → system validates and shows per-row status (valid / error)
- [ ] Import creates employees and sends email invitations
- [ ] Duplicate email rows are flagged as errors before inserting

---

## Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 🔴 P1 | Late & Absent Auto-Deduction in Payroll | Medium | High — directly affects payroll accuracy |
| 🔴 P1 | Employee Import / Export with Template | Medium | High — operational need for bulk onboarding |
| 🟡 P2 | Customizable Payroll Run Period | Medium | High — affects every payroll cycle |
| 🟡 P2 | OT Auto-Compute (approved → payslip) | Medium | High — ensures OT pay is correct |
| 🟢 P3 | Editable OT Threshold & Multipliers | Low | Medium — settings change |
| 🟢 P3 | Per-Project Fixed QR Codes | High | Medium — field operations feature |

---

## Files To Create / Modify

### New Files
- `src/lib/payroll-deductions.ts` — late, absent, OT deduction pure functions
- `src/app/api/import/employees/route.ts` — employee bulk import with dryRun
- `src/app/api/export/employees/route.ts` — employee export endpoint
- `src/lib/project-qr.ts` — project QR generation and validation utilities

### Files To Modify
- `src/types/index.ts` — add `periodStart`/`periodEnd` to `PayrollRun`; add `qrSecret` to `Project`; add OT multipliers to `AttendanceRuleSet`
- `src/store/payroll.store.ts` — update `issuePayslip()` and `createDraftRun()` with period + auto-deductions
- `src/store/attendance.store.ts` — add OT threshold to rule set actions
- `src/app/[role]/payroll/_views/admin-view.tsx` — add period date pickers to run creation
- `src/app/[role]/projects/page.tsx` — add QR download/print buttons per project
- `src/app/[role]/employees/manage/_views/admin-view.tsx` — add import/export buttons
- `src/app/[role]/settings/` — add OT configuration panel

### DB Migrations Needed
- Add `ot_multiplier_regular`, `ot_multiplier_rest_day`, `ot_multiplier_holiday` to `attendance_rule_sets`
- Add `qr_secret TEXT` to `projects` table
- Add `period_start DATE`, `period_end DATE` to `payroll_runs` table (if not already present)

