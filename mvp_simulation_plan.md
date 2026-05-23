# 🇵🇭 NexHRMS – MVP Simulation Plan
### Based on: `finalprojectplan.md` | Stack: Next.js · Zustand · localStorage · No backend

> **Goal:** Simulate the full enterprise HRMS workflow for demo/testing purposes.
> Every feature maps to a production concept but is implemented in-memory with seed data.

---

## Simulation Ground Rules

| Production | MVP Simulation |
|------------|----------------|
| PostgreSQL database | Zustand stores + `localStorage` (persisted via `zustand/middleware/persist`) |
| Real backend API | In-memory store actions |
| Multi-tenant | Single hardcoded "NexHRMS Inc." tenant |
| Real auth/JWT | Demo user switching (Admin / HR / Finance / Employee) |
| Real email | Mock `sendNotification()` → logged to `notifications.store` |
| PDF generation | Text-based payslip detail dialog |
| Object storage | Mock document upload (filename + timestamp, no actual file) |
| Device binding | Simulated (no enforcement) |
| QR tokens | Simulated with `nanoid()` token expiry at 30s |
| Face recognition | Simulated progress bar → returns `faceVerified: true` |
| Geofence | Real `navigator.geolocation` + Haversine formula |

---

## 1️⃣ Roles & Access (Simplified RBAC)

### MVP Roles (4 Demo Users)

| Role | Demo User | Can Do |
|------|-----------|--------|
| Admin | Alex Rivera | Everything |
| HR | Jordan Lee | Employees, Attendance, Leave |
| Finance | Morgan Chen | Payroll only |
| Employee | Sam Torres | Self check-in, own payslips/leave |

### Implementation
- `useAuthStore` — stores `currentUser` with `role`
- Role-gated UI components (`isAdmin`, `canIssue`, `isEmployee`)
- **NOT simulated:** permission groups, custom roles, auditor role

---

## 2️⃣ Organization (Stub)

### MVP Data Model (Single Object in Settings)

```ts
// nexhrms-org-settings (localStorage)
{
  companyName: "NexHRMS Inc.",
  industry: "technology",
  emailAbsenceAlerts: true,
  emailLeaveUpdates: true,
  emailPayrollAlerts: true,
}
```

- **Simulated:** company name, industry, notification toggles
- **NOT simulated:** branches, cost centers, work sites, multi-tenant

---

## 3️⃣ Employee Profiles

### MVP Data Model (`employees` in Zustand)

```ts
interface Employee {
  id: string;               // EMP001–EMP026
  name, email, phone
  role, department
  status: "active" | "inactive"
  workType: "WFH" | "WFO" | "HYBRID"
  salary: number            // Annual
  joinDate, birthday
  teamLeader?: string       // References another EMP id
  location: string
}
```

### Simulated Features
- ✅ Add Employee (form → store action)
- ✅ Edit Employee (pre-filled dialog)
- ✅ Toggle status active/inactive
- ✅ Delete Employee (inactive only, with AlertDialog)
- ✅ Documents tab (mock upload — name + timestamp only)
- ✅ Attendance history tab (from `attendance.store`)
- ✅ Leave history tab (from `leave.store`)
- ✅ Payslip history tab (from `payroll.store`)

### NOT Simulated
- Employee status history / changelog
- Position/cost center hierarchy
- Biometric enrollment

---

## 4️⃣ Projects & Geofencing

### MVP Data Model (`projects` in Zustand)

```ts
interface Project {
  id: string;
  name: string;
  description?: string;
  location: { lat, lng, radius: number }  // meters
  assignedEmployeeIds: string[];
  status?: "active" | "completed" | "on_hold";
  createdAt: string;
}
```

### Simulated Features
- ✅ Create / delete projects with geofence config
- ✅ Assign / remove employees from projects
- ✅ Project status dropdown (Active / Completed / On Hold)
- ✅ Geofence check on check-in (real GPS via `navigator.geolocation` + Haversine)
- ✅ Location snapshot stored on each check-in log

### NOT Simulated
- Multiple geofence polygons per project
- Wi-Fi SSID-based check-in
- Shift templates per project
- Project manpower reports

---

## 5️⃣ Attendance

### MVP Data Model (`attendance.store`)

```ts
interface AttendanceLog {
  id: string;                             // ATT-{date}-{empId}
  employeeId: string;
  date: string;                           // YYYY-MM-DD
  checkIn?: string;                       // HH:MM
  checkOut?: string;
  hours?: number;
  status: "present" | "absent" | "on_leave";
  projectId?: string;
  locationSnapshot?: { lat, lng };
  faceVerified?: boolean;
}
```

### Simulated Features
- ✅ Multi-step check-in: GPS → Geofence → Face sim → `checkIn()` store action
- ✅ Checkout with auto-computed hours
- ✅ Mark Absent (per-row admin action)
- ✅ Reconcile Day (bulk-absent all unrecorded active employees)
- ✅ BellRing → `sendNotification()` absence alert
- ✅ faceVerified ShieldCheck badge in table
- ✅ Date + employee filters
- ✅ Leave → Attendance sync (approval sets days to `on_leave`)

### Simulated Verification Flow
```
Step 1: navigator.geolocation → GPS coordinates
Step 2: Haversine distance check vs. project radius
Step 3: FaceRecognitionSimulator (animated progress bar, 2.5s)
Step 4: checkIn() + persist locationSnapshot + faceVerified: true
```

### NOT Simulated
- Break events (BREAK_START / BREAK_END)
- Overtime approval workflow
- Timesheet computed segments
- Late / undertime minutes calculation
- QR token generation / scanning
- Device binding
- Mock location detection

---

## 6️⃣ Leave Management

### MVP Data Model (`leave.store`)

```ts
interface LeaveRequest {
  id: string;
  employeeId: string;
  type: "VL" | "SL" | "EL" | "OTHER";
  startDate, endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
}
```

### Leave Balance Config (Hardcoded)

```ts
const LEAVE_ALLOC = { VL: 15, SL: 10, EL: 5, OTHER: 5 }; // days/year
```

### Simulated Features
- ✅ Submit leave request (employee or admin on behalf)
- ✅ Approve / reject with reviewer ID + timestamp
- ✅ Leave balance cards (VL/SL/EL/Other) with progress bars
- ✅ Days column auto-computed (inclusive day count)
- ✅ Employee sees only own requests
- ✅ Leave approval syncs attendance logs to `on_leave` status
- ✅ Status filter (All / Pending / Approved / Rejected)

### NOT Simulated
- Half-day or hourly leave
- Leave carry-forward
- Leave encashment
- PH statutory leave types (Solo Parent, Maternity, Paternity)
- Leave policy versioning

---

## 7️⃣ Payroll Engine (PH-Aware Simulation)

### MVP Data Model (`payroll.store`)

```ts
interface Payslip {
  id: string;
  employeeId: string;
  periodStart, periodEnd: string;
  netPay: number;
  issuedAt: string;
  status: "pending" | "confirmed";
  confirmedAt?: string;
  notes?: string;
}
```

### PH Government Deductions (Simulated as Static 2025 Rates)

Store these as constants — not in a versioned DB table:

```ts
// Simulated 2025 rates
const PH_DEDUCTIONS = {
  SSS: (gross) => Math.min(1125, gross * 0.045),         // ~4.5% employee share
  PhilHealth: (gross) => Math.min(2250, gross * 0.025),  // 2.5% employee share
  PagIBIG: () => 100,                                     // Fixed ₱100
  withholdingTax: (gross) => computeTaxBracket(gross),   // 2023 TRAIN Law brackets
};
```

### Payroll Breakdown Fields (in Issue Dialog)

| Field | Source |
|-------|--------|
| Gross Pay | Auto-populated from `employee.salary / 12` |
| Allowances | Manual input |
| SSS | Auto-computed from gross |
| PhilHealth | Auto-computed from gross |
| Pag-IBIG | Fixed ₱100 |
| Withholding Tax | TRAIN Law bracket |
| Net Pay | Gross + Allowances − all deductions |

### 13th Month Pay
- Button in Payroll Runs tab: "Generate 13th Month" → issues payslip with `notes: "13th Month Pay"` computed as `(monthly_gross * 12) / 12 = 1 month basic`

### Simulated Features
- ✅ Issue Payslip with pay breakdown (Gross / Allowances / Deductions / Net)
- ✅ Auto-populate monthly gross from employee salary
- ✅ Confirm Payslip (locks it)
- ✅ Payroll Runs tab (grouped by `issuedAt`)
- ✅ Eye icon → payslip detail dialog
- ✅ Employee sees only own payslips

### NOT Simulated
- Semi-monthly cutoff automation (1–15, 16–EOM)
- Payroll run locking mechanism
- Policy snapshot JSON
- Bank file export (CSV stub only)
- Payslip PDF with embedded signature
- Loan deduction integration

### WILL ADD (Next Iterations)
- [ ] PH deduction auto-computation in the Issue dialog
- [ ] 13th month pay trigger button
- [ ] Payroll run lock toggle (prevents further editing)

---

## 8️⃣ Loans / Cash Advance (Planned — Not Yet Built)

### MVP Simulation Plan

```ts
// loans.store.ts
interface Loan {
  id: string;
  employeeId: string;
  amount: number;
  remainingBalance: number;
  monthlyDeduction: number;
  status: "active" | "settled" | "frozen";
  approvedBy: string;
  createdAt: string;
}
```

Simulate:
- Admin creates loan for employee
- Remaining balance shown on employee profile
- Manual "Deduct from next payslip" button (reduces balance, adds deduction line to next payslip issue)
- NOT simulated: auto-deduction, carry-forward, interest

---

## 9️⃣ Notifications (Mock Email Log)

### MVP Data Model (`notifications.store`)

```ts
interface NotificationLog {
  id: string;
  employeeId: string;
  type: "assignment" | "reassignment" | "absence";
  subject, body: string;
  sentAt: string;
}
```

### Simulated Features
- ✅ Absence alerts triggered from BellRing button in attendance
- ✅ Project assignment/reassignment notifications
- ✅ Notification log page with type badges + timestamp
- ✅ Bell badge in topbar showing count, navigates to `/notifications`
- ✅ Clear All button

### NOT Simulated
- Real email delivery
- Leave approval email to requester
- Payslip published email
- In-app push notifications

---

## 🔟 Reports (Stub Level)

### Currently Available
- Attendance table with date/employee filters
- Leave requests table with status filter
- Payroll runs summary (grouped totals)
- Employee list with sort/filter/paginate

### WILL ADD (Stub Pages)

| Report | Implementation |
|--------|---------------|
| Payroll Register | Table: all payslips for period, totals row |
| SSS/PhilHealth/Pag-IBIG Summary | Computed from payslips in selected period |
| Absence Report | Filter `attendance.store` for `status === "absent"` |
| Late Report | Filter for `late_minutes > 0` (needs late field added) |
| 13th Month Accrual | Computed: `(monthly_basic * months_worked) / 12` |

---

## 🗂️ Zustand Stores Summary

| Store | Key | Contents |
|-------|-----|----------|
| `auth.store` | `nexhrms-auth` | currentUser, theme |
| `employees.store` | `nexhrms-employees` | 26 seed employees |
| `attendance.store` | `nexhrms-attendance` | logs (append-like) |
| `leave.store` | `nexhrms-leave` | leave requests |
| `payroll.store` | `nexhrms-payroll` | payslips |
| `projects.store` | `nexhrms-projects` | projects + assignments |
| `events.store` | `nexhrms-events` | calendar events |
| `notifications.store` | `nexhrms-notifications` | mock email log |
| `ui.store` | `nexhrms-ui` | sidebar open state |
| `settings` | `nexhrms-org-settings` | raw localStorage (not Zustand) |

---

## 🛣️ MVP Roadmap — Prioritized

### ✅ Done (Current State)
- Employee CRUD (Add / Edit / Delete / Toggle Status)
- Attendance: check-in with GPS + face sim, check-out, mark absent, reconcile day
- Leave: balance cards, submit + approve/reject, attendance sync
- Payroll: issue payslip with breakdown, confirm, payroll runs tab, payslip detail
- Dashboard: 5 KPI cards, charts, events widget, birthdays
- Notifications: mock email log + topbar bell badge
- Settings: org fields + notification toggles → localStorage
- Projects: CRUD + geofence + assign employees + status
- 404 page, role-gated pages

### 🔲 Next Iteration (Priority Order)
1. **PH deductions auto-compute** in payslip issue dialog (SSS, PhilHealth, Pag-IBIG, Tax)
2. **Loans / Cash Advance module** (store + page + profile integration)
3. **Payroll run lock** (toggle that prevents further changes to a run)
4. **13th Month Pay button** in Payroll page
5. **Reports page** with Payroll Register + Government deduction summaries
6. **Late minutes field** on `AttendanceLog` (computed from shift start vs. check-in)
7. **Shift templates** (hardcoded: Day shift 8AM–5PM, Night shift 10PM–6AM)
8. **Payslip PDF simulation** (html-to-image or `react-pdf` — lightweight)
9. **Signature pad on payslip** (`react-signature-canvas` → stores as dataURL)
10. **QR token simulation** (nanoid + 30s countdown display on kiosk screen)

---

> **This plan intentionally excludes:** real database, real auth, real email, multi-tenancy, mobile app, backend API, encryption, and all production security controls.
> Those belong to the **`finalprojectplan.md`** enterprise blueprint.
