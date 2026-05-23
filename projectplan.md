# NexHRMS — Antigravity MVP Build Spec (Next.js + shadcn/ui + Zustand)

Act as a **Senior Lead Full Stack Engineer and UI/UX Expert**. You are building a modern, high-performance SaaS HRMS application called **"NexHRMS"**. Deliver an MVP that is visually aligned with the provided UI references (dashboard, employee directory cards, employee management table, advanced filter drawer/modal), while staying implementation-ready and maintainable.

---

## 0) North Star Outcomes (MVP)

**Objective:** Ship a polished HRMS MVP that can be demoed end-to-end with realistic seeded data and clean UX flows.

**In-Scope Modules (MVP):**
- Dashboard (KPI + charts + widgets)
- Employees (Manage table, Directory grid, Employee profile)
- Attendance (logs + check-in/out mock actions)
- Leave (request + approval queue)
- Payroll (runs list stub + payslip inbox + confirmation flow)
- Settings (theme + org + prefs stubs)
- RBAC (client-side gating)

**Out of Scope (MVP):**
- Real auth backend / SSO
- Real payroll computation + government filing integrations
- Biometrics device integrations
- Bank disbursement automation
- Multi-tenant backend (keep the app multi-tenant-ready structurally)

---

## 1) Tech Stack & Standards

**Framework**
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- recharts
- Zustand (client state)
- react-hook-form + zod (forms + validation)
- sonner (toasts)

**Engineering Standards**
- Strict TypeScript
- ESLint + Prettier
- Component-driven architecture
- Accessible UI (AA contrast, keyboard navigation, focus states)
- Deterministic layout system (spacing + typography scale)

**Performance Targets (MVP)**
- Fast initial load (static/streamed where possible)
- Memoized tables and filtered lists
- Virtualization optional (prepare an adapter for it)

---

## 2) Antigravity Design System (Premium SaaS)

Implement a cohesive “Antigravity” design language:
- **Clean grid**, strong whitespace, soft elevation
- **Glassmorphism accents** (subtle blur on cards/drawers)
- **Motion principles:** smooth float transitions only (no elastic/bouncy easing)
- **Theme:** Light + Dark, monochrome-first
  - Light: white background, charcoal text
  - Dark: near-black background, off-white text
  - Accent: minimal (neutral/gray), optional muted emerald for “Active” statuses and charts
- **Typography:** modern SaaS scale; clear hierarchy (Dashboard headings > widgets > table text)
- **States:** active/inactive, pending/approved/rejected, success/warn/error

**UI references to replicate (high-level patterns):**
- Left sidebar navigation
- Top bar with search, notifications, profile
- KPI tiles (present/absent/on leave/total)
- Team performance line chart + time range selector
- Donut chart with role distribution legend
- Employee table with sorting, column toggles, pagination
- Directory grid with employee cards + status badge
- Advanced filters drawer/modal with:
  - Employee ID range
  - Work type (Both/WFH/WFO)
  - Department multi-select
  - Salary range slider
  - Date range picker

---

## 3) App Routes & Feature Requirements

### 3.1 `/dashboard`
**Primary Widgets**
- Welcome card (user greeting + call-to-action)
- KPI cards:
  - Total Present
  - Total Absent
  - Total On Leave
  - Total Employees
- Team Performance (line chart):
  - Toggle between teams (Designer/Developer/etc.)
  - Time range selector (Last year / Last 30 days / YTD)
- Total Employees (donut chart):
  - Role distribution legend
- Employee Status table widget:
  - ID, Name, Role, Status, Team Leader, View
  - Sortable columns
- Events & Meetings widget:
  - List + “Add” (MVP creates local event)
- Birthdays widget:
  - Month selector + list

**Global Search**
- Search input in top bar
- Command Palette (Cmd/Ctrl+K): navigate + quick employee lookup

---

### 3.2 `/employees/manage`
**Table-driven management view**
- Filters row:
  - Status (All/Active/Inactive)
  - Type (Experience/Fresher/etc.)
  - Date picker (join date)
  - “Advanced filter” button opens drawer/modal
- Table columns (MVP baseline):
  - ID, Name, Status, Type, Team Leader, Role, Productivity, Joining date, Salary, Work type, View (actions)
- Row actions:
  - View profile
  - Edit (modal)
  - Activate/Deactivate
- Column visibility toggle
- Pagination + page size
- Search employees by name/email/id
- Productivity rendered as a progress bar

---

