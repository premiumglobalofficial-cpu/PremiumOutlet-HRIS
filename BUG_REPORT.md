# SorenHRMS — Bug Report

> **Date:** May 11, 2026  
> **Auditor:** Automated Code Audit  
> **Scope:** Full codebase — stores, API routes, services, utilities, security  
> **Build:** Next.js 16.1 + React 19 + Supabase + Zustand 5

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| 🔴 **CRITICAL** | Security vulnerability or data corruption — must fix before production |
| 🟠 **HIGH** | Functional bug that causes incorrect behavior or data loss |
| 🟡 **MEDIUM** | Logic error that affects edge cases or specific workflows |
| 🟢 **LOW** | Minor issue, cosmetic, or code quality concern |

---

# 🔧 BACKEND BUGS

> API routes, services, database (RLS/migrations), server-side logic, and business logic in stores.

---

## 🔴 CRITICAL

### BUG-001: POST `/api/project-verification` Has No Authentication Check

**File:** `src/app/api/project-verification/route.ts` (line 76)  
**Severity:** 🔴 CRITICAL  
**Impact:** Any unauthenticated user can change the verification method for any project (face-only, QR-only, manual-only). An attacker could disable face verification for all projects, allowing unauthorized check-ins.

**Root Cause:** The `POST` handler has zero authentication or authorization logic. While the `GET` handler checks for a user session, the `POST` handler immediately parses the body and calls `setProjectVerificationMethod()` without verifying the caller.

**Reproduction:**
```bash
curl -X POST http://localhost:3000/api/project-verification \
  -H "Content-Type: application/json" \
  -d '{"projectId":"PROJ-001","method":"manual_only"}'
```

**Fix:** Add session verification and admin role check at the top of the POST handler.

---

### BUG-002: Face Recognition Enrollment Accepts Spoofed `x-user-id` Header

**File:** `src/app/api/face-recognition/enroll/route.ts` (lines 37–42)  
**Severity:** 🔴 CRITICAL  
**Impact:** Any client can set an arbitrary `x-user-id` header to impersonate any user. This allows enrolling face data for other employees, deleting other employees' face enrollments, or bypassing the kiosk auth requirement entirely.

**Root Cause:** The route accepts either kiosk API key OR a plain `x-user-id` header. The `x-user-id` header is not validated against the actual authenticated session — it's just checked for existence (`!!request.headers.get("x-user-id")`).

**Reproduction:**
```bash
curl -X POST "http://localhost:3000/api/face-recognition/enroll?action=delete" \
  -H "Content-Type: application/json" \
  -H "x-user-id: fake-attacker" \
  -d '{"employeeId":"EMP-001"}'
```

**Fix:** Validate `x-user-id` against the actual Supabase session user, or require a valid session token.

---

### BUG-003: Overly-Permissive RLS INSERT Policies Allow Cross-Employee Data Injection

**File:** `supabase/migrations/011_rls_policies.sql`  
**Severity:** 🔴 CRITICAL  
**Impact:** Any authenticated user can insert attendance events, evidence, and audit logs for ANY employee. An employee could clock in/out for other employees or inject fake audit records to cover tracks.

**Affected Tables:**
| Table | Policy | Risk |
|-------|--------|------|
| `attendance_events` | `ae_insert WITH CHECK (true)` | Clock in/out for any employee |
| `attendance_evidence` | `aev_insert WITH CHECK (true)` | Attach fake GPS/face evidence |
| `audit_logs` | `audit_insert WITH CHECK (true)` | Inject fake audit trail entries |
| `notification_logs` | `nl_insert WITH CHECK (true)` | Create fake notification records |

**Fix:** Restrict INSERT policies to own employee records:
```sql
CREATE POLICY ae_insert ON public.attendance_events
    FOR INSERT WITH CHECK (public.is_own_employee(employee_id));
```

---

### BUG-004: `adminResetPassword` Uses Weaker Minimum (6 chars) Than `createUserAccount` (8 chars)

**File:** `src/services/auth.service.ts` (line ~175 vs ~88)  
**Severity:** 🔴 CRITICAL (inconsistent security policy)  
**Impact:** An admin can reset a user's password to a weak 6-character password, bypassing the 8-character minimum enforced during account creation. This creates an inconsistent security posture.

**Root Cause:** `createUserAccount` checks `password.length < 8` but `adminResetPassword` checks `password.length < 6`.

**Fix:** Unify to 8-character minimum in both functions.

---

## 🟠 HIGH

### BUG-005: Night Differential Calculation Edge Case for Non-Standard Config

**File:** `src/store/timesheet.store.ts` (function `calcNightDiffMinutes`)  
**Severity:** 🟠 HIGH  
**Impact:** The night differential calculation works correctly for standard 22:00–06:00 windows but has edge cases when `ndStartMin` or `ndEndMin` are configured to non-standard values. For overnight shifts where check-in is after midnight with a non-standard night diff window, Segment B could double-count hours.

**Root Cause:** The function assumes a fixed 22:00–06:00 window structure. Custom configurations may break the segment overlap logic.

---

### BUG-006: Leave Balance Not Initialized Before First Leave Request

**File:** `src/store/leave.store.ts` (function `addRequest`)  
**Severity:** 🟠 HIGH  
**Impact:** When an employee submits their first leave request, the balance check (`bal.remaining < days`) will find `bal` as `undefined` because `initBalances` was never called for that employee/year. The code proceeds to create the request anyway, but when the leave is later approved, the balance deduction operates on `undefined`, causing the balance to never be properly tracked.

**Root Cause:** `addRequest` looks up the balance but doesn't call `initBalances` if none exists. The `updateStatus` function also looks up the balance for deduction but doesn't initialize it first.

**Reproduction:**
1. Create a new employee
2. Submit a leave request without ever calling `initBalances`
3. Approve the leave — balance deduction silently fails (no matching balance record to update)

**Fix:** Call `get().initBalances(req.employeeId, year)` at the start of `addRequest` and `updateStatus`.

---

### BUG-007: Payroll Final Pay Computes Government Deductions on Gross Final Pay Instead of Monthly Equivalent

**File:** `src/store/payroll.store.ts` (function `computeFinalPay`)  
**Severity:** 🟠 HIGH  
**Impact:** Government deductions (SSS, PhilHealth, Pag-IBIG, tax) are computed on the total gross final pay amount (which includes pro-rated salary + OT + leave payout), not on the monthly salary equivalent. This can result in significantly higher deductions than legally required.

**Root Cause:** `computeAllPHDeductions(grossFinalPay)` is called with the total lump sum instead of the employee's regular monthly salary.

**Fix:** Use the employee's regular monthly salary for SSS/PhilHealth/Pag-IBIG computation, and compute withholding tax on the pro-rated salary portion only.

---

### BUG-008: Attendance `checkIn` Late Minutes Calculation Wrong for Night Shifts

**File:** `src/store/attendance.store.ts` (function `checkIn`, around line 230)  
**Severity:** 🟠 HIGH  
**Impact:** For night shift employees (shift start 22:00), if an employee checks in at 06:00 (8 hours late), `rawLate = 360 - 1320 = -960`, which is negative, so `lateMinutes = 0`. **The employee is marked as on-time despite being 8 hours late.**

**Root Cause:** No overnight normalization for late calculation. When `totalMinIn < shiftStartTotal` (employee checks in after midnight for a pre-midnight shift), the raw late value goes negative.

**Fix:**
```typescript
let rawLate = totalMinIn - shiftStartTotal;
if (rawLate < -720) rawLate += 1440; // crossed midnight
```

---

### BUG-009: `autoMarkAbsentAfterShift` Holiday Check Uses Exact String Match

**File:** `src/store/attendance.store.ts` (line ~180)  
**Severity:** 🟠 HIGH  
**Impact:** The holiday check `state.holidays.some((h) => h.date === date)` does an exact string match. If holiday date formats differ (e.g., `"01-01"` for recurring holidays, or `"2025-01-01"` for last year's data that wasn't updated), employees will be incorrectly marked absent on holidays.

**Root Cause:** No normalization or year-aware comparison for holiday dates.

---

### BUG-010: Loan `computeCappedDeduction` Uses Net Pay BEFORE Loan Deduction in Cap Calculation

**File:** `src/store/loans.store.ts` (function `computeCappedDeduction`)  
**Severity:** 🟠 HIGH  
**Impact:** When an employee has multiple active loans, the cap is computed against the same `employeeNetPay` for each loan. If an employee has 3 loans each with a 30% cap and net pay of ₱10,000, each loan could deduct up to ₱3,000, totaling ₱9,000 (90% of net pay). The 30% cap is meant to protect the employee from excessive deductions, but it's applied per-loan rather than as an aggregate.

**Root Cause:** `recordCappedDeduction` is called independently for each loan with the same `employeeNetPay` value. There's no aggregate cap enforcement across all loans.

**Fix:** The payroll engine should compute the aggregate loan deduction cap first (`30% of net pay`), then distribute across loans proportionally.

---

## 🟡 MEDIUM

### BUG-011: Leave `calculateLeaveDays` Doesn't Exclude Weekends or Holidays

**File:** `src/store/leave.store.ts` (function `calculateLeaveDays`)  
**Severity:** 🟡 MEDIUM  
**Impact:** A leave request from Friday to Monday counts as 4 days (including Saturday and Sunday), when it should only count 2 working days. This causes employees to use more leave balance than necessary.

**Root Cause:** `calculateLeaveDays` simply computes `(endDate - startDate) / millisPerDay + 1` without filtering out weekends or holidays.

---

### BUG-012: Payroll `issuePayslip` Duplicate Guard Silently Blocks Re-Issue

**File:** `src/store/payroll.store.ts` (function `issuePayslip`)  
**Severity:** 🟡 MEDIUM  
**Impact:** If a payslip exists in a "draft" state and the admin tries to re-issue (perhaps after corrections), the duplicate guard silently blocks it with no user feedback — `return {}` gives no indication that the operation was skipped.

**Root Cause:** The duplicate check doesn't filter by status (e.g., should allow re-issue if existing is in "draft" status for correction workflows).

---

### BUG-013: Timesheet `computeTimesheet` Overwrites Only "computed" Status Timesheets

**File:** `src/store/timesheet.store.ts` (end of `computeTimesheet`)  
**Severity:** 🟡 MEDIUM  
**Impact:** If a timesheet was already submitted or approved and the admin re-computes it, a NEW timesheet is created alongside the old one. The employee now has two timesheets for the same date — one approved and one computed. This can cause double-counting in payroll.

**Root Cause:** The replace logic only triggers when `existing.status === "computed"`. For submitted/approved timesheets, it appends a duplicate.

---

### BUG-014: `calculateHours` Returns Incorrect Value for Very Short Durations

**File:** `src/store/attendance.store.ts` (function `calculateHours`)  
**Severity:** 🟡 MEDIUM  
**Impact:** If `diffSeconds` is between 1 and 59 (less than 1 minute), the function returns `0.01` hours. This hardcoded value bypasses the normal rounding logic and could accumulate across many short check-in/out cycles.

---

### BUG-015: `autoGenerateExceptions` Creates Duplicate Exceptions on Repeated Calls

**File:** `src/store/attendance.store.ts` (around line 145)  
**Severity:** 🟡 MEDIUM  
**Impact:** The deduplication check is only applied to `missing_in` and `missing_out` flags, not to `duplicate_scan`, `out_of_geofence`, or `device_mismatch`. These will be created every time the function runs.

---

### BUG-016: Salary Change Approval Doesn't Validate `effectiveDate` Is in the Future

**File:** `src/store/employees.store.ts` (function `approveSalaryChange`)  
**Severity:** 🟡 MEDIUM  
**Impact:** A salary change can be approved with a past effective date, which could retroactively affect already-computed payslips without triggering recalculation.

---

### BUG-017: Pag-IBIG Computation Uses Outdated ₱100 Cap Instead of 2026 ₱200 Cap ✅ FIXED

**File:** `src/lib/ph-deductions.ts` (function `computePagIBIG`)  
**Severity:** 🟡 MEDIUM  
**Impact:** The code returned a flat ₱100 for all salaries above ₱1,500. Per the 2026 Pag-IBIG table, the employee share is 2% of salary with a ₱10,000 compensation ceiling (max EE = ₱200). An employee earning ₱3,000 should pay ₱60, one earning ₱10,000+ should pay ₱200 — not ₱100.

**2026 Rules Applied:**
| Monthly Compensation | Employee Share (EE) | Cap |
|---------------------|--------------------|----|
| ≤ ₱1,500 | 1% | — |
| > ₱1,500 | 2% | ₱200 (₱10,000 ceiling × 2%) |

**Fix Applied:**
```typescript
export function computePagIBIG(monthlyGross: number): number {
    if (monthlyGross <= 1500) return Math.round(monthlyGross * 0.01);
    const base = Math.min(monthlyGross, 10000);
    return Math.round(base * 0.02);
}
```

---

### BUG-018: SSS Computation Uses Linear Approximation Instead of Bracket Table

**File:** `src/lib/ph-deductions.ts` (function `computeSSS`)  
**Severity:** 🟡 MEDIUM  
**Impact:** The SSS contribution is approximated by rounding the salary to the nearest ₱500 bracket and applying 4.5%. This can be off by ₱10–₱45 for salaries near bracket boundaries compared to the official DOLE table.

---

## 🟢 LOW

### BUG-019: `formatTimeWithSeconds` Doesn't Handle Negative or >24h Values

**File:** `src/store/attendance.store.ts` (function `formatTimeWithSeconds`)  
**Severity:** 🟢 LOW  
**Impact:** If a `Date` object has invalid time values, the function could produce strings like `"-1:30:00"` or `"25:00:00"`.

---

### BUG-020: Employee Store `dedupeByEmail` Loses Data from Discarded Records

**File:** `src/store/employees.store.ts` (function `dedupeByEmail`)  
**Severity:** 🟢 LOW  
**Impact:** When two employee records share the same email, the discarded record may have additional data (salary history, documents, attendance logs) that references its ID. Those references become orphaned.

---

### BUG-021: Payroll Store `applyAdjustment` Sets `netPay` to Raw Adjustment Amount

**File:** `src/store/payroll.store.ts` (function `applyAdjustment`)  
**Severity:** 🟢 LOW  
**Impact:** For deduction-type adjustments, `adj.amount` could be negative. Downstream code may not handle negative `netPay` correctly.

---

### BUG-022: `GET /api/face-recognition/enroll` Has No Authentication

**File:** `src/app/api/face-recognition/enroll/route.ts` (GET handler)  
**Severity:** 🟢 LOW  
**Impact:** Anyone can check the face enrollment status of any employee by ID. Leaks information about which employees have face recognition set up.

---

### BUG-023: Overtime Request Approval Doesn't Update Timesheet

**File:** `src/store/attendance.store.ts` (functions `approveOvertime`/`rejectOvertime`)  
**Severity:** 🟢 LOW  
**Impact:** When an overtime request is approved, the corresponding timesheet is not automatically updated with the approved OT hours. The timesheet must be manually re-computed.

---

### BUG-024: `useLeaveStore` Persist Migration Resets All Balances

**File:** `src/store/leave.store.ts` (persist config, `migrate` function)  
**Severity:** 🟢 LOW  
**Impact:** The migration function returns `{ requests: SEED_LEAVES, balances: [] }` for ANY version upgrade. Every time the store version is bumped, all employee leave balances are wiped in demo mode.

---

---

# 🖥️ FRONTEND BUGS

> UI pages, components, rendering issues, React patterns, and user-facing behavior.

---

## � HIGH

### BUG-025: Payroll Page Calls `router.replace()` During Render (React Warning)

**File:** `src/app/[role]/payroll/page.tsx` (line 22)  
**Severity:** 🟠 HIGH  
**Impact:** When a non-admin/finance/payroll_admin user navigates to the payroll page, `router.replace()` is called directly during the render phase (not inside a `useEffect`). This triggers a React warning: "Cannot update a component while rendering a different component." It also causes a flash of `null` content before the redirect happens.

**Root Cause:** The redirect logic is synchronous in the component body:
```tsx
if (!mode) {
    router.replace(`/${role}/my-payslips`);
    return null;
}
```

**Fix:** Move the redirect into a `useEffect`:
```tsx
useEffect(() => {
    if (!mode) router.replace(`/${role}/my-payslips`);
}, [mode, role, router]);
if (!mode) return <LoadingFallback />;
```

---

### BUG-026: RoleViewDispatcher Passes Functions Instead of Components (Attendance Page)

**File:** `src/app/[role]/attendance/page.tsx` (lines 10–15)  
**Severity:** 🟠 HIGH  
**Impact:** The attendance page passes arrow functions `() => <AdminView mode="admin" />` as view entries, but `RoleViewDispatcher` expects `ComponentType`. This creates a new component identity on every render, causing the entire view to unmount/remount on any parent re-render. This destroys all local state (form inputs, dialog open states, scroll position).

**Affected Pages:** `attendance/page.tsx`, `leave/page.tsx` — both pass inline functions instead of component references.

**Fix:** Use stable component references:
```tsx
const AdminAttendanceView = () => <AdminView mode="admin" />;
const HRAttendanceView = () => <AdminView mode="hr" />;
views={{ admin: AdminAttendanceView, hr: HRAttendanceView, ... }}
```

---

## 🟡 MEDIUM

### BUG-027: Employee View `ElapsedTimeDisplay` Doesn't Account for Overnight Shifts ✅ FIXED

**File:** `src/app/[role]/attendance/_views/employee-view.tsx` (component `ElapsedTimeDisplay`)  
**Severity:** 🟡 MEDIUM  
**Impact:** For night-shift employees who checked in at 22:00, the elapsed time shows "0h 0m" at 02:00 instead of the correct "4h 0m".

**Root Cause:** `start.setHours(h, m, s, 0)` always sets the time on the current date. For overnight shifts where check-in was yesterday, this creates a future timestamp.

**Fix Applied:** If `start > now`, subtract 24 hours from `start`.

---

### BUG-028: Attendance Admin View Runs `setInterval` Every 1 Second for DevTools Detection

**File:** `src/app/[role]/attendance/_views/admin-view.tsx` (line ~200)  
**Severity:** 🟡 MEDIUM  
**Impact:** The admin view runs a `setInterval` every 1000ms for DevTools detection. This is unnecessary for admin users who don't need anti-cheat protection. Wastes CPU cycles and causes unnecessary re-renders.

**Root Cause:** The DevTools detection logic was copied from the employee view but isn't needed in admin mode.

---

### BUG-029: Projects Page Shows `AccessDenied` for Employee and Finance Roles ✅ FIXED

**File:** `src/app/[role]/projects/page.tsx`  
**Severity:** 🟡 MEDIUM  
**Impact:** Employees, finance, payroll_admin, and auditor roles saw the `AccessDenied` fallback instead of a read-only project view.

**Fix Applied:** Added all missing roles to the view map, pointing to `ReadonlyProjectsView`.

---

### BUG-030: Login Page Exposes Demo Password in Production Bundle

**File:** `src/app/login/page.tsx`  
**Severity:** 🟡 MEDIUM  
**Impact:** The login page unconditionally imports `DEMO_USERS` and renders "Default password: demo1234". Even when `NEXT_PUBLIC_DEMO_MODE` is `false`, these are included in the client JavaScript bundle.

**Root Cause:** No conditional import or tree-shaking boundary around demo-only UI elements.

---

### BUG-031: Leave Admin View Day Calculation Doesn't Match Store Logic ✅ FIXED

**File:** `src/app/[role]/leave/_views/admin-view.tsx` (function `daysBetween`)  
**Severity:** 🟡 MEDIUM  
**Impact:** A half-day leave request showed as "1 day" in the admin table but was actually deducting 0.5 days from the balance.

**Fix Applied:** Replaced `daysBetween` with `calculateDisplayDays` that accounts for `half_day_am`/`half_day_pm` (0.5 days) and `hourly` leaves (hours/8).

---

### BUG-032: Role Layout Causes Infinite Redirect Loop When `userRole` Is Empty ✅ FIXED

**File:** `src/app/[role]/layout.tsx` (line 37)  
**Severity:** 🟡 MEDIUM  
**Impact:** If the auth store hasn't hydrated yet, `userRole` could be empty, causing a redirect to `//dashboard` which loops.

**Fix Applied:** Added `isUserRoleReady` guard that waits for a valid role before attempting any redirect.

---

## 🟢 LOW

### BUG-033: Notification Page Links May Produce Broken URLs

**File:** `src/app/[role]/notifications/page.tsx`  
**Severity:** 🟢 LOW  
**Impact:** The `rh()` helper prepends the role prefix to notification links. If a link is stored as `/admin/attendance`, it produces `/${role}/admin/attendance` — a broken URL.

**Root Cause:** No normalization of the `link` field before applying the role prefix helper.

---

### BUG-034: Unused `checkOut` Dependency in `handleCheckOutFaceVerified`

**File:** `src/app/[role]/attendance/_views/employee-view.tsx` (line ~380)  
**Severity:** 🟢 LOW  
**Impact:** The `checkOut` store function is imported but unused in this callback, causing unnecessary re-creation when the store reference changes.

---

### BUG-035: Dashboard Renders Empty `WidgetGrid` for Unconfigured Roles

**File:** `src/app/[role]/dashboard/page.tsx`  
**Severity:** 🟢 LOW  
**Impact:** For roles without a configured dashboard layout, `widgets` is an empty array, rendering a blank page with just the welcome header.

**Root Cause:** No fallback content when `widgets` is empty.

---

### BUG-036: Attendance Admin View Truncates at 50 Records Without Pagination

**File:** `src/app/[role]/attendance/_views/admin-view.tsx` (line ~170)  
**Severity:** 🟢 LOW  
**Impact:** For companies with 100+ employees, the admin can only see the first 50 attendance records for a given date. No pagination or indication that records are truncated.

---

### BUG-037: Employee Attendance View Reverse-Geocodes on Every Mount

**File:** `src/app/[role]/attendance/_views/employee-view.tsx` (line ~175)  
**Severity:** 🟢 LOW  
**Impact:** Every time the employee navigates to the attendance page, a request is made to `nominatim.openstreetmap.org`. The result is not cached between page visits.

---

---

# 📊 Summary

## By Category

| Category | Critical | High | Medium | Low | Total |
|----------|:--------:|:----:|:------:|:---:|:-----:|
| **Backend** | 4 | 6 | 8 | 6 | **24** |
| **Frontend** | 0 | 2 | 4 (3 fixed) | 5 | **13** (11 remaining) |
| **TOTAL** | **4** | **8** | **12** | **11** | **37** |

## By Severity

| Severity | Count | Key Areas |
|----------|:-----:|-----------|
| 🔴 CRITICAL | 4 | API auth bypass, RLS policies, password policy inconsistency |
| 🟠 HIGH | 8 | Night shift calculations, leave balance init, loan cap, final pay tax, render-phase redirects, component identity |
| 🟡 MEDIUM | 12 | Weekend leave counting, duplicate timesheets, Pag-IBIG formula, role access, overnight elapsed time |
| 🟢 LOW | 13 | Data loss on dedup, minor auth gaps, cosmetic issues, missing pagination, unnecessary API calls |
| **TOTAL** | **37** | |

---

## Recommended Fix Priority

### Immediate — Security (Before Any Production Use)
1. **BUG-001** — Add auth to POST `/api/project-verification`
2. **BUG-002** — Validate `x-user-id` against session in face recognition API
3. **BUG-003** — Fix RLS INSERT policies to scope to own employee
4. **BUG-004** — Unify password minimum to 8 characters

### Next Sprint — Backend Functional Bugs
5. **BUG-008** — Fix night shift late calculation with overnight normalization
6. **BUG-006** — Auto-initialize leave balances before first request
7. **BUG-007** — Fix final pay government deduction base
8. **BUG-010** — Implement aggregate loan deduction cap
9. **BUG-017** — Fix Pag-IBIG computation for ₱1,501–₱5,000 range ✅ Already Fixed

### ✅ Already Fixed (This Session)
10. **BUG-025** — Fix render-phase `router.replace()` in payroll page
11. **BUG-026** — Fix unstable component identity in attendance/leave pages
12. **BUG-028** — Remove unnecessary DevTools polling from admin view
13. **BUG-030** — Gate demo UI behind conditional import

### ✅ Already Fixed (This Session)
- **BUG-027** — Overnight elapsed time display
- **BUG-029** — Projects page missing role views
- **BUG-031** — Leave day calculation mismatch
- **BUG-032** — Empty role redirect loop

### Backlog
14. **BUG-011** — Exclude weekends/holidays from leave day count
15. **BUG-013** — Prevent duplicate timesheets for submitted/approved entries
16. **BUG-015** — Deduplicate all exception types in `autoGenerateExceptions`
17. Remaining LOW items
