# NexHRMS — System Overview

A Philippine-compliant Human Resource Management System built with Next.js 16, React 19, TypeScript 5, Zustand 5, and Tailwind v4. All data is stored in the browser via `localStorage` (Zustand `persist`).

---

## Demo Accounts

| Name | Role | Email |
|---|---|---|
| Alex Rivera | **Admin** | admin@nexhrms.com |
| Jordan Lee | **HR** | hr@nexhrms.com |
| Morgan Chen | **Finance** | finance@nexhrms.com |
| Sam Torres | **Employee** | employee@nexhrms.com |
| Olivia Harper | **Employee** | olivia@nexhrms.com |

---

## Roles & What Each User Can Do

### 🔴 Admin
Full access to every page and action in the system.

| Capability | Details |
|---|---|
| Employee management | Add, edit, activate/deactivate employees; upload documents |
| Attendance | View all employee logs; approve/reject overtime; manage shifts |
| Leave | Approve or reject leave requests for any employee |
| Payroll | Issue payslips, set custom issue date, confirm payslips, lock payroll runs, generate 13th Month Pay, export bank file |
| Loans | Grant loans, freeze/unfreeze, view all active/settled loans |
| Reports | View workforce analytics (headcount, productivity, turnover, department breakdown) |
| Gov Reports | View SSS, PhilHealth, Pag-IBIG, and BIR/tax contribution tables |
| Settings | Configure org profile, working hours, geofence policies |
| Org Structure | Visualise the team hierarchy |
| Shifts | Create and assign shift templates (start/end time, grace period, break duration) |
| Notifications | View and manage system-wide HR notifications |
| Directory | Browse all employees; set annual salary for any employee |
| Projects | Create projects and assign employees |
| Reset | Reset Attendance and Payroll pages back to demo seed state |

---

### 🟠 HR
Focused on people operations — no access to payroll, loans, or finance reports.

| Capability | Details |
|---|---|
| Employee management | Add, edit, activate/deactivate employees; upload documents |
| Attendance | View all logs; approve/reject overtime; manage shifts |
| Leave | Approve or reject leave requests |
| Reports | Workforce analytics (headcount, productivity, turnover) |
| Org Structure | Visualise team hierarchy |
| Shifts | Create and assign shift templates |
| Notifications | View HR notifications |
| Directory | Browse all employees; set annual salary |
| Projects | Create and assign projects |

---

### 🟡 Finance
Focused on compensation and compliance — no access to HR operations or leave management.

| Capability | Details |
|---|---|
| Directory | Browse all employees; **set annual salary** for each employee |
| Payroll | Issue payslips (salary is pulled from Directory automatically), set custom issue date, confirm payslips, lock payroll runs, generate 13th Month Pay, export bank file |
| Loans | Grant, freeze/unfreeze, and track employee loans |
| Reports | Workforce analytics |
| Gov Reports | SSS, PhilHealth, Pag-IBIG, BIR contribution tables |

---

### 🟢 Employee
Self-service: personal records only. Cannot see other employees' data.

| Capability | Details |
|---|---|
| Dashboard | Personal overview — attendance streak, leave balance, upcoming payslips |
| Attendance | Check in/out (with optional face verification and GPS geofence); request overtime |
| Leave | File leave requests (SL, VL, EL, Other); view request status |
| Payroll | View own payslips; sign/accept payslip with e-signature once payment is received |

---

## Pages

### `/dashboard`
**Access:** All roles

Personalised landing page after login.

- **Admin/HR/Finance** — org-wide stats: total employees, active today, pending leave requests, payroll summary, quick-action shortcuts.
- **Employee** — personal stats: attendance streak, remaining leave credits, next payslip info, recent activity feed.

---

### `/employees/manage`
**Access:** Admin, HR

Full employee roster management.

- Filterable data table (search, department, work type, status).
- Add new employee via a multi-field form (name, email, role, department, salary, work type, location).
- Click any row to open the full employee profile (`/employees/[id]`).
- Activate or deactivate employees.

---

### `/employees/directory`
**Access:** Admin, HR, Finance

Card-based employee directory.

- Search by name or email; filter by department and status.
- Each card shows: name, role, contact info, location, birthday.
- **Finance/Admin/HR only** — salary row visible on each card with an **"✏ Set"** button.
- Clicking "Set" opens a dialog to enter a new annual salary; saves immediately to the employee record and is reflected in Payroll.
- Clicking a card navigates to the employee's profile page.

---

### `/employees/[id]`
**Access:** Admin, HR (employees can access their own profile via links from Payroll/Attendance)

Deep-dive employee profile.

- Overview tab: personal info, work type, department, salary, productivity score.
- **Edit dialog** (Admin/HR only): update name, email, phone, role, department, work type, salary, location.
- Attendance tab: last 20 attendance logs.
- Leave tab: all leave requests.
- Payroll tab: all issued payslips.
- Loans tab: all loan records.
- Documents tab: upload and list HR documents (mock).
- Toggle active/inactive status.

---

### `/projects`
**Access:** Admin, HR

Project management board.

- List of projects with name, description, location coordinates, and assigned employees.
- Create/edit projects; assign employees to them.
- Projects are referenced in attendance logs so GPS check-in can be validated against the project's geofence radius.

---

### `/attendance`
**Access:** Admin, HR, Employee

**Employee view:**
- Single-click **Check In** / **Check Out** button with live timestamp.
- Optional face verification via webcam before check-in.
- GPS geofence validation against the assigned project's coordinates.
- Request overtime (hours, reason, linked project).
- View own attendance history and overtime request status.
- Real-time shift awareness — shows today's assigned shift and remaining hours.

**Admin/HR view:**
- Full table of all employee attendance logs.
- Approve or reject overtime requests; rejected requests require a reason.
- Manage shift templates and assign shifts to employees.
- **Reset button** — restores attendance data to the demo seed state (useful for demos).

---

### `/leave`
**Access:** Admin, HR, Employee

**Employee view:**
- File a leave request: type (SL/VL/EL/Other), start date, end date, reason.
- View own leave history and request statuses (pending / approved / rejected).

**Admin/HR view:**
- Full table of all leave requests across all employees.
- Approve or reject each request with one click.

---

### `/payroll`
**Access:** Admin, Finance (management); Employee (view own)

**Admin/Finance view:**

*Payslips tab:*
- Table of all issued payslips: employee name, period, gross, deductions, net pay, status, signature indicator.
- **Issue Payslip** dialog:
  1. Select employee (active employees only).
  2. Choose an **Issue Date** (date picker, defaults to today — Finance can backdate).
  3. Choose pay period: month + cutoff (1st–15th or 16th–EOM).
  4. Monthly gross is **auto-filled from the employee's directory salary** (read-only).
  5. Optional: add extra allowances/bonus.
  6. PH government deductions (SSS, PhilHealth, Pag-IBIG, Withholding Tax) are computed automatically.
  7. Active loan deductions are applied automatically.
  8. Net Pay card shows live result; Issue button disabled if net pay ≤ 0.
- Confirm a pending payslip (marks as confirmed).
- View the full payslip detail (modal) including employee signature if signed.
- **13th Month** button — generates 13th Month Pay payslips for all active employees at once.
- **Export Bank File** — downloads a CSV for bank bulk payment upload.
- **Reset button** — restores payroll data to the demo seed state.

*Payroll Runs tab:*
- Groups payslips by issue date showing count, total gross, total net, confirmed count.
- **Lock/Unlock** a run — locked runs prevent new payslips from being issued for that date and snapshot the policy versions used (TRAIN tax table, SSS, PhilHealth, Pag-IBIG versions).

**Employee view:**
- Own payslips listed in the same table.
- Click the eye icon to open the payslip detail modal.
- **Sign to Accept Payment** — draws an e-signature with a signature pad to confirm receipt of payment.
- Admin/Finance can then see the captured signature on the payslip detail.

---

### `/loans`
**Access:** Admin, Finance

Employee loan management.

- List of all loans: employee, type (personal/emergency/housing/educational), amount, monthly deduction, remaining balance, status (active/frozen/settled).
- Grant a new loan: select employee, loan type, amount, monthly deduction.
- **Freeze** an active loan (pauses deductions).
- **Unfreeze** a frozen loan (resumes deductions).
- Loan deductions are automatically applied when a payslip is issued for that employee.
- A loan is marked **settled** when the remaining balance reaches zero.

---

### `/reports`
**Access:** Admin, HR, Finance

Workforce analytics dashboard.

- **Headcount** — employees by department (bar chart).
- **Productivity** — average productivity score by department.
- **Work Type Distribution** — WFO / WFH / Hybrid breakdown (pie chart).
- **Turnover Trend** — monthly join vs. termination counts.
- **Leave Utilisation** — approved leave days consumed per employee.
- All charts respond to the current employee data in real time.

---

### `/reports/government`
**Access:** Admin, Finance

Philippine statutory contribution tables — month-filter selector at the top.

| Report | What it shows |
|---|---|
| **SSS** | Employee name, monthly gross, employee contribution (4.5%), employer share (9.5%), total |
| **PhilHealth** | Gross salary, employee share (2.5%), employer share (2.5%), total premium |
| **Pag-IBIG** | Employee contribution (1–2%), employer match (2%), total |
| **BIR / Withholding Tax** | Taxable income after deductions, monthly withholding tax per employee |

Data is filtered by the `issuedAt` date on payslips that match the selected month.

---

### `/settings`
**Access:** Admin only

System-level configuration.

- Organisation profile: company name, industry, address.
- Working hours policy: standard hours, days per week.
- Geofence policy: enable/disable GPS validation on check-in.
- Face verification toggle.
- Notification preferences.

---

### `/notifications`
**Access:** Admin, HR

System notification inbox.

- Lists HR events: leave approvals, overtime updates, new employee additions.
- Mark as read / dismiss.

---

### `/kiosk`
**Access:** Public (no login required)

A simplified check-in/out terminal designed for a shared tablet or kiosk device at a physical worksite.

- Employee selects their name from a list.
- One-tap Check In / Check Out.
- No authentication required — intended for on-site use only.

---

### `/login`
**Access:** Public

Demo login screen.

- Shows 5 pre-built demo accounts (Admin, HR, Finance, Employee ×2).
- Click any account tile to log in instantly — no password required.
- Role badge shown on each tile.

---

## End-to-End Flows

### 1. Onboarding a New Employee
```
Admin/HR → /employees/manage
  → Click "Add Employee"
  → Fill form (name, email, role, dept, salary, work type, location)
  → Employee appears in the roster

Finance → /employees/directory
  → Find the new employee
  → Click "✏ Set" on the salary row
  → Enter/confirm annual salary → Save
```

### 2. Monthly Payroll Cycle
```
Finance → /employees/directory
  → Confirm/update each employee's annual salary

Finance → /payroll → Issue Payslip
  → Select employee
  → Choose Issue Date (e.g. 2026-02-15)
  → Choose pay period month + cutoff (1st–15th)
  → Monthly gross auto-filled from directory salary
  → Gov't deductions auto-computed (SSS, PhilHealth, Pag-IBIG, Tax)
  → Active loan deductions auto-applied
  → Review Net Pay → Click "Issue Payslip"

Finance → /payroll (Payslips tab)
  → Click ✓ on each payslip to Confirm

Employee → /payroll
  → Opens their payslip (eye icon)
  → Draws e-signature → "Sign to Accept Payment"

Finance/Admin → /payroll (view payslip)
  → Sees the captured signature confirming receipt

Finance → /payroll (Payroll Runs tab)
  → Click Lock on the run date
  → Policy snapshot is recorded (tax table version, SSS version, etc.)
```

### 3. 13th Month Pay
```
Admin/Finance → /payroll
  → Click "13th Month" button
  → System generates one payslip per active employee
    (grossPay = Math.round(annual salary / 12), all deductions = 0)
  → Payslips appear in the Payslips tab with status "pending"
```

### 4. Loan Lifecycle
```
Admin/Finance → /loans → Grant Loan
  → Select employee, type, amount, monthly deduction

(Each payroll run)
  → When payslip is issued for that employee,
    loan deduction is automatically deducted from net pay
  → LoanDeduction record created; remaining balance decremented

Admin/Finance → /loans
  → Track remaining balance
  → Freeze if employee is on leave without pay
  → Loan auto-settles when balance hits ₱0
```

### 5. Leave Request Flow
```
Employee → /leave
  → File leave request (type, dates, reason)

Admin/HR → /leave
  → See request status "pending"
  → Approve or Reject
  → Employee sees updated status on their leave page
```

### 6. Attendance & Overtime Flow
```
Employee → /attendance
  → Click "Check In" (GPS + optional face verification)
  → Work day recorded

Employee → /attendance
  → Click "Check Out" — hours computed automatically
  → Late minutes calculated against assigned shift

Employee (if worked extra hours)
  → Click "Request Overtime" → enter hours, reason, project
  → Status: pending

Admin/HR → /attendance
  → See overtime request
  → Approve (hours credited) or Reject (must provide reason)
```

### 7. Government Compliance Reporting
```
Finance/Admin → /reports/government
  → Select month (e.g. February 2026)
  → View SSS, PhilHealth, Pag-IBIG, BIR tables
  → Data sourced from payslips issued in that month
  → Use for manual remittance to government agencies
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1 (App Router) |
| Language | TypeScript 5 |
| UI Library | shadcn/ui + Tailwind v4 |
| State Management | Zustand 5 with `persist` (localStorage) |
| Charts | Recharts |
| Toast Notifications | Sonner |
| Date Utilities | date-fns |
| E-Signature | Canvas-based signature pad |
| Testing | Jest 29 + ts-jest + jest-environment-jsdom |
| Test Count | **170 tests across 11 suites** |

---

## PH Compliance

All payroll calculations follow Philippine statutory rates:

| Contribution | Employee | Employer |
|---|---|---|
| SSS | 4.5% of monthly salary credit | 9.5% |
| PhilHealth | 2.5% of basic monthly salary | 2.5% |
| Pag-IBIG | 1–2% (salary-based) | 2% |
| Withholding Tax | TRAIN Law graduated table | — |

Payroll run locks snapshot the exact policy version used so audits can reproduce historical calculations.