### 3.3 `/employees/directory`
**Card grid directory**
- Card content:
  - Avatar
  - Name + status badge
  - Role
  - Email
  - Location
  - Contact
  - Birthday
- Search and filters (reuse advanced filter)
- Clicking a card opens:
  - Profile drawer OR routes to `/employees/:id` (choose one; routing preferred)

---

### 3.4 `/employees/:id`
**Employee profile**
- Header: avatar, name, role, status, work type
- Tabs:
  - Overview
  - Employment details
  - Attendance summary
  - Leave summary
  - Payslips (inbox)
  - Documents (placeholder)
- Actions:
  - Edit profile (modal)
  - Deactivate/Activate
  - For employee role: confirm payslip (see payroll module)

---

### 3.5 `/attendance`
**Attendance MVP**
- Daily logs table:
  - Date, Employee, Check-in, Check-out, Hours, Status
- Mock actions:
  - Check-in / Check-out (updates store)
- Filters:
  - Date range
  - Employee selector
- Export CSV (stub action with toast)

---

### 3.6 `/leave`
**Leave MVP**
- Leave requests list:
  - Employee, Type, Date range, Reason, Status
- Create request modal (employee)
- Approval queue (hr/admin):
  - Approve/Reject
- Validation:
  - Date range required
  - Reason min length
- Status badges:
  - Pending, Approved, Rejected

---

### 3.7 `/payroll`
**Payroll & payslip confirmation (MVP)**
- Payroll runs list (stub):
  - Run date, cutoff range, status
- Payslip inbox:
  - Employee view: Pending / Confirmed
  - Finance/CEO view: send payslip to employee (local store write)
- Payslip object (MVP fields):
  - payslipId, employeeId, periodStart, periodEnd, netPay, issuedAt, status, notes, attachments (stub)
- Confirmation flow:
  - Employee clicks “Confirm Receipt”
  - Status updates to Confirmed + timestamp
  - Toast feedback

---

### 3.8 `/settings`
- Theme toggle (light/dark/system)
- Organization profile (stub)
- Roles & permissions (stub)
- Notification preferences (stub)

---

## 4) RBAC (Client-side MVP)

Implement role-based gating via `authStore`:
- Roles: `admin`, `hr`, `finance`, `employee`

**Access Matrix (MVP)**
- Admin: all pages + actions
- HR: employees, attendance, leave approvals, dashboard
- Finance: payroll, payslip issuing, dashboard
- Employee: own profile, attendance (self), leave (self), payslip inbox + confirm

No backend auth required; provide a demo switcher in UI.

---

## 5) State Management (Zustand)

**Requirements**
- Use Zustand slices per domain
- Persist to `localStorage` with versioning
- Provide selectors to prevent unnecessary renders
- Derived state for KPI widgets (present/absent/on leave/total employees)

**Stores**
- `authStore`: role, demo user, theme preference
- `employeesStore`: employees array, CRUD, filters, directory search
- `attendanceStore`: logs, per-employee summaries
- `leaveStore`: requests, create/update, approvals
- `payrollStore`: runs, payslips, issue/confirm
- `eventsStore`: events list for dashboard widget
- `uiStore`: sidebar state, command palette, column visibility

---

## 6) Data Model (MVP Types)

### Employee
- `id: string` (e.g., 1256)
- `name: string`
- `email: string`
- `role: string` (UI/UX Designer, Developer, HR, etc.)
- `department: string`
- `status: "active" | "inactive"`
- `workType: "WFH" | "WFO" | "HYBRID"`
- `salary: number`
- `joinDate: string` (ISO)
- `productivity: number` (0–100)
- `location: string`
- `phone?: string`
- `birthday?: string` (ISO)
- `teamLeader?: string`
- `avatarUrl?: string`

### AttendanceLog
- `id: string`
- `employeeId: string`
- `date: string`
- `checkIn?: string`
- `checkOut?: string`
- `hours?: number`
- `status: "present" | "absent" | "on_leave"`

### LeaveRequest
- `id: string`
- `employeeId: string`
- `type: "SL" | "VL" | "EL" | "OTHER"`
- `startDate: string`
- `endDate: string`
- `reason: string`
- `status: "pending" | "approved" | "rejected"`
- `reviewedBy?: string`
- `reviewedAt?: string`

### Payslip
- `id: string`
- `employeeId: string`
- `periodStart: string`
- `periodEnd: string`
- `netPay: number`
- `issuedAt: string`
- `status: "pending" | "confirmed"`
- `confirmedAt?: string`
- `notes?: string`

