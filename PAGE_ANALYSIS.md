# NexHRMS Complete Page Analysis & User Flow Documentation

**Generated:** February 20, 2026  
**Version:** MVP v2 - PH-Compliant Payroll Edition  
**Status:** ✅ Production Build Verified | ✅ 190 Tests Passing

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Role-Based Access Matrix](#role-based-access-matrix)
3. [Page-by-Page Analysis](#page-by-page-analysis)
4. [Core User Flows](#core-user-flows)
5. [Data Flow & Integration Points](#data-flow--integration-points)
6. [Compliance & Audit Trail](#compliance--audit-trail)

---

## System Architecture Overview

### Technology Stack
- **Framework:** Next.js 16.1.6 (App Router, React 19)
- **State Management:** Zustand 5 with localStorage persistence
- **UI Library:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind v4
- **Testing:** Jest 29 + ts-jest (190 passing tests)
- **Icons:** Lucide React
- **Charts:** Recharts
- **Date Handling:** date-fns

### Core Principles
- **Client-Side First:** All state managed in Zustand stores with localStorage persistence
- **No Database:** MVP uses browser localStorage for rapid prototyping
- **PH Compliance:** Full Philippine payroll tax calculations (SSS, PhilHealth, Pag-IBIG, withholding tax)
- **Audit Trail:** Immutable audit log for all critical actions
- **Role-Based Access:** 7 roles with granular permissions

### Application Structure
```
src/app/
├── page.tsx                    → Root (redirects to /dashboard)
├── login/page.tsx              → Authentication entry point
├── dashboard/page.tsx          → Main hub with KPIs and widgets
├── attendance/page.tsx         → Time tracking (3 tabs: Logs, Events, Exceptions, OT)
├── leave/page.tsx              → Leave management (2 tabs: Requests, Policies)
├── loans/page.tsx              → Loan management (3 tabs: Active, Schedule, History)
├── payroll/page.tsx            → Payroll operations (4 tabs: Payslips, Runs, Adjustments, Final Pay)
├── timesheets/page.tsx         → Timesheet computation & approval (2 tabs: Timesheets, Rule Sets)
├── audit/page.tsx              → Audit log viewer (admin/auditor only)
├── kiosk/page.tsx              → QR/PIN check-in kiosk
├── employees/
│   ├── directory/page.tsx      → Employee directory with salary proposals
│   ├── manage/page.tsx         → Advanced employee management with filters
│   └── [id]/page.tsx           → Individual employee profile (5 tabs)
├── projects/page.tsx           → Project assignments with geofencing
├── reports/page.tsx            → 4 report types (Payroll, Gov't, Absence, Late)
├── notifications/page.tsx      → Mock email notification log
└── settings/page.tsx           → App preferences (theme, org, roles, timesheets, notifications)
```

---

## Role-Based Access Matrix

### Available Roles
1. **Admin** - Full system access
2. **HR** - Employee management, leave, attendance, proposals
3. **Finance** - Payroll, loans, salary changes
4. **Employee** - Self-service only
5. **Supervisor** - Timesheet approval, team oversight
6. **Payroll Admin** - Payroll operations (no salary changes)
7. **Auditor** - Read-only audit log access

### Access Control Table

| Page/Feature | Admin | HR | Finance | Supervisor | Payroll Admin | Auditor | Employee |
|--------------|:-----:|:--:|:-------:|:----------:|:------------:|:-------:|:--------:|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (limited) |
| **Attendance** (view all) | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Mark absent | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve OT | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Leave** (approve) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Submit leave | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Loans** (manage) | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Payroll** (issue) | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Confirm payslip | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Lock run | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Sign payslip | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Timesheets** (approve) | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Compute timesheet | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Employees** (add/edit) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Set salary (direct) | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Propose salary | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Resign employee | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Projects** (manage) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Reports** (view) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Audit Log** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Settings** (org config) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Theme settings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Page-by-Page Analysis

### 1. **Root Page** (`/`)

**Purpose:** Entry point that redirects authenticated users to dashboard.

**Features:**
- Simple redirect to `/dashboard`
- No UI rendered

**User Flow:**
```
User lands on / → Immediate redirect to /dashboard
```

---

### 2. **Login Page** (`/login`)

**Purpose:** Authentication entry point with demo account quick-login.

**Features:**
- Standard email/password form
- 4 quick-login demo accounts (Admin, HR, Finance, Employee)
- Branded login card with logo
- Role-based badge colors
- Mock authentication (hardcoded credentials)

**Demo Accounts:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@nexhrms.com | demo1234 |
| HR | hr@nexhrms.com | demo1234 |
| Finance | finance@nexhrms.com | demo1234 |
| Employee | employee@nexhrms.com | demo1234 |

**User Flow:**
```
User enters credentials → Click "Sign In" or quick-login button
                       → Auth store validates
                       → Success: redirect to /dashboard
                       → Failure: show error toast
```

**Integration Points:**
- `useAuthStore` - login() method
- Router - `router.push("/dashboard")`
- Toast notifications

---

### 3. **Dashboard** (`/dashboard`)

**Purpose:** Main hub displaying KPIs, charts, and quick actions.

**Features:**
1. **KPI Cards (5 cards):**
   - Total Present (today)
   - Total Absent (today)
   - On Leave (today)
   - Pending Leaves (all time)
   - Outstanding Loan Balance (₱)

2. **Attendance Trend Chart (LineChart):**
   - Last 7 days present/absent counts
   - Recharts LineChart component
   - Responsive container

3. **Department Distribution (PieChart):**
   - Employee count by department
   - Color-coded slices
   - Legend with percentages

4. **Upcoming Events Widget:**
   - Birthdays this month
   - Leave requests pending approval
   - Quick-action buttons

5. **Recent Activity Table:**
   - Last 10 attendance logs
   - Show employee name, date, check-in/out, hours, status

6. **Quick Stats:**
   - Total employees count
   - Active projects count

**Role-Based View:**
- **All Roles:** See personal KPIs and own attendance
- **Admin/HR:** See company-wide KPIs and all events
- **Employee:** Limited view (only personal stats)

**User Flow:**
```
User lands on dashboard → View KPIs
                        → Check attendance trend
                        → See pending events
                        → Click quick action buttons to navigate
```

**Integration Points:**
- `useEmployeesStore` - employees list
- `useAttendanceStore` - logs, today's attendance
- `useLeaveStore` - leave requests
- `useLoansStore` - total outstanding loans
- `useEventsStore` - upcoming birthdays
- Recharts for visualization

---

### 4. **Attendance Page** (`/attendance`)

**Purpose:** Comprehensive time tracking with event ledger, exceptions, and OT requests.

**Features:**

#### **Tabs (4 tabs):**

##### Tab 1: **Logs** (Daily Attendance Records)
- **Filters:**
  - Date picker (default: today)
  - Employee dropdown (admin/HR only)
- **Attendance Table:**
  - Columns: Date, Employee, Project, Check In, Check Out, Hours, Late, Status
  - Status badges: present (green), absent (red), on_leave (amber)
  - Face verification shield icon
  - Admin actions: Mark absent, Send absence notification
- **Check-In/Out Buttons:**
  - Multi-step check-in flow (for employees):
    1. Request location → Geofence validation
    2. Face recognition simulator (mock)
    3. Success/error states
  - Check-out button
- **Stats:** Total present, absent, on leave for filtered date

##### Tab 2: **Events** (Append-Only Event Ledger)
- **Purpose:** Immutable audit trail of all check-in/out events
- **Table:**
  - Columns: Timestamp (UTC), Employee, Event Type (IN/OUT/BREAK_START/BREAK_END), Project, Device
  - Shows up to 100 most recent events
  - Event type badges color-coded
- **Note:** "⚠️ Event ledger is append-only. Editing/deleting events is disabled by design."

##### Tab 3: **Exceptions** (Auto-Generated Anomalies)
- **Purpose:** Flag attendance rule violations (missing check-in/out, geofence violations, duplicate scans)
- **Admin Button:** "Scan for Exceptions" - auto-generates exceptions from event ledger
- **Exception Table:**
  - Columns: Date, Employee, Type (flag), Description, Status (open/resolved)
  - Flag types: missing_in, missing_out, out_of_geofence, duplicate_scan
  - Resolve button (admin only) - marks exception as resolved
- **Exception Types:**
  - `missing_in`: No IN event for the day
  - `missing_out`: No OUT event after IN
  - `out_of_geofence`: GPS location outside project geofence
  - `duplicate_scan`: Multiple scans within short time

##### Tab 4: **Overtime Requests** (OT Approval Workflow)
- **Submit OT Request:** Date, Hours, Reason
- **OT Table:**
  - Columns: Date, Employee, Hours Requested, Reason, Status
  - Status: pending (amber), approved (green), rejected (red)
  - Admin actions: Approve, Reject (with reason dialog)

**User Flow:**

**Employee:**
```
Employee lands on attendance → Sees only own logs
                             → Click "Check In" → Multi-step flow
                             → Check-in successful → Log appears in table
                             → Submit OT request if needed
```

**Admin/HR:**
```
Admin lands on attendance → See all logs (company-wide)
                          → Filter by date/employee
                          → Mark absent if needed
                          → Review OT requests → Approve/Reject
                          → View Events tab to audit raw check-ins
                          → Scan for exceptions → Resolve anomalies
```

**Integration Points:**
- `useAttendanceStore` - logs, events, exceptions, OT requests
- `useEmployeesStore` - employee names
- `useProjectsStore` - project assignments, geofence data
- `isWithinGeofence()` - geofence validation
- `FaceRecognitionSimulator` - mock biometric
- Browser Geolocation API

**Compliance Notes:**
- Event ledger is immutable per §4 of mvpv2.md
- Exceptions auto-generated per §4.4
- Face verification evidence stored per §4.3

---

### 5. **Leave Page** (`/leave`)

**Purpose:** Leave request submission, approval, and policy management.

**Features:**

#### **Tabs (2 tabs):**

##### Tab 1: **Requests**
- **Leave Balance Cards (4 cards):**
  - VL (Vacation Leave): 15 days/year
  - SL (Sick Leave): 10 days/year
  - EL (Emergency Leave): 5 days/year
  - OTHER: 5 days/year
  - Shows: Allocated, Used, Remaining (with progress bar)

- **New Request Dialog:**
  - Fields: Leave Type, Start Date, End Date, Reason
  - Admin/HR can select employee (dropdown)
  - Employee: auto-filled with own ID
  - Auto-calculates days between dates
  - Validation: End date >= Start date, Reason min 5 chars

- **Requests Table:**
  - Columns: Employee, Type, Start Date, End Date, Days, Reason, Status
  - Status badges: pending (amber), approved (green), rejected (red)
  - Actions (admin/HR only): Approve, Reject
  - Approval syncs to attendance store (marks days as "on_leave")

- **Filters:**
  - Status filter: All, Pending, Approved, Rejected
  - Employee filter (employee sees only own)

##### Tab 2: **Policies** (Leave Policy Configuration)
- **Policy Cards:**
  - Display for each leave type (VL, SL, EL, OTHER)
  - Shows:
    - Leave type icon and name
    - Accrual frequency (e.g., monthly, yearly)
    - Annual entitlement (days/year)
    - Max balance
    - Carry forward allowed (Yes/No badge)
    - Negative leave allowed (Allowed/No badge)
    - Attachment required badge
    - Expiry months (if > 0)
- **Purpose:** View default policies from `DEFAULT_LEAVE_POLICIES` constant

**User Flow:**

**Employee:**
```
Employee lands on leave → View balance cards
                        → Check remaining VL/SL
                        → Click "New Request"
                        → Fill form: Type, Start, End, Reason
                        → Submit → Status: Pending
                        → Wait for approval
```

**Admin/HR:**
```
Admin lands on leave → See all requests (company-wide)
                     → Filter by status
                     → Review pending requests
                     → Click Approve → Attendance auto-updated
                     → Or Reject with reason
                     → View Policies tab to check leave rules
```

**Integration Points:**
- `useLeaveStore` - requests, policies, balances
- `useEmployeesStore` - employee names
- `useAttendanceStore` - sync approved leave to attendance logs (mark as "on_leave")

**Compliance Notes:**
- Leave accrual per §9 of mvpv2.md
- Conflict detection implemented in store
- Policies support carry-forward and expiry per §9.3

---

### 6. **Loans Page** (`/loans`)

**Purpose:** Loan & cash advance management with repayment schedules.

**Features:**

#### **Stats Cards (3 cards):**
- Total Active Loans
- Total Outstanding Balance (₱)
- Total Settled Loans

#### **Tabs (3 tabs):**

##### Tab 1: **Active Loans & Manage**
- **Create Loan Dialog:**
  - Fields:
    - Employee dropdown
    - Loan Type (cash_advance, salary_loan, other)
    - Total Amount (₱)
    - Monthly Deduction (₱)
    - Deduction Cap (% of net pay, default: 30%)
    - Remarks (optional)
  - Auto-calculates estimated installments
  - Creates loan with status "active"

- **Loans Table:**
  - Columns: Employee, Type, Amount, Monthly, Remaining, Cap %, Status, Progress
  - Status badges: active (green), settled (blue), frozen (amber)
  - Progress bar showing paid vs. remaining
  - Actions per loan:
    - **Freeze** - temporarily pause deductions
    - **Unfreeze** - resume deductions
    - **Settle** - mark as fully paid
    - **View Details** - opens detail dialog

- **Status Filter:** All, Active, Settled, Frozen

- **Detail Dialog:**
  - Shows full loan info: employee, type, amounts, status
  - Action buttons based on status

##### Tab 2: **Schedule** (Repayment Schedule per Loan)
- **Per Active Loan:**
  - Shows loan info card (employee, type, amounts)
  - **Repayment Schedule Table:**
    - Columns: #, Due Date, Amount, Status
    - Status: paid (green), pending (gray), skipped (amber with reason)
    - Generated from `getSchedule(loanId)` method
    - Skipped reasons: "insufficient_net_pay", "frozen"

##### Tab 3: **History** (All Deductions)
- **All Deductions Table:**
  - Columns: Date, Employee, Loan, Amount Deducted, Balance After, Payslip ID
  - Returns `getAllDeductions()` from store
  - Shows full deduction history across all loans

**User Flow:**

**Admin/Finance:**
```
Finance lands on loans → View stats
                       → Click "Create Loan"
                       → Select employee, enter amount/deduction
                       → Set cap % (default 30%)
                       → Create loan → Status: Active
                       → View active loans in table
                       → Click Schedule tab → See per-loan payment plan
                       → Freeze/Unfreeze as needed
                       → Settle when fully paid
```

**Payroll Integration:**
```
Finance issues payslip → Loan deduction auto-calculated
                       → Capped at X% of net pay
                       → Deduction recorded in loan history
                       → Remaining balance updated
                       → Schedule updated (installment marked "paid")
```

**Integration Points:**
- `useLoansStore` - loans, schedules, deductions
- `useEmployeesStore` - employee names
- `usePayrollStore` - payslip creation triggers loan deduction
- Deduction cap enforcement in payroll store

**Compliance Notes:**
- Deduction cap per §10 of mvpv2.md
- Carry-forward installments when skipped
- History tracking for audit

---

### 7. **Payroll Page** (`/payroll`)

**Purpose:** Philippines-compliant payroll operations with semi-monthly cutoffs.

**Features:**

#### **Stats (at top):**
- Total Payslips (all time)
- Issued Payslips (status = "issued")
- Pending Confirmation (status = "issued" waiting for confirm)
- Total Net Pay Disbursed (₱)

#### **Tabs (4 tabs):**

##### Tab 1: **Payslips** (Issue & Manage Individual Payslips)
- **Issue Payslip Dialog (Enhanced with Bulk Selection):**
  - **Employee Selection (Multi-Select):**
    - Checkbox list of all active employees
    - **"Select All" / "Deselect All" button** for bulk operations
    - Shows employee count: "(5 selected)"
    - Each employee card displays:
      - Name, role, department
      - Annual salary and monthly equivalent
      - Hover effect for better UX
    - Scrollable list (max 280px height)
  
  - **Semi-Monthly Cutoff Selection:**
    - Month picker (last 6 months dropdown)
    - Cutoff: "1st-15th" or "16th-End of Month"
    - Auto-displays date range label (e.g., "Feb 1 – Feb 15, 2026")
  
  - **Issue Date:** Date picker (defaults to today)
  
  - **Allowances & Deductions (Applied to ALL):**
    - Extra Allowances/Bonus (₱) - added to all selected
    - Other Deductions (₱) - deducted from all selected
    - Amber warning card: "⚠️ Applied to ALL selected employees"
  
  - **Auto-Computed Per Employee:**
    - Gross Pay: Fetches from directory (annual salary ÷ 12)
    - Government Deductions: Auto-calculated using `computeAllPHDeductions()`
      - SSS (Social Security System)
      - PhilHealth (health insurance)
      - Pag-IBIG (home development fund)
      - Withholding Tax (progressive tax table)
    - Loan Deduction: Sum of monthly deductions from active loans (capped at 30% of net pay)
    - Net pay validation: Must be > 0 (skips employees with negative net)
  
  - **Issue Button:**
    - Dynamic text: "Issue 5 Payslip**s**" (pluralized)
    - Disabled if no employees selected
    - On click:
      - Loops through all selected employees
      - Creates payslip with status "issued" for each
      - Records loan deduction(s) in loan history
      - Updates loan remaining balance
      - Shows success toast: "✅ Issued 5 payslips (incl. ₱25,000 total loan deductions)"
      - Skips employees with net pay ≤ 0 (with error toast)

- **Payslips Table:**
  - Columns: Employee, Period, Gross, Deductions, Net Pay, Status, Actions
  - Status badges: issued (amber), confirmed (blue), published (green), paid (emerald), acknowledged (violet)
  - Actions per payslip:
    - **View** - opens detail dialog
    - **Confirm** (finance/payroll_admin) - changes status to "confirmed" (requires status = "issued")
    - **Publish** (finance/payroll_admin) - changes status to "published"
    - **Record Payment** - changes status to "paid", records payment date
    - **Sign** (employee) - digital signature pad, marks as "acknowledged"

- **Detail Dialog:**
  - Full payslip breakdown:
    - Employee info, period
    - Gross pay, allowances
    - All deductions (SSS, PhilHealth, Pag-IBIG, tax, loans, other)
    - Net pay (bold, large)
    - Status, issued at, confirmed by, published at
    - Notes
  - **Action Buttons** (based on status and role):
    - Confirm (if issued)
    - Publish (if confirmed)
    - Record Payment (if published)
    - Sign (if paid and user is employee)

##### Tab 2: **Runs** (Batch Payroll Operations)
- **Purpose:** Group payslips by date for locking/publishing as a batch

- **Create Draft Run Button:**
  - Select run date
  - Creates run with status "draft"

- **Validate Run Button:**
  - Validates all payslips in run
  - Changes status to "validated"

- **Runs Table:**
  - Columns: Run ID, Period Label (date), # Payslips, Status, Created At, Locked At
  - Status badges: draft (gray), validated (blue), locked (amber), published (green), paid (emerald)
  - Actions:
    - **Lock Run** - locks run (requires status = "validated"), creates policy snapshot
    - **Publish Run** - publishes all payslips in run (bulk operation)
    - **Mark Paid** - marks all payslips as paid

- **Lock Behavior:**
  - Snapshots:
    - Tax table version
    - SSS version
    - PhilHealth version
    - Pag-IBIG version
    - Holiday list version
    - Formula version
    - Rule set version
  - After lock: no more payslips can be added/edited (use adjustments)

- **13th Month Pay Button:**
  - Calculates 13th month pay (1/12 of annual salary)
  - Issues payslips for all active employees
  - Issued at December 31 or custom date

- **Export Bank File Button:**
  - Generates CSV for bank disbursement
  - Columns: Employee ID, Name, Account #, Net Pay
  - Downloads file

##### Tab 3: **Adjustments** (Post-Lock Corrections)
- **Purpose:** Allow corrections after payroll run is locked

- **Create Adjustment Dialog:**
  - Fields:
    - Payslip ID (select from locked payslips)
    - Adjustment Type (correction, bonus, deduction, reimbursement)
    - Amount (₱)
    - Reason (required, min 10 chars)

- **Adjustments Table:**
  - Columns: ID, Payslip ID, Employee, Type, Amount, Reason, Status, Created By
  - Status: pending (amber), approved (green), rejected (red), applied (blue)
  - Actions (admin/finance only):
    - **Approve** - marks as approved
    - **Reject** - marks as rejected
    - **Apply** - applies adjustment to payslip (recalculates net pay)

- **Approval Workflow:**
  - Created → Pending → Approved → Applied
  - Or: Created → Pending → Rejected

##### Tab 4: **Final Pay** (Resignation Payouts)
- **Purpose:** Compute final pay for resigned employees

- **Final Pay Table:**
  - Columns: Employee, Resigned At, Pro-Rated Salary, Leave Payout, Unpaid OT, Loan Balance, Deductions, Net Final, Status
  - Status: draft (gray), validated (blue), locked (amber), published (green), paid (emerald)
  - Shows all final pay computations from store

- **Computation Triggers:**
  - When employee is resigned via Employees > Manage page
  - `resignEmployee()` calls `computeFinalPay()`
  - Includes:
    - Pro-rated salary (days worked in final month)
    - Leave conversion (unused leave days)
    - Unpaid OT pay
    - Minus: Remaining loan balance
    - Minus: Government deductions
    - Result: Net final pay

**User Flow:**

**Finance/Payroll Admin:**
```
Finance lands on payroll → View stats
                         → Click "Issue Payslip"
                         → Select month + cutoff (e.g., Jan 2026, First Half)
                         → Select employee → Auto-fills gross, deductions
                         → Adjust allowances/other deductions if needed
                         → Preview net pay
                         → Issue → Status: "issued"
                         → Confirm payslip → Status: "confirmed"
                         → Lock run → Status: "locked" (immutable)
                         → Publish run → All payslips → Status: "published"
                         → Export bank file for disbursement
                         → Record payment → Status: "paid"
                         → (If correction needed post-lock) → Create adjustment
```

**Employee:**
```
Employee lands on payroll → See own payslips only
                          → Filter by period
                          → View payslip detail
                          → (When status = "paid") → Sign payslip
                          → Status: "acknowledged"
```

**Integration Points:**
- `usePayrollStore` - payslips, runs, adjustments, finalPayComputations
- `useEmployeesStore` - employee names, salaries
- `useLoansStore` - active loans, record deductions
- `computeAllPHDeductions()` - PH tax calculator

**Compliance Notes:**
- Semi-monthly cutoffs per §8 of mvpv2.md
- Status workflow: issued → confirmed → published → paid → acknowledged
- Policy snapshots on lock per §5.3
- Adjustments for post-lock corrections per §5.4
- Final pay computation per §5.5

---

### 8. **Timesheets Page** (`/timesheets`)

**Purpose:** Compute timesheets from attendance events using rule sets.

**Features:**

#### **Stats (4 cards):**
- Computed timesheets (status = "computed")
- Pending Approval (status = "submitted")
- Approved timesheets
- Total Rule Sets

#### **Tabs (2 tabs):**

##### Tab 1: **Timesheets**
- **Filters:**
  - Date picker
  - Employee dropdown (supervisor/payroll_admin see all)
  - Status filter: All, Computed, Submitted, Approved, Rejected

- **Compute Timesheet Dialog:**
  - Fields:
    - Employee (dropdown)
    - Date (picker)
    - Shift Start (HH:mm, e.g., 08:00)
    - Shift End (HH:mm, e.g., 17:00)
    - Rule Set (dropdown from available rule sets)
  - **Behavior:**
    - Looks up attendance log for employee on date
    - Must have check-in time
    - Calls `computeTimesheet()` with:
      - employeeId, date, ruleSetId
      - checkIn, checkOut (from log), shiftStart, shiftEnd
      - breakDuration (default 60 min)
    - Creates Timesheet with segments (regular, OT, night diff, etc.)
    - Status: "computed"

- **Timesheets Table:**
  - Columns: Date, Employee, Regular (hours), OT, Night Diff, Late, Undertime, Status
  - OT badge (blue) if > 0
  - Night Diff badge (violet) if > 0
  - Late/Undertime in minutes (amber/red text)
  - Status badges: computed (gray), submitted (amber), approved (green), rejected (red)
  - Actions:
    - **View** - opens detail dialog
    - **Submit** (employee, if status = "computed") - changes to "submitted"
    - **Approve** (supervisor, if status = "submitted") - changes to "approved"
    - **Reject** (supervisor, if status = "submitted") - changes to "rejected"

- **View Dialog:**
  - Shows full timesheet:
    - Employee, date, status
    - Total hours, segments count
    - Regular, OT, Night Diff hours
    - Late, Undertime minutes
    - Rule Set ID
    - Approved by (if approved)

##### Tab 2: **Rule Sets** (Timesheet Computation Rules)
- **Purpose:** Define how to compute hours, OT, night diff, etc.

- **Add Rule Set Dialog:**
  - Fields:
    - Name (e.g., "Manila Office Rules")
    - Standard Hours/Day (default 8)
    - Grace Period Minutes (default 10)
    - Rounding Policy: None, Nearest 15 min, Nearest 30 min
    - OT Requires Approval: Yes/No toggle
    - Holiday Multiplier (default 1.0)

- **Rule Sets Display:**
  - Cards showing each rule set:
    - Name and ID
    - Standard hours, grace period
    - Rounding policy
    - OT approval requirement
    - Night diff window (22:00 - 06:00)
    - Holiday multiplier

**User Flow:**

**Supervisor/Payroll Admin:**
```
Supervisor lands on timesheets → View stats
                               → Click "Compute Timesheet"
                               → Select employee + date
                               → Attendance log found → Auto-fills check-in/out
                               → Select rule set
                               → Compute → Status: "computed"
                               → Employee submits for approval
                               → Supervisor reviews → Approve or Reject
                               → Approved timesheet goes to payroll
```

**Employee:**
```
Employee lands on timesheets → See own timesheets
                             → Filter by date
                             → (When supervisor computes) → See "computed" status
                             → Click Submit → Status: "submitted"
                             → Wait for approval
```

**Integration Points:**
- `useTimesheetStore` - timesheets, ruleSets
- `useAttendanceStore` - logs (source of check-in/out times)
- `useEmployeesStore` - employee names
- Time computation logic in store

**Compliance Notes:**
- Timesheet segments per §10 of mvpv2.md
- Rule sets define computation parameters
- Supervisor approval workflow per §10.2

---

### 9. **Audit Page** (`/audit`)

**Purpose:** Immutable audit log of all critical system actions.

**Access:** Admin and Auditor roles only.

**Features:**

#### **Stats (3 cards):**
- Total Entries
- Unique Actions (count of distinct action types)
- Today's Entries

#### **Filters:**
- Action type dropdown (salary_proposal, leave_approval, payroll_lock, etc.)
- Entity ID/Type search (text input)
- Performer ID search (text input)

#### **Audit Log Table:**
- **Columns:**
  - Timestamp (ISO 8601, millisecond precision)
  - Action (colored badge)
  - Entity Type
  - Entity ID
  - Performed By (user ID)
  - Details (truncated)
- **Actions:** 22 tracked audit actions:
  - `salary_proposal`, `salary_approval`, `leave_approval`, `leave_rejection`
  - `overtime_approval`, `overtime_rejection`
  - `payroll_lock`, `payroll_publish`, `payment_record`
  - `adjustment_create`, `adjustment_approve`
  - `loan_freeze`, `loan_unfreeze`, `loan_create`
  - `employee_resign`, `employee_activate`, `employee_deactivate`
  - `timesheet_approve`, `timesheet_reject`
  - `attendance_exception_resolve`
  - `final_pay_compute`
  - `payslip_sign`

#### **View Detail Dialog:**
- **Full Audit Entry:**
  - ID, Timestamp
  - Action, Entity Type, Entity ID
  - Performed By
  - Details (full JSON)
  - Before/After snapshots (if available)

**User Flow:**

**Admin/Auditor:**
```
Auditor lands on audit → View stats
                       → Filter by action type (e.g., "payroll_lock")
                       → Search by entity (e.g., "RUN-2026-01-15")
                       → Review log entries
                       → Click View Details → See before/after snapshots
                       → Export/Print report (future feature)
```

**Integration Points:**
- `useAuditStore` - logs (append-only)
- All critical actions in other stores call `logAudit()` to record

**Compliance Notes:**
- Immutable log per §13 of mvpv2.md
- All critical actions tracked
- Timestamps in UTC
- Before/after snapshots for state changes

---

### 10. **Kiosk Page** (`/kiosk`)

**Purpose:** QR code and PIN-based check-in/out terminal.

**Features:**

1. **QR Code Widget:**
   - Generates rotating 8-character token every 30 seconds
   - Large QR code display (for mobile scanning)
   - Countdown timer (30s)
   - Refresh button

2. **PIN Entry Widget:**
   - Input field for PIN (min 4 digits)
   - Device ID badge (generated and persisted in localStorage)
   - "Check In" and "Check Out" buttons
   - **Behavior:**
     - Accepts any PIN >= 4 digits (MVP behavior)
     - Calls `appendEvent()` with:
       - employeeId: current user ID
       - eventType: "IN" or "OUT"
       - timestampUTC: current time
       - deviceId: generated/persisted kiosk device ID
     - Success toast with device ID

3. **Device ID Generation:**
   - Format: `KIOSK-XXXXXX` (6-char random)
   - Persisted in `localStorage` key: `nexhrms-kiosk-device-id`
   - Reused across sessions

**User Flow:**

```
User lands on kiosk → See QR code + PIN entry widgets
                    → (Option 1) Scan QR with mobile → Check in via mobile
                    → (Option 2) Enter PIN (4+ digits) → Click "Check In"
                    → Event appended to attendance store
                    → Success toast: "Checked in via PIN on KIOSK-ABC123"
                    → Same for "Check Out"
```

**Integration Points:**
- `useAttendanceStore` - appendEvent()
- `useAuthStore` - currentUser.id
- `localStorage` - device ID persistence
- QR code library (future: actual QR code generation)

**Compliance Notes:**
- Device tracking per §4.2 of mvpv2.md
- Event source: "kiosk" (vs. "mobile" or "web")

---

### 11. **Employees Directory** (`/employees/directory`)

**Purpose:** Employee directory with search, filters, and salary proposal workflow.

**Features:**

1. **Search & Filters:**
   - Search bar (name or email)
   - Department dropdown (all PH departments)
   - Status filter: All, Active, Inactive, Resigned

2. **Employee Cards (Grid View):**
   - Avatar with initials
   - Name, email, role badge
   - Department, work type (WFO/WFH/Hybrid)
   - Salary (annual, blurred for non-finance)
   - Status badge
   - "View Profile" link (to `/employees/[id]`)
   - **Salary Edit Button (finance/HR):**
     - Click pencil icon → Opens salary dialog

3. **Salary Dialog:**
   - **Admin/Finance:** Direct set
     - Input new salary
     - Save → Updates employee.salary immediately
   - **HR:** Proposal workflow
     - Input proposed salary
     - Input reason (required)
     - Submit → Creates salary change request
     - status: "pending"
     - Requires approval from admin/finance

4. **Salary Requests Section (bottom):**
   - Shows pending salary change requests
   - Table: Employee, Current Salary, Proposed Salary, Effect Date, Reason, Proposed By
   - Actions (admin/finance only):
     - **Approve** → Applies salary change, sets effectiveDate, logs audit
     - **Reject** → Marks request as rejected

**User Flow:**

**Admin/Finance (Direct Set):**
```
Finance lands on directory → Search for employee
                           → Click salary edit icon
                           → Enter new salary
                           → Save → Salary updated immediately
```

**HR (Proposal):**
```
HR lands on directory → Search for employee
                      → Click salary edit icon
                      → Enter proposed salary + reason
                      → Submit → Status: "pending"
                      → Admin/Finance reviews in directory
                      → Approve → Salary updated
```

**Integration Points:**
- `useEmployeesStore` - employees, proposeSalaryChange, approveSalaryChange, rejectSalaryChange
- `useAuthStore` - current user role
- Role-based permissions

**Compliance Notes:**
- Salary governance per §11 of mvpv2.md
- Approval workflow for HR proposals
- Audit log for all salary changes

---

### 12. **Employees Manage** (`/employees/manage`)

**Purpose:** Advanced employee management with pagination, filters, CRUD operations, and project assignment.

**Features:**

1. **Advanced Filters:**
   - Search (name, email, ID)
   - Status: All, Active, Inactive, Resigned
   - Work Type: All, WFO, WFH, Hybrid
   - Department: All, + all PH departments
   - Salary Range slider (₱0 - ₱200,000)

2. **Column Visibility (Sheet Panel):**
   - Toggle visibility for:
     - ID, Name, Status, Role, Department, **Project**, Team Leader, Productivity, Join Date, Salary, Work Type
   - Save preferences (localStorage)
   - **NEW:** Project column shows assigned project with blue badge

3. **Sorting:**
   - Click column headers to sort
   - Ascending/descending toggle
   - Visual sort indicator (chevron icon)

4. **Pagination:**
   - Page size selector: 10, 20, 50
   - Page navigation: Previous, Next, First, Last
   - Shows "Page X of Y"

5. **Employee Table:**
   - Dynamic columns based on visibility settings
   - Status badges (active, inactive, resigned)
   - **NEW:** Project badge - displays currently assigned project
   - Productivity as progress bar visual
   - Actions column:
     - **View** (Eye icon) - link to `/employees/[id]`
     - **Edit** (Pencil icon) - opens edit dialog (admin/HR only)
     - **Activate/Deactivate** toggle (admin/HR only)
     - **Resign** button (admin/HR only) - with final pay computation
     - **Delete** button (inactive employees only, admin/HR) - with confirmation

6. **Add Employee Dialog:**
   - Fields:
     - Name, Email, Phone (optional)
     - Role (dropdown: 7 roles)
     - Department (dropdown)
     - Work Type (WFO/WFH/Hybrid)
     - Salary (₱)
     - Location (dropdown: Philippines cities)
   - Validates required fields
   - Generates employee ID: `EMP-XXXXXX` (6-char nanoid)
   - Sets default productivity: 80%
   - Sets join date: today

7. **Edit Employee Dialog (NEW):**
   - **Trigger:** Click Pencil icon in table row
   - **Fields (all editable):**
     - Full Name *
     - Email *
     - Role * (dropdown: 7 roles)
     - Department * (dropdown)
     - Work Type (WFO/WFH/Hybrid)
     - Salary (₱)
     - Location (dropdown)
     - Phone
     - Productivity (%) - slider input
     - **Assigned Project** (dropdown) - NEW!
       - Options: "No Project" + all active/on-hold projects
       - Shows checkmark (✓) if already assigned
       - Help text: "Assigned project defines geofence for attendance check-in"
   - **Save Logic:**
     - Updates employee record via `updateEmployee()`
     - Handles project assignment changes:
       - If project changed: removes from old, assigns to new
       - If "No Project" selected: removes from current project
       - If project unchanged: no action
     - Calls `assignEmployee(projectId, empId)` or `removeEmployee(projectId, empId)`
   - **Validation:**
     - Required fields checked
     - Admin/HR permission enforced
   - **Success:** Toast "Employee updated successfully!"

8. **Resign Employee Workflow:**
   - Click "Resign" button on active employee row
   - Opens AlertDialog with warning
   - **Computes Final Pay:**
     - Pro-rated salary (days worked in month)
     - Leave conversion (remaining leave days)
     - Loan balance offset (if any)
   - Shows breakdown in dialog
   - Confirm → Calls `resignEmployee(empId)`
   - Also calls `computeFinalPay()` → Adds to Final Pay tab in Payroll

**User Flow:**

**Admin/HR (CRUD + Project Assignment):**
```
HR lands on manage → Apply filters (status, dept, salary)
                   → Sort by join date
                   → View Project column (shows assignments)
                   → Click "Edit" on employee
                   → Modify name, email, salary, etc.
                   → Select "Assigned Project" from dropdown
                   → Save → Project assignment updated
                   → Employee now linked to project geofence
                   → Attendance check-ins validate against project location
```

**OR:**
```
HR clicks "Add Employee" → Fill form (no project yet)
                        → Add employee
                        → Employee appears in table
                        → Click "Edit" → Assign to project
                        → Save → Now has project assignment
```

**OR:**
```
HR clicks "Resign" on employee → Review final pay breakdown
                               → Confirm → Employee status: "resigned"
                               → Final pay created in payroll
```

**Integration Points:**
- `useEmployeesStore` - employees, addEmployee, **updateEmployee**, removeEmployee, resignEmployee, toggleStatus
- `useProjectsStore` - **projects, assignEmployee, removeEmployee, getProjectForEmployee** (NEW)
- `usePayrollStore` - computeFinalPay
- `useLoansStore` - getActiveByEmployee (for final pay loan balance)
- `useLeaveStore` - getEmployeeBalances (for final pay leave conversion)

**Attendance Connection:**
- When employee checks in via Kiosk, system retrieves assigned project via `getProjectForEmployee(empId)`
- Validates GPS coordinates against project's `location.lat/lng/radius` (geofence)
- If outside geofence → flags attendance event with `geofencePass: false`
- Creates `AttendanceEvent` with `projectId` from assignment
- Stores GPS evidence in `AttendanceEvidence` table

**Compliance Notes:**
- Resignation workflow per §5.5 of mvpv2.md
- Final pay computation includes all components
- Audit log for resign action
- Full CRUD operations with permission enforcement (admin/HR only)
- Project assignment enables location-based attendance validation

---

### 13. **Employee Profile** (`/employees/[id]`)

**Purpose:** Individual employee detail page with full history.

**Features:**

#### **Header:**
- Large avatar with initials
- Name, email, status badge
- Phone, location, department, role
- Salary (annual, formatted)
- Join date, work type
- "Edit Profile" button (admin/HR only)

#### **Tabs (5 tabs):**

##### Tab 1: **Overview**
- **Stats Cards (4 cards):**
  - Total Attendance Days
  - Total Leave Requests
  - Total Loans (₱)
  - Total Payslips
- **Profile Info:**
  - All employee fields displayed
  - Status, role, department, etc.

##### Tab 2: **Attendance**
- **Recent Attendance Table:**
  - Last 20 logs for this employee
  - Columns: Date, Project, Check In, Check Out, Hours, Status
  - Limited view (no actions)

##### Tab 3: **Leave**
- **Leave Requests Table:**
  - All leave requests for this employee
  - Columns: Type, Start, End, Days, Status, Reason

##### Tab 4: **Payslips**
- **Payslips Table:**
  - All payslips for this employee
  - Columns: Period, Gross, Deductions, Net Pay, Status, Issued At
  - Click to view detail

##### Tab 5: **Loans**
- **Loans Table:**
  - All loans for this employee
  - Columns: Type, Amount, Monthly, Remaining, Status

##### Tab 6: **Documents** (Mock)
- **Purpose:** Placeholder for future document uploads
- **Add Document Button:**
  - Input: Document name
  - Add → Adds to mock list (not persisted)
- **Documents Table:**
  - Name, Uploaded At
  - Mock data only

#### **Edit Profile Dialog:**
- Fields (pre-filled):
  - Name, Email, Phone
  - Role, Department, Work Type
  - Salary, Location
- Save → Updates employee record

**User Flow:**

**Admin/HR:**
```
Admin clicks employee name in directory → Lands on /employees/[id]
                                        → View overview stats
                                        → Click Attendance tab → See full history
                                        → Click Payslips tab → Review all payslips
                                        → Click "Edit Profile" → Update fields
                                        → Save → Profile updated
```

**Employee:**
```
Employee lands on own profile → View overview
                              → Check attendance history
                              → View payslips
                              → Cannot edit (no permission)
```

**Integration Points:**
- `useEmployeesStore` - employees, updateEmployee
- `useAttendanceStore` - logs (filtered by employee)
- `useLeaveStore` - requests (filtered by employee)
- `usePayrollStore` - payslips (filtered by employee)
- `useLoansStore` - loans (filtered by employee)

---

### 14. **Projects Page** (`/projects`)

**Purpose:** Project management with geofencing and employee assignments.

**Features:**

1. **Enhanced Location Selector with Map:**
   - **Interactive Map** (OpenStreetMap/Leaflet)
     - Click anywhere to set project location
     - Visual geofence circle overlay (adjustable 10m-1000m)
     - Auto-centers and zooms when location selected
     - Scroll to zoom, drag to pan
   - **Smart Search Bar**
     - Search by location name (e.g., "Makati CBD", "BGC", "SM Mall of Asia")
     - Auto-complete with dropdown suggestions
     - Biased to Philippines locations
     - Powered by Nominatim/OpenStreetMap geocoding
   - **Auto-Location Detection**
     - "Use Current Location" button
     - Uses browser GPS (high accuracy mode)
     - Permission handling with clear error messages
   - **Reverse Geocoding**
     - Automatically displays full address of selected location
     - Shows human-readable location instead of coordinates
     - Example: "123 Ayala Avenue, Makati, Metro Manila, Philippines"
   - **Radius Slider**
     - Visual adjustment (10m to 1000m)
     - Real-time geofence circle update
     - Default: 100m (standard for construction sites)

2. **Projects Table:**
   - Columns: ID, Name, Description, Location (coordinates), Radius, Status, Team, Actions
   - **Assigned Employees:**
     - Avatar stack (up to 3 avatars)
     - `+N` badge if more
   - **Status Dropdown:** Active, Completed, On Hold (with emoji indicators)
   - **Actions:**
     - **Assign Employees** button → Opens assign dialog
     - **Delete** button (admin/HR only) → Confirmation dialog

3. **Assign Employees Dialog:**
   - Shows current assignments
   - Checkbox list of all active employees
   - Check/uncheck to assign/unassign
   - Save → Updates project.assignedEmployeeIds
   - Sends notification to newly assigned employees (mock email)

4. **Location Display:**
   - Beautiful summary card with full address
   - Geofence radius badge
   - Emerald green theme for confirmed location
   - Coordinates shown only as fallback

**User Flow:**

**Admin/HR (Create Project with Location):**
```
Admin lands on projects → Click "Add Project"
                        → Enter project name & description
                        → (Option 1) Click "Use Current Location" 
                          → GPS detected → Map updates → Address shown
                        → (Option 2) Type "BGC Taguig" in search
                          → Select from dropdown → Map jumps to location
                        → (Option 3) Click on map → Pin dropped
                        → Adjust radius with slider (see green circle)
                        → Review full address in summary card
                        → Create → Project saved with geofence
```

**Employee Assignment:**
```
Admin clicks "Assign" on project → Checkbox list appears
                                 → Check employees to assign
                                 → Save → Mock notifications sent
                                 → Employee sees assignment
```

**Check-In Flow (from Attendance):**
```
Employee starts check-in → Request location
                         → Get GPS coords
                         → Find assigned project
                         → Check if within geofence (using saved lat/lng/radius)
                         → If yes: Allow check-in
                         → If no: Warn (but still allow in MVP)
```

**Integration Points:**
- `useProjectsStore` - projects, addProject, assignEmployee, removeEmployee, updateProject
- `useEmployeesStore` - employees list
- `isWithinGeofence()` - geofence validation (uses Haversine formula)
- `sendNotification()` - mock email for assignments
- Nominatim API - geocoding (forward & reverse)
- Browser Geolocation API - GPS detection

**Compliance Notes:**
- Geofencing per §4.1 of mvpv2.md
- Location evidence stored in attendance events
- Human-readable addresses for audit clarity

---

### 15. **Reports Page** (`/reports`)

**Purpose:** Generate 4 types of reports for admin/HR/finance.

**Access:** Admin, HR, Finance roles only.

**Features:**

#### **Tabs (4 tabs):**

##### Tab 1: **Payroll Register**
- **Purpose:** All payslips sorted by issued date
- **Table:**
  - Columns: Payslip ID, Employee, Period, Gross Pay, Total Deductions, Net Pay, Issued At, Status
  - Sorted descending by issuedAt
  - Shows all payslips (no filtering)

##### Tab 2: **Government Deductions Summary**
- **Purpose:** Total gov't contributions (for remittance)
- **Stats Cards (4 cards):**
  - Total SSS: ₱X,XXX
  - Total PhilHealth: ₱X,XXX
  - Total Pag-IBIG: ₱X,XXX
  - Total Tax: ₱X,XXX
- **Calculation:** Sums all deductions across all payslips

##### Tab 3: **Absence Report**
- **Purpose:** Track employee absences
- **Table:**
  - Columns: Employee, Total Absences (count)
  - Sorted by count (descending)
  - Shows employees with > 0 absences

##### Tab 4: **Late Report**
- **Purpose:** Track employee tardiness
- **Table:**
  - Columns: Employee, Late Incidents (count), Total Late Minutes
  - Sorted by total minutes (descending)
  - Shows employees with > 0 late minutes

**User Flow:**

**Admin/HR/Finance:**
```
Finance lands on reports → View Payroll Register tab
                         → Review all payslips
                         → Switch to Gov't Deductions
                         → See total SSS/PhilHealth/Pag-IBIG/Tax
                         → Export for remittance (future feature)
                         → Switch to Absence Report
                         → Review employees with high absences
                         → Switch to Late Report
                         → Review tardiness patterns
```

**Integration Points:**
- `usePayrollStore` - payslips (all)
- `useAttendanceStore` - logs (absence and late data)
- `useEmployeesStore` - employee names

**Compliance Notes:**
- Reports per §12 of mvpv2.md
- Government deduction summaries for BIR/SSS/PhilHealth/Pag-IBIG remittance

---

### 16. **Notifications Page** (`/notifications`)

**Purpose:** Mock email notification log (no actual emails sent).

**Access:** Admin, HR roles only.

**Features:**

1. **Notification Log Table:**
   - Columns: ID, Employee, Email, Type, Subject, Sent At
   - Type badges: assignment (blue), reassignment (purple), absence (red)
   - Shows all mock notifications sent by the system

2. **Notification Types:**
   - **Assignment:** Employee assigned to project
   - **Reassignment:** Employee reassigned to different project
   - **Absence:** Employee marked absent (sent by admin via attendance page)

3. **Clear All Button:**
   - Clears entire notification log
   - Confirmation required

**User Flow:**

**Admin/HR:**
```
Admin lands on notifications → View log of mock emails
                             → Review sent notifications
                             → Click "Clear All" if needed
```

**Notification Triggers:**
- **Project Assignment:** When employee assigned to project → Mock email sent
- **Absence Alert:** When admin clicks "Send Absence Notification" in attendance → Mock email sent

**Integration Points:**
- `useNotificationsStore` - logs, clearLogs
- `sendNotification()` - called from projects and attendance pages

---

### 17. **Settings Page** (`/settings`)

**Purpose:** Application preferences and configuration.

**Features:**

#### **Sections:**

##### 1. **Appearance (Theme)**
- **Options:** Light, Dark, System
- **Buttons:** 3 toggle buttons with icons
- Click → Updates theme in auth store
- Persisted in localStorage

##### 2. **Organization**
- **Fields:**
  - Company Name (editable input, default: "NexHRMS Inc.")
  - Industry (dropdown: Technology, Healthcare, Finance, Education)
- **Persistence:** Saved to localStorage key: `nexhrms-org-settings`

##### 3. **Roles & Permissions**
- **Display Only (no edit):**
  - Shows all 7 roles with descriptions:
    - **Admin:** Full system access
    - **HR:** Employee management, leave, attendance
    - **Finance:** Payroll, loans, salary
    - **Supervisor:** Timesheet approval
    - **Payroll Admin:** Payroll operations (no salary changes)
    - **Auditor:** Audit log access
    - **Employee:** Self-service
  - Pulled from `ROLE_ACCESS` constant

##### 4. **Timesheet Rule Sets**
- **Display Configured Rule Sets:**
  - Shows all rule sets from timesheet store
  - Per rule set card:
    - Name, ID
    - Standard hours/day
    - Grace period (minutes)
    - Rounding policy
    - OT approval requirement
    - Night diff window
  - **Note:** "Visit Timesheets to add one." (link)

##### 5. **Notifications (Mock Toggles)**
- **Toggles:**
  - Email Absence Alerts (on/off)
  - Email Leave Updates (on/off)
  - Email Payroll Alerts (on/off)
- **Persistence:** Saved to localStorage in org settings object

**User Flow:**

**All Roles:**
```
User lands on settings → Change theme (Light/Dark/System)
                       → Toggle applied immediately
                       → (Admin/HR) Edit company name
                       → View roles & permissions
                       → View timesheet rule sets
                       → Toggle notification preferences
```

**Integration Points:**
- `useAuthStore` - theme, setTheme
- `useTimesheetStore` - ruleSets (read-only)
- `localStorage` - org settings persistence

---

## Core User Flows

### Flow 1: **New Employee Onboarding**

```
Admin logs in
  ↓
Employees > Manage
  ↓
Click "Add Employee"
  ↓
Fill form: Name, Email, Role, Dept, Salary, Work Type, Location
  ↓
Generate ID: EMP-XXXXXX
  ↓
Save → Employee created
  ↓
(Optional) Projects → Assign employee to project
  ↓
Mock notification sent to employee
  ↓
Employee receives login credentials
  ↓
Employee logs in → Dashboard
```

---

### Flow 2: **Daily Attendance Check-In (Employee)**

```
Employee logs in (mobile or kiosk)
  ↓
Attendance page or Kiosk page
  ↓
(Option 1 - Kiosk) Enter PIN → Check In → Event appended
  ↓
(Option 2 - Web) Click "Check In" button
  ↓
Multi-step flow:
  1. Request Location → Navigator.geolocation API
  2. Get GPS coords (lat, lng)
  3. Find assigned project
  4. Check geofence: isWithinGeofence(lat, lng, project.location)
  5. (Future) Face recognition simulator
  6. Create attendance event:
     - eventType: "IN"
     - timestampUTC: now
     - deviceId: browser/kiosk ID
     - gpsLat, gpsLng, geofencePass
  ↓
Event appended to attendance store
  ↓
Attendance log auto-created or updated
  ↓
Success toast: "Checked in successfully"
  ↓
(At EOD) Employee clicks "Check Out" → Same flow
```

---

### Flow 3: **Leave Request & Approval**

```
Employee logs in
  ↓
Leave page
  ↓
View balance cards: VL, SL, EL remaining
  ↓
Click "New Request"
  ↓
Fill form:
  - Leave Type: VL
  - Start Date: 2026-03-01
  - End Date: 2026-03-03
  - Reason: "Family vacation"
  ↓
Submit → Request created, status: "pending"
  ↓
HR/Admin receives alert (mock)
  ↓
HR logs in → Leave page
  ↓
See pending requests
  ↓
Review reason, check balance
  ↓
Click "Approve"
  ↓
Request status: "approved"
  ↓
Leave store syncs to attendance store:
  - For each day in range (Mar 1-3):
    - Create/update attendance log
    - Set status: "on_leave"
  ↓
Employee notified (mock email)
  ↓
Dashboard updates: "On Leave" count increases
```

---

### Flow 4: **Semi-Monthly Payroll Processing (Bulk Issuance)**

```
Finance logs in (1st cutoff: Jan 1-15)
  ↓
Payroll page → Payslips tab
  ↓
Click "Issue Payslip"
  ↓
Select Month: Jan 2026, Cutoff: First Half (1-15th)
  ↓
Auto-displays: "Feb 1 – Feb 15, 2026"
  ↓
Click "Select All" button → All 10 active employees checked
  ↓
OR: Manually select specific employees (e.g., 5 out of 10)
  ↓
See selected count: "(5 selected)"
  ↓
(Optional) Add allowances: +₱3,000 (transport - applied to all)
  ↓
(Optional) Add other deductions: -₱500 (tardiness - applied to all)
  ↓
Review auto-compute notice:
  - Monthly gross from directory salary ✓
  - PH Gov't deductions (SSS, PhilHealth, Pag-IBIG, Tax) ✓
  - Active loan deductions (capped at 30% net) ✓
  - Net pay validation (must be > 0) ✓
  ↓
Click "Issue 5 Payslips" → Processing starts
  ↓
For each selected employee:
  1. Fetch salary from directory (e.g., ₱600k/yr → ₱50k/mo)
  2. Compute PH deductions:
     - SSS: ₱2,500
     - PhilHealth: ₱1,250
     - Pag-IBIG: ₱500
     - Tax: ₱8,333
  3. Get active loans → Loan deduction: ₱5,000
  4. Calculate net: ₱50,000 + ₱3,000 - ₱12,583 - ₱500 - ₱5,000 = ₱34,917
  5. If net > 0: Create payslip with status "issued"
  6. If net ≤ 0: Skip with error toast
  7. Record loan deduction in loan history
  8. Update loan balance: ₱50,000 → ₱45,000
  ↓
Success toast: "✅ Issued 5 payslips (incl. ₱25,000 total loan deductions)"
  ↓
All payslips appear in table with status: "issued"
  ↓
Finance reviews each → Click "Confirm" on each
  ↓
Status: "confirmed"
  ↓
(Repeat for all employees or use batch operations)
  ↓
Payroll → Runs tab
  ↓
Create Draft Run → Select date: 2026-01-15
  ↓
Validate Run → Status: "validated"
  ↓
Lock Run → Status: "locked"
  ↓
Policy snapshot created (SSS/PhilHealth/etc. versions)
  ↓
Publish Run → All payslips status: "published"
  ↓
Export Bank File → CSV downloaded
  ↓
(After bank transfer) Record Payment
  ↓
All payslips status: "paid"
  ↓
Employee logs in → See payslip
  ↓
Click "Sign" → Digital signature pad
  ↓
Status: "acknowledged"
```

---

### Flow 5: **Timesheet Computation & Approval**

```
Supervisor logs in
  ↓
Timesheets page
  ↓
Click "Compute Timesheet"
  ↓
Select Employee: Maria Santos
  ↓
Select Date: 2026-02-15
  ↓
Shift Start: 08:00, Shift End: 17:00
  ↓
Rule Set: RS-DEFAULT (8h/day, 10min grace, OT approval required)
  ↓
System looks up attendance log for Maria on 2026-02-15:
  - Found: Check In: 08:10, Check Out: 19:30
  ↓
Compute timesheet:
  - Regular Hours: 8.0 (08:10-17:00, rounded with grace)
  - Overtime Hours: 2.5 (17:00-19:30)
  - Night Diff Hours: 0.0
  - Late Minutes: 10 (within grace, excused)
  - Undertime Minutes: 0
  - Segments created: [regular 8h, overtime 2.5h]
  ↓
Timesheet created, status: "computed"
  ↓
Maria logs in → Timesheets page
  ↓
See computed timesheet
  ↓
Review hours → Click "Submit"
  ↓
Status: "submitted"
  ↓
Supervisor reviews → Timesheets page
  ↓
Filter: Status = "submitted"
  ↓
Review Maria's timesheet
  ↓
Click "Approve"
  ↓
Status: "approved"
  ↓
Payroll can now use approved timesheet for next payslip
```

---

### Flow 6: **Loan Creation & Repayment**

```
Finance logs in
  ↓
Loans page
  ↓
Click "Create Loan"
  ↓
Fill form:
  - Employee: Pedro Cruz
  - Type: Cash Advance
  - Amount: ₱50,000
  - Monthly Deduction: ₱5,000
  - Deduction Cap: 30% of net pay
  - Remarks: "Emergency medical expense"
  ↓
System calculates: ~10 installments
  ↓
Create → Loan created, status: "active"
  ↓
Loan appears in Active Loans table
  ↓
(Next payslip cycle)
  ↓
Finance issues payslip for Pedro
  ↓
System auto-calculates:
  - Net pay before loan: ₱40,000
  - 30% cap: ₱12,000
  - Loan deduction: min(₱5,000, ₱12,000, remaining balance) = ₱5,000
  ↓
Payslip created with loan deduction: ₱5,000
  ↓
Loan store updated:
  - Remaining balance: ₱50,000 → ₱45,000
  - Deduction history entry created
  - Schedule: Installment #1 marked "paid"
  ↓
(Repeat for 10 months)
  ↓
Final installment: ₱5,000 → Remaining: ₱0
  ↓
Loan status: "settled" (manual or auto)
```

---

### Flow 7: **Employee Resignation & Final Pay**

```
HR logs in
  ↓
Employees > Manage
  ↓
Filter to find resigning employee
  ↓
Click "Resign" button on row
  ↓
AlertDialog opens:
  "Are you sure you want to resign Employee X?"
  ↓
System computes final pay:
  - Days worked in final month: 20 days
  - Pro-rated salary: ₱50,000 × (20/30) = ₱33,333
  - Unused leave days: 5 VL + 3 SL = 8 days
  - Leave conversion: 8 × (₱50,000/30) = ₱13,333
  - Unpaid OT: 10 hours × hourly rate = ₱2,500
  - Remaining loan balance: -₱25,000
  - Gov't deductions: -₱5,000
  - Net final pay: ₱19,166
  ↓
Dialog shows breakdown
  ↓
HR clicks "Confirm"
  ↓
Employee store:
  - Employee status: "resigned"
  - resignedAt: today's date
  ↓
Payroll store:
  - FinalPayComputation created
  - status: "draft"
  ↓
Audit log: "employee_resign" action recorded
  ↓
Finance reviews → Payroll > Final Pay tab
  ↓
See final pay computation
  ↓
Validate → Approve → Publish → Pay
  ↓
Employee receives final payslip
```

---

### Flow 8: **Audit Trail Review**

```
Auditor logs in
  ↓
Audit page (only admin/auditor can access)
  ↓
View stats:
  - Total Entries: 1,234
  - Unique Actions: 22
  - Today's Entries: 45
  ↓
Filter by action: "payroll_lock"
  ↓
Table shows all payroll lock actions:
  - Timestamp, Action, Entity (Run ID), Performed By
  ↓
Click "View Details" on entry
  ↓
Dialog shows:
  - Full audit entry
  - Before state: { runs: [...], locked: false }
  - After state: { runs: [...], locked: true, policySnapshot: {...} }
  - Performed by: FINANCE-001
  ↓
Auditor reviews → No edit/delete (immutable)
  ↓
Export report (future feature)
```

---

## Data Flow & Integration Points

### **Store Dependencies Map:**

```
auth.store
  └─ (independent, no deps)

employees.store
  ├─ imports: audit.store (for logging)
  └─ exports: employees, salaryRequests, salaryHistory

attendance.store
  ├─ imports: audit.store (for logging)
  ├─ exports: logs, events, evidence, exceptions, overtimeRequests
  └─ used by: dashboard, attendance page, employee profile, reports, timesheets

leave.store
  ├─ imports: audit.store (for logging)
  ├─ exports: requests, policies, balances
  ├─ syncs to: attendance.store (marks days as "on_leave")
  └─ used by: dashboard, leave page, employee profile, reports

loans.store
  ├─ imports: audit.store (for logging)
  ├─ exports: loans, schedules, deductions
  ├─ integrates with: payroll.store (auto-deduction)
  └─ used by: dashboard, loans page, employee profile, payroll page

payroll.store
  ├─ imports: audit.store, loans.store (for logging & deductions)
  ├─ exports: payslips, runs, adjustments, finalPayComputations
  ├─ integrates with: loans.store (records deductions)
  └─ used by: dashboard, payroll page, employee profile, reports

projects.store
  ├─ imports: notifications.store (for assignment alerts)
  ├─ exports: projects, assignments
  └─ used by: attendance page (geofence), projects page

timesheet.store
  ├─ imports: attendance.store (source data), audit.store
  ├─ exports: timesheets, ruleSets
  └─ used by: timesheets page, settings

audit.store
  └─ (sink, no exports, only appends)
  └─ used by: audit page, all other stores (logging)

events.store
  └─ exports: calendar events (birthdays)
  └─ used by: dashboard

notifications.store
  └─ exports: notification logs (mock emails)
  └─ used by: notifications page, projects page, attendance page

ui.store
  └─ exports: sidebar, topbar state
  └─ used by: app-shell
```

### **Critical Integration Points:**

1. **Leave → Attendance Sync:**
   - When leave request approved → `useAttendanceStore.setState()` called
   - Creates/updates logs with status "on_leave"

2. **Payroll → Loans Deduction:**
   - When payslip issued → `getActiveByEmployee()` called
   - Calculates total loan deduction (capped at X% net pay)
   - Calls `recordDeduction()` for each loan
   - Updates loan remaining balance

3. **Employee Resignation → Final Pay:**
   - When employee resigned → `resignEmployee()` called
   - Calls `computeFinalPay()` in payroll store
   - Queries loans store (remaining balance)
   - Queries leave store (unused days)
   - Creates FinalPayComputation

4. **Attendance Events → Timesheets:**
   - Timesheets page calls `computeTimesheet()`
   - Reads from `useAttendanceStore.logs`
   - Applies rule set to compute hours/OT/night diff
   - Saves to timesheet store

5. **All Critical Actions → Audit Log:**
   - Every important action calls `logAudit()`
   - Appends to audit.store
   - Immutable, cannot be deleted

---

## Compliance & Audit Trail

### **mvpv2.md Section Mapping:**

| Section | Feature | Page(s) | Implementation Status |
|---------|---------|---------|----------------------|
| §1 | Employee Status Lifecycle | Employees/Manage, Directory | ✅ Complete |
| §2 | Work Type (WFO/WFH/Hybrid) | Employees/Manage, Directory | ✅ Complete |
| §3 | Projects & Geofencing | Projects, Attendance | ✅ Complete |
| §4 | Attendance Event Ledger | Attendance (Events tab) | ✅ Complete |
| §4.3 | Face Verification Evidence | Attendance (simulator) | ✅ MVP (mock) |
| §4.4 | Exceptions Auto-Gen | Attendance (Exceptions tab) | ✅ Complete |
| §5 | Payroll Runs (Draft→Validated→Locked) | Payroll (Runs tab) | ✅ Complete |
| §5.3 | Policy Snapshots on Lock | Payroll store | ✅ Complete |
| §5.4 | Post-Lock Adjustments | Payroll (Adjustments tab) | ✅ Complete |
| §5.5 | Final Pay | Payroll (Final Pay tab), Employees/Manage | ✅ Complete |
| §6 | PH Tax Deductions | Payroll page | ✅ Complete |
| §7 | Payslip Status Workflow | Payroll page | ✅ Complete (issued→confirmed→published→paid→acknowledged) |
| §8 | Semi-Monthly Cutoffs | Payroll page | ✅ Complete |
| §9 | Leave Accrual & Policies | Leave page | ✅ Complete |
| §10 | Loan Deduction Cap | Loans page, Payroll store | ✅ Complete |
| §10 | Timesheet Segments | Timesheets page | ✅ Complete |
| §11 | Salary Governance | Employees/Directory | ✅ Complete |
| §12 | Reports (4 types) | Reports page | ✅ Complete |
| §13 | Audit Trail | Audit page | ✅ Complete |
| §14 | 7 Roles + RBAC | All pages | ✅ Complete |
| §15 | Timesheet Rule Sets | Timesheets, Settings | ✅ Complete |

### **Audit Actions Logged:**

All critical actions are logged to the audit store:

- Employee lifecycle: `employee_activate`, `employee_deactivate`, `employee_resign`
- Salary changes: `salary_proposal`, `salary_approval`
- Leave: `leave_approval`, `leave_rejection`
- Overtime: `overtime_approval`, `overtime_rejection`
- Payroll: `payroll_lock`, `payroll_publish`, `payment_record`
- Adjustments: `adjustment_create`, `adjustment_approve`
- Loans: `loan_create`, `loan_freeze`, `loan_unfreeze`
- Timesheets: `timesheet_approve`, `timesheet_reject`
- Attendance: `attendance_exception_resolve`
- Final Pay: `final_pay_compute`
- Payslips: `payslip_sign`

---

## Summary & Recommendations

### **Current State:**
✅ **All 17 pages implemented and functional**  
✅ **190 tests passing** (11 test suites)  
✅ **Production build successful** (0 TypeScript errors)  
✅ **Full PH payroll compliance** (SSS, PhilHealth, Pag-IBIG, tax)  
✅ **Role-based access control** (7 roles with granular permissions)  
✅ **Audit trail** (immutable log of all critical actions)  

### **User Flow Validation:**
✅ **Employee onboarding** → Add employee → Assign project → Notifications sent  
✅ **Daily attendance** → Check-in with geofence → Event ledger → Logs created  
✅ **Leave management** → Request → Approval → Attendance sync  
✅ **Payroll processing** → Semi-monthly cutoffs → Issue → Confirm → Lock → Publish → Pay  
✅ **Timesheets** → Compute from events → Submit → Approve  
✅ **Loans** → Create → Deduct on payslip → Track schedule → Settle  
✅ **Resignation** → Compute final pay → Leave conversion → Loan offset  
✅ **Audit** → All actions logged → Immutable trail  

### **Design Consistency:**
✅ All pages use consistent shadcn/ui components  
✅ Color scheme: Emerald (green), Amber (warning), Red (danger), Blue (info)  
✅ Status badges uniformly colored across all modules  
✅ Card-based layouts with border/shadow styling  
✅ Responsive tables with pagination where needed  
✅ Dialog/Sheet patterns consistent  

### **Next Steps (Post-MVP):**
1. **Database Integration:** Migrate from localStorage to PostgreSQL/MySQL
2. **Real Authentication:** Replace mock auth with JWT/OAuth
3. **File Uploads:** Replace mock documents with S3/cloud storage
4. **Email Notifications:** Replace mock emails with Resend/SendGrid
5. **Mobile App:** React Native companion for check-in/out
6. **Real Biometrics:** Replace face recognition simulator with actual SDK
7. **Report Exports:** Add PDF/Excel export for all reports
8. **Bulk Operations:** Add CSV import for employees, payslips
9. **Advanced Analytics:** Charts for trends, forecasting
10. **Multi-Tenant:** Add organization/company separation

---

**Document Status:** ✅ Complete  
**Last Updated:** February 20, 2026  
**Maintainer:** NexHRMS Development Team
