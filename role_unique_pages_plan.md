# Role-Unique Pages Plan — NexHRMS

> **Goal:** Every page must deliver a **unique, purpose-built experience per role** instead of sharing a single monolithic component with `isAdmin`/`isEmployee` if-else branching.

---

## 1. System Roles Reference

| # | Role | Slug | Purpose |
|---|------|------|---------|
| 1 | Admin | `admin` | Full system owner — all modules, all data |
| 2 | HR | `hr` | People operations — employees, attendance, leave, onboarding |
| 3 | Finance | `finance` | Monetary oversight — payroll, loans, salary approvals |
| 4 | Payroll Admin | `payroll_admin` | Payroll processing specialist — runs, payslips, deductions |
| 5 | Supervisor | `supervisor` | Team lead — attendance, leave, timesheets for direct reports |
| 6 | Employee | `employee` | Self-service — own attendance, leave, payslips, loans |
| 7 | Auditor | `auditor` | Read-only compliance — audit logs, reports |

---

## 2. Current State — Full Page Audit

### Legend
- 🔴 **Major Reuse** — Two completely different UIs crammed into one file with heavy branching
- 🟡 **Moderate Reuse** — Same layout but with conditionally hidden/shown sections
- 🟢 **Clean** — Already properly role-gated or acceptably differentiated

| Page | File | Size | Status | Issue |
|------|------|------|--------|-------|
| `/attendance` | `attendance/page.tsx` | 1918 lines | 🔴 | Admin table + Employee personal dashboard in one file |
| `/payroll` | `payroll/page.tsx` | 1160 lines | 🔴 | Full payroll management + Employee payslip viewer in one file |
| `/settings` | `settings/page.tsx` | 1295 lines | 🔴 | Super-admin controls + basic theme toggle mixed; hard `role === "admin"` check |
| `/employees/manage` | `employees/manage/page.tsx` | 1099 lines | 🟡 | Admin CRUD vs read-only supervisor; salary logic branches |
| `/employees/[id]` | `employees/[id]/page.tsx` | 527 lines | 🔴 | **Security:** Salary/payslips/loans shown to ALL roles without permission checks |
| `/leave` | `leave/page.tsx` | 482 lines | 🟡 | Employee own-requests vs admin all-requests; HR = Supervisor = Admin view |
| `/reports` | `reports/page.tsx` | 531 lines | 🟡 | Gov compliance tab visible to roles without `reports:government` |
| `/timesheets` | `timesheets/page.tsx` | 585 lines | 🟡 | Misleading var names; all viewer roles get identical experience |
| `/loans` | `loans/page.tsx` | 481 lines | 🟡 | `loans:view_own` exists but no employee self-service view |
| `/kiosk` | `kiosk/page.tsx` | 353 lines | 🟡 | No page-level role guard; uses `currentUser.id` |
| `/dashboard` | `dashboard/page.tsx` | ~400 lines | 🟢 | Widget layout is data-driven per role — clean |
| `/notifications` | `notifications/page.tsx` | 180 lines | 🟢 | Clean role gate |
| `/audit` | `audit/page.tsx` | 240 lines | 🟢 | Clean role gate — admin & auditor identical read-only |
| `/projects` | `projects/page.tsx` | 300 lines | 🟢 | Clean — admin & HR only |
| `/employees/directory` | `employees/directory/page.tsx` | 232 lines | 🟢 | Clean salary-gated cards |

---

## 3. Architecture — Role-View Component Pattern

### Pattern: View Dispatcher + Role Views

Each page becomes a thin **dispatcher** that resolves the user's role and renders the correct **role view** component. No if-else branching in the dispatcher.

```
src/app/attendance/
  page.tsx                  ← dispatcher (10 lines)
  _views/
    admin-view.tsx          ← admin: full management table
    hr-view.tsx             ← HR: management table + onboarding context
    supervisor-view.tsx     ← supervisor: team-only attendance
    employee-view.tsx       ← employee: personal dashboard
```

**Dispatcher pattern:**
```tsx
// page.tsx
"use client";
import { useAuthStore } from "@/store/auth.store";
import { AdminAttendanceView } from "./_views/admin-view";
import { HRAttendanceView } from "./_views/hr-view";
import { SupervisorAttendanceView } from "./_views/supervisor-view";
import { EmployeeAttendanceView } from "./_views/employee-view";

const VIEW_MAP: Record<string, React.ComponentType> = {
  admin: AdminAttendanceView,
  hr: HRAttendanceView,
  supervisor: SupervisorAttendanceView,
  employee: EmployeeAttendanceView,
};

export default function AttendancePage() {
  const role = useAuthStore((s) => s.currentUser.role);
  const View = VIEW_MAP[role];
  if (!View) return <AccessDenied />;
  return <View />;
}
```

### Shared Components (reusable building blocks, NOT full pages)
Shared sub-components live in `src/components/` and are imported by multiple views:
- `<AttendanceLogTable />` — used by admin, HR, supervisor views (with different data filters)
- `<LeaveRequestCard />` — used by all leave views
- `<PayslipCard />` — used by payroll admin view and employee view
- `<SalaryEditor />` — used by admin and finance views

---

## 4. Per-Page Redesign Plan

### 4.1 `/attendance` — 🔴 PRIORITY 1

**Current:** 1918-line single file. Employee sees personal dashboard; admin/HR/supervisor see management table.

**New structure:**
```
src/app/attendance/
  page.tsx                          ← role dispatcher
  _views/
    admin-view.tsx                  ← full management: all-employee logs, mark absent,
                                     import/export CSV, override records, holidays CRUD,
                                     exceptions, OT approve/reject, penalty management
    hr-view.tsx                     ← same as admin MINUS: danger-zone reset,
                                     PLUS: onboarding attendance alerts, scheduled
                                     absence tracking, policy enforcement warnings
    supervisor-view.tsx             ← team-only: filter to direct reports only,
                                     approve OT for team, view team attendance stats,
                                     no CSV import, no holidays CRUD, no exceptions tab
    employee-view.tsx               ← personal dashboard: hero card, check-in/out,
                                     geolocation + face-rec + selfie flow, break timer,
                                     penalty banner, weekly stats, recent logs,
                                     OT request submission (own only)
  _components/
    attendance-log-table.tsx        ← shared table component (used by admin/hr/supervisor)
    check-in-flow.tsx               ← check-in dialog (used by employee view)
    overtime-section.tsx            ← OT requests section (shared, filtered by role)
    holiday-manager.tsx             ← holiday CRUD (admin/hr only)
    exception-list.tsx              ← exception viewer (admin/hr only)
```

**What makes each view unique:**

| Feature | Admin | HR | Supervisor | Employee |
|---------|-------|----|------------|----------|
| See all employees | ✅ | ✅ | ❌ team only | ❌ self only |
| Mark absent | ✅ | ✅ | ❌ | ❌ |
| Override records | ✅ | ✅ | ❌ | ❌ |
| Import/Export CSV | ✅ | ✅ | ❌ | ❌ |
| Manage holidays | ✅ | ✅ | ❌ | ❌ |
| View exceptions | ✅ | ✅ | ❌ | ❌ |
| Approve OT | ✅ | ✅ | ✅ (team) | ❌ |
| Reset data | ✅ | ❌ | ❌ | ❌ |
| Personal check-in | ❌ | ❌ | ❌ | ✅ |
| Break timer | ❌ | ❌ | ❌ | ✅ |
| Penalty banner | ❌ | ❌ | ❌ | ✅ |
| Submit OT request | ❌ | ❌ | ❌ | ✅ |
| Team attendance stat cards | ❌ | ❌ | ✅ | ❌ |
| Absence policy warnings | ❌ | ✅ | ❌ | ❌ |

---

### 4.2 `/payroll` — 🔴 PRIORITY 1

**Current:** 1160-line single file. Employee sees own payslips; admin/finance/payroll_admin see full management.

**New structure:**
```
src/app/payroll/
  page.tsx                          ← role dispatcher
  _views/
    admin-view.tsx                  ← full payroll: issue payslips, bulk runs,
                                     lock/publish/pay, adjustments, final pay,
                                     13th month, bank file export, manage pay schedule
    finance-view.tsx                ← same as admin MINUS: pay schedule config,
                                     PLUS: budget analysis summary, deduction
                                     verification panel, gov remittance tracker
    payroll-admin-view.tsx          ← processing focus: issue payslips, bulk compute,
                                     lock runs, deduction breakdown, NO adjustment
                                     approval, NO final pay issuance
    employee-view.tsx               ← self-service: view published payslips,
                                     sign/acknowledge, download PDF, YTD earnings
                                     summary, deduction history chart
  _components/
    payslip-table.tsx               ← shared payslip list (filtered by role)
    payslip-detail-dialog.tsx       ← shared detail dialog
    adjustment-panel.tsx            ← admin/finance only
    final-pay-section.tsx           ← admin only
    payslip-sign-pad.tsx            ← employee only
```

**What makes each view unique:**

| Feature | Admin | Finance | Payroll Admin | Employee |
|---------|-------|---------|---------------|----------|
| Issue payslips | ✅ | ✅ | ✅ | ❌ |
| Lock/publish runs | ✅ | ✅ | ✅ | ❌ |
| Adjustments CRUD | ✅ | ✅ | ❌ | ❌ |
| Final pay | ✅ | ❌ | ❌ | ❌ |
| 13th month | ✅ | ✅ | ✅ | ❌ |
| Bank file export | ✅ | ✅ | ✅ | ❌ |
| Pay schedule config | ✅ | ❌ | ❌ | ❌ |
| Budget analysis | ❌ | ✅ | ❌ | ❌ |
| Gov remittance tracker | ❌ | ✅ | ❌ | ❌ |
| View own payslips | ❌ | ❌ | ❌ | ✅ |
| Sign/acknowledge | ❌ | ❌ | ❌ | ✅ |
| YTD earnings chart | ❌ | ❌ | ❌ | ✅ |

---

### 4.3 `/settings` — 🔴 PRIORITY 1

**Current:** 1295-line file. Hard `role === "admin"` check. Mixes super-admin controls with basic user preferences.

**New structure:**
```
src/app/settings/
  page.tsx                          ← role dispatcher
  _views/
    admin-view.tsx                  ← full settings hub: all sub-page links,
                                     user account management, attendance rules,
                                     pay schedule, danger zone, organization
    hr-view.tsx                     ← HR settings: organization, shifts, attendance
                                     rules, pay schedule. NO user management,
                                     NO danger zone, NO page builder, NO roles
    employee-view.tsx               ← personal preferences: theme toggle, password
                                     change, notification preferences, language
    default-view.tsx                ← for finance/supervisor/payroll_admin/auditor:
                                     theme + password only (same as employee but
                                     could include role-specific quick links)
```

**Critical fix:** Remove `role === "admin"` hard check. Use `settings:roles`, `settings:page_builder` etc. for granular permission gating.

---

### 4.4 `/employees/[id]` — 🔴 SECURITY FIX

**Current:** Salary, payslips, and loans are displayed to ALL roles that access the profile page — no permission checks.

**New structure:**
```
src/app/employees/[id]/
  page.tsx                          ← role-aware profile with permission-gated tabs
  _views/
    full-profile.tsx                ← admin/HR: all tabs, edit capability
    finance-profile.tsx             ← finance: overview + salary + payslips tabs only
    readonly-profile.tsx            ← supervisor/auditor: overview + attendance + leave only
    self-profile.tsx                ← employee viewing own profile: all own data,
                                     no edit, no other employees
```

**Permission fixes:**

| Tab | Required Permission | Visible To |
|-----|-------------------|------------|
| Overview (basic) | `employees:view` | all with access |
| Salary | `employees:view_salary` | admin, hr, finance, payroll_admin |
| Payslips | `payroll:view_all` or own ID | admin, finance, payroll_admin, self |
| Loans | `loans:view_all` or own ID | admin, finance, self |
| Edit button | `employees:edit` | admin, hr |
| Attendance | `attendance:view_all` or own ID | admin, hr, supervisor, self |
| Leave | `leave:view_all` or own ID | admin, hr, supervisor, self |

---

### 4.5 `/leave` — 🟡 PRIORITY 2

**Current:** Employee sees own requests; admin/HR/supervisor see all requests + approve. HR and Supervisor views are identical.

**New structure:**
```
src/app/leave/
  page.tsx                          ← role dispatcher
  _views/
    admin-view.tsx                  ← all requests + approve/reject + policies CRUD
                                     + file on behalf + org-wide balances + reports
    hr-view.tsx                     ← all requests + approve/reject + policies CRUD
                                     + onboarding leave setup + balance adjustment
    supervisor-view.tsx             ← team-only requests + approve/reject (team),
                                     NO policies tab, team leave calendar, coverage
                                     warnings ("3 people on leave this Friday")
    employee-view.tsx               ← own requests + submit new + personal balance
                                     cards + leave calendar (own), upcoming holidays
```

**What makes Supervisor unique vs HR:**

| Feature | HR | Supervisor |
|---------|-----|------------|
| See all employees | ✅ | ❌ team only |
| Manage policies | ✅ | ❌ |
| Adjust balances | ✅ | ❌ |
| Team coverage warnings | ❌ | ✅ |
| Team leave calendar | ❌ | ✅ |

---

### 4.6 `/employees/manage` — 🟡 PRIORITY 2

**New structure:**
```
src/app/employees/manage/
  page.tsx                          ← role dispatcher
  _views/
    admin-view.tsx                  ← full CRUD + salary (direct set) + proposals
                                     approve/reject + project assignment + resign
    hr-view.tsx                     ← full CRUD + salary (propose only, not direct)
                                     + onboarding workflow + document management
    finance-view.tsx                ← read-only list + salary (direct set / approve)
                                     + compensation analysis, NO employee CRUD
    supervisor-view.tsx             ← team roster (read-only) + view team member
                                     details, NO salary, NO CRUD, team directory card
```

---

### 4.7 `/reports` — 🟡 PRIORITY 2

**New structure:**
```
src/app/reports/
  page.tsx                          ← role dispatcher
  _views/
    admin-view.tsx                  ← all reports: payroll register, gov deductions,
                                     absence, late, gov compliance (SSS/PhilHealth/
                                     Pag-IBIG/BIR)
    hr-view.tsx                     ← attendance reports: absence, late, headcount,
                                     turnover. NO government compliance tab
    finance-view.tsx                ← financial reports: payroll register, gov
                                     deductions, gov compliance + budget variance
    payroll-admin-view.tsx          ← payroll reports: payroll register, gov
                                     deductions, gov compliance
    auditor-view.tsx                ← read-only all reports + compliance dashboard
                                     + data integrity checker
```

**Permission fix:** Gate government compliance tab behind `reports:government` — remove it from HR view.

---

### 4.8 `/loans` — 🟡 PRIORITY 2

**New structure:**
```
src/app/loans/
  page.tsx                          ← role dispatcher
  _views/
    admin-view.tsx                  ← full management: create, deduct, settle,
                                     freeze/unfreeze, cancel, approve. All loans
    finance-view.tsx                ← same as admin — full management + approve
    payroll-admin-view.tsx          ← view all + deduct (scheduled), NO create,
                                     NO approve, NO settle/cancel
    employee-view.tsx               ← NEW: self-service view — own active loans,
                                     remaining balance, repayment schedule,
                                     deduction history, request new loan (pending
                                     approval)
```

**New feature:** Employee loan self-service — uses existing `loans:view_own` permission that's defined but never implemented.

---

### 4.9 `/timesheets` — 🟡 PRIORITY 3

**New structure:**
```
src/app/timesheets/
  page.tsx                          ← role dispatcher
  _views/
    admin-view.tsx                  ← all employees, compute, bulk compute,
                                     approve/reject, manage rule sets
    hr-view.tsx                     ← all employees, compute, approve/reject,
                                     integrate with leave for absent-day handling
    supervisor-view.tsx             ← team only, compute, approve/reject for
                                     team, team hours summary card
    payroll-admin-view.tsx          ← all employees (read-only + compute),
                                     NO approve — verification before payroll
```

---

### 4.10 `/kiosk` — 🟡 PRIORITY 3

**Changes needed:**
- Add page-level permission guard (`page:kiosk`) →  deny access for unauthorized roles
- Kiosk should NOT use `currentUser.id` for attendance events — the kiosk is a shared terminal where employees identify via PIN/QR
- When an employee enters their PIN, resolve their employee ID from the PIN and use that for `appendEvent`

---

## 5. Shared Components Library

These are **building-block components** (not full pages) that multiple role views import:

| Component | Location | Used By |
|-----------|----------|---------|
| `AttendanceLogTable` | `src/components/attendance/log-table.tsx` | admin, hr, supervisor attendance views |
| `CheckInFlow` | `src/components/attendance/check-in-flow.tsx` | employee attendance view |
| `OvertimeRequestList` | `src/components/attendance/overtime-list.tsx` | all attendance views (filtered) |
| `HolidayManager` | `src/components/attendance/holiday-manager.tsx` | admin, hr attendance views |
| `PayslipTable` | `src/components/payroll/payslip-table.tsx` | all payroll views |
| `PayslipDetail` | `src/components/payroll/payslip-detail.tsx` | all payroll views |
| `AdjustmentPanel` | `src/components/payroll/adjustment-panel.tsx` | admin, finance payroll views |
| `LeaveRequestCard` | `src/components/leave/request-card.tsx` | all leave views |
| `LeavePolicyEditor` | `src/components/leave/policy-editor.tsx` | admin, hr leave views |
| `EmployeeTable` | `src/components/employees/employee-table.tsx` | admin, hr, finance employee views |
| `SalaryEditor` | `src/components/employees/salary-editor.tsx` | admin, finance, hr employee views |
| `LoanCard` | `src/components/loans/loan-card.tsx` | all loan views |
| `TimesheetTable` | `src/components/timesheets/timesheet-table.tsx` | all timesheet views |
| `AccessDenied` | `src/components/ui/access-denied.tsx` | all dispatchers (fallback) |
| `RoleViewDispatcher` | `src/components/ui/role-dispatcher.tsx` | all page dispatchers |

---

## 6. Implementation Phases

### Phase 1 — Security Fixes (IMMEDIATE)
1. **`/employees/[id]`** — Add permission checks for salary, payslips, loans tabs
2. **`/reports`** — Gate government compliance tab behind `reports:government`
3. **`/settings`** — Replace `role === "admin"` with proper permission checks
4. **`/kiosk`** — Add page-level permission guard

### Phase 2 — Major Splits (CORE)
5. **`/attendance`** — Split into 4 role views + shared components
6. **`/payroll`** — Split into 4 role views + shared components
7. **`/settings`** — Split into admin/hr/employee views

### Phase 3 — Moderate Splits
8. **`/leave`** — Split into 4 role views (add supervisor team calendar)
9. **`/employees/manage`** — Split into 4 role views
10. **`/employees/[id]`** — Split into 4 role views (after security fix)
11. **`/loans`** — Add employee self-service view

### Phase 4 — Polish
12. **`/reports`** — Split into 5 role views
13. **`/timesheets`** — Split into 4 role views
14. **`/kiosk`** — Fix PIN-based employee resolution

### Phase 5 — Testing & Verification
15. Create `RoleViewDispatcher` utility component
16. Create `AccessDenied` shared component
17. Login as each role and verify every page renders the correct view
18. Verify no permission leaks (salary, payslips, loans data)
19. Build verification — all routes compile clean

---

## 7. `RoleViewDispatcher` — Utility Component

A reusable dispatcher component that every page can use:

```tsx
// src/components/ui/role-dispatcher.tsx
"use client";

import { useAuthStore } from "@/store/auth.store";
import { AccessDenied } from "./access-denied";

interface RoleViewDispatcherProps {
  views: Partial<Record<string, React.ComponentType>>;
  fallback?: React.ComponentType;
}

export function RoleViewDispatcher({ views, fallback: Fallback = AccessDenied }: RoleViewDispatcherProps) {
  const role = useAuthStore((s) => s.currentUser.role);
  const View = views[role];
  if (!View) return <Fallback />;
  return <View />;
}
```

Usage:
```tsx
// src/app/attendance/page.tsx
import { RoleViewDispatcher } from "@/components/ui/role-dispatcher";
import { AdminView } from "./_views/admin-view";
import { HRView } from "./_views/hr-view";
import { SupervisorView } from "./_views/supervisor-view";
import { EmployeeView } from "./_views/employee-view";

export default function AttendancePage() {
  return (
    <RoleViewDispatcher views={{
      admin: AdminView,
      hr: HRView,
      supervisor: SupervisorView,
      employee: EmployeeView,
    }} />
  );
}
```

---

## 8. File Count Estimate

| Phase | New Files | Modified Files |
|-------|-----------|---------------|
| Phase 1 (Security) | 1 | 4 |
| Phase 2 (Major Splits) | ~18 view files + ~10 shared components | 3 page.tsx dispatchers |
| Phase 3 (Moderate Splits) | ~14 view files + ~5 shared components | 4 page.tsx dispatchers |
| Phase 4 (Polish) | ~9 view files | 2 page.tsx dispatchers |
| Phase 5 (Testing) | 2 utility components | — |
| **Total** | **~59 new files** | **~13 modified** |

---

## 9. Key Principles

1. **No `isAdmin` in page files** — role branching lives ONLY in the dispatcher
2. **No `role === "admin"` hard checks** — always use `hasPermission(role, perm)`
3. **Shared components ≠ shared pages** — a `<PayslipTable>` component is reusable; a `/payroll/page.tsx` is NOT
4. **Supervisor ≠ HR ≠ Admin** — each sees only their scope (team vs department vs all)
5. **Employee always gets self-service** — never sees other employees' data
6. **`_views/` folder convention** — underscore prefix prevents Next.js from treating it as a route
7. **Data filtering at the view level** — each view applies its own data scope (team, self, all)

---

## 10. Migration Strategy

For each page being split:

1. **Create `_views/` folder** with role-specific view files
2. **Extract shared UI** into `_components/` or `src/components/`
3. **Move existing code** into the appropriate view file (e.g., admin gets the management table, employee gets the dashboard)
4. **Replace page.tsx** with a thin dispatcher
5. **Test each role** by logging in as that role and verifying the correct view loads
6. **Delete dead code** — remove all `isAdmin`, `isEmployee`, `canManage` branching from the old monolithic file

---

*Created: February 27, 2026*
*Prepared for: NexHRMS — Role-Unique Page Architecture*