### Event
- `id: string`
- `title: string`
- `time: string`
- `date: string`
- `type?: string`

---

## 7) UI Components (shadcn-first)

Use shadcn components wherever possible:
- Layout: `Card`, `Separator`, `ScrollArea`
- Inputs: `Input`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Slider`
- Navigation: custom sidebar + `DropdownMenu`
- Overlays: `Dialog`, `Sheet` (for filters), `Popover`, `Tooltip`
- Data: `Table`, `Badge`, `Avatar`, `Pagination`
- Feedback: `Skeleton`, `Sonner` toast
- Search: `Command` for command palette

**Key Custom Components**
- `AppShell` (sidebar + topbar)
- `SidebarNav` (RBAC-aware)
- `KpiCard`
- `TeamPerformanceChart` (recharts line chart)
- `RoleDonutChart` (recharts pie/donut)
- `EmployeeTable` (sorting, pagination, column toggles)
- `EmployeeDirectoryGrid`
- `AdvancedFilterSheet` (matches reference UX)
- `EmployeeProfileTabs`
- `PayslipInbox`

---

## 8) Layout & Responsiveness

- Desktop: match reference spacing and card layout
- Tablet: collapse sidebar to icons or drawer
- Mobile: sidebar becomes sheet, tables become stacked or horizontally scrollable
- Ensure sticky topbar and scroll containment are handled cleanly

---

## 9) Motion & Micro-interactions

- Use subtle transitions (`transition`, `duration-200/300`) and gentle ease
- Hover lifts: translateY(-1/-2) + shadow increase
- Glass panels: `backdrop-blur` with careful opacity
- No bouncy animations; maintain premium stability

---

## 10) Seed Data & Demo Flows

**Seed**
- 20–40 employees across departments/roles
- Attendance logs for last 30 days (mix of present/absent/on_leave)
- Leave requests (pending/approved/rejected)
- Payslips (pending/confirmed)
- Events + birthdays

**Demo Role Switcher**
- Quick switch: Admin / HR / Finance / Employee
- Use this to validate RBAC gating and feature access

---

## 11) Repo Structure (Required)

/app
/(auth?) optional
/dashboard
/employees
/manage
/directory
/[id]
/attendance
/leave
/payroll
/settings
/components
/ui (shadcn)
/shell
/employees
/dashboard
/attendance
/leave
/payroll
/store
auth.store.ts
employees.store.ts
attendance.store.ts
leave.store.ts
payroll.store.ts
events.store.ts
ui.store.ts
/lib
utils.ts
format.ts
constants.ts
/data
seed.ts
/types
index.ts


---

## 12) Acceptance Criteria (Definition of Done)

**Design & UX**
- Looks and feels aligned with the references
- Light + dark mode fully implemented and consistent
- Advanced filter drawer/modal matches reference patterns
- Accessible forms and navigation

**Functionality**
- Dashboard KPIs reflect store data accurately
- Employee Manage table supports search, sorting, pagination, column toggles
- Directory grid filters correctly
- Profile view loads employee + related records
- Attendance check-in/out updates logs
- Leave request create + approve/reject works
- Payroll payslip issue + confirm works end-to-end
- RBAC gates navigation and actions correctly

**Engineering**
- Clean TypeScript types
- No console errors
- Stores are modular and persisted
- Component boundaries are clean and reusable

---

## 13) Implementation Notes (Build Order)

1) Scaffold Next.js + Tailwind + shadcn + theme toggle  
2) AppShell (sidebar/topbar) + RBAC gating + command palette  
3) Seed data + Zustand stores + persistence  
4) Employees Manage table + Advanced filter sheet  
5) Directory grid + Employee profile route  
6) Dashboard widgets + charts  
7) Attendance + Leave flows  
8) Payroll + payslip inbox + confirmation  
9) Polish: empty states, skeletons, responsive fixes, a11y pass

---

## 14) Output Required From You (Builder)

Deliver:
- Complete Next.js project code with the structure above
- All routes implemented and wired to Zustand
- shadcn components installed and used consistently
- Seed data included and loaded by default
- Light/dark theme toggle working
- MVP demo-ready UX with premium Antigravity design finish

---

## 15) Non-Negotiables

- Use **Zustand** as the single source of truth for MVP data
- Use **shadcn/ui** for UI primitives
- Match the reference UI patterns (sidebar/topbar/cards/tables/filters)
- Keep the system modular, scalable, and “enterprise-ready” in structure
- Maintain premium visual quality with consistent spacing and typography

---