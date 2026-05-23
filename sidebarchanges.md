# Sidebar Redesign — Admin Implementation Plan
**Principal UI/UX Lead · May 2026**

---

## 1. Problem with the Current Sidebar

The existing sidebar renders a single flat list of ~20 items with no visual grouping. As features grow (BIR, kiosk, settings sub-pages), the list becomes unscrollable and impossible to scan. Users must read every item to find what they need. This fails the "5-second navigation" rule.

---

## 2. Design Principles

- **Grouped sections** — 6 labelled sections so users can jump to the right quadrant instantly
- **Static labels, no accordion** — role-gating already reduces items to a manageable set; collapsing groups adds latency and frustration
- **Consistent iconography** — every item has a Lucide icon; section labels are small-caps visual anchors
- **Collapsed mode preserved** — icon-only state remains; section labels hide, thin dividers separate groups
- **Zero new dependencies** — Tailwind + shadcn/ui only

---

## 3. Route Inventory (Existing Pages Mapped to Groups)

> Items marked ❌ have no page yet — **do not add to nav until the page exists**.

| Nav Label | Route | Status | Group | admin | hr | finance | payroll_admin | supervisor | employee | auditor |
|---|---|---|---|---|---|---|---|---|---|---|
| Dashboard | /dashboard | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Employees | /employees/manage | ✅ | HR | ✅ | ✅ | ✅ | — | ✅ | — | ✅ |
| Departments | /employees/departments | ❌ | HR | — | — | — | — | — | — | — |
| Positions | /employees/positions | ❌ | HR | — | — | — | — | — | — | — |
| Documents | /documents | ❌ | HR | — | — | — | — | — | — | — |
| Disciplinary | /disciplinary | ❌ | HR | — | — | — | — | — | — | — |
| Projects | /projects | ✅ | HR | ✅ | ✅ | — | — | ✅ | — | — |
| Tasks | /tasks | ✅ | HR | ✅ | ✅ | — | — | ✅ | ✅ | — |
| Attendance | /attendance | ✅ | ATTENDANCE | ✅ | ✅ | — | — | ✅ | ✅ | — |
| Timesheets | /timesheets | ✅ | ATTENDANCE | ✅ | ✅ | — | ✅ | ✅ | — | — |
| Shifts | /settings/shifts | ✅ | ATTENDANCE | ✅ | ✅ | — | — | — | — | — |
| Kiosk (QR) | /kiosk/qr | ✅ | ATTENDANCE | ✅ | ✅ | — | — | — | — | — |
| Kiosk (Face) | /kiosk/face | ✅ | ATTENDANCE | ✅ | ✅ | — | — | — | — | — |
| Face Enrollment | /face-enrollment | ✅ | ATTENDANCE | — | — | — | — | ✅ | ✅ | — |
| Events | /events | ✅ | ATTENDANCE | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Biometric Devices | /biometric | ❌ | ATTENDANCE | — | — | — | — | — | — | — |
| Holidays | /settings/holidays | ❌ | ATTENDANCE | — | — | — | — | — | — | — |
| Payroll Runs | /payroll | ✅ | PAYROLL | ✅ | — | ✅ | ✅ | — | — | — |
| My Payslips | /my-payslips | ✅ | PAYROLL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Loans | /loans | ✅ | PAYROLL | ✅ | — | ✅ | ✅ | — | ✅ | — |
| Gov. Contributions | /reports/government | ✅ | PAYROLL | ✅ | ✅ | ✅ | ✅ | — | — | — |
| BIR Compliance | /payroll/bir-compliance | ✅ | PAYROLL | ✅ | — | ✅ | ✅ | — | — | — |
| Leave | /leave | ✅ | WORKFLOW | ✅ | ✅ | — | — | ✅ | ✅ | — |
| Messages | /messages | ✅ | WORKFLOW | ✅ | ✅ | — | — | ✅ | ✅ | — |
| Approvals | /approvals | ❌ | WORKFLOW | — | — | — | — | — | — | — |
| Notifications | /notifications | ✅ | WORKFLOW | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reports | /reports | ✅ | REPORTS | ✅ | ✅ | ✅ | ✅ | — | — | ✅ |
| Audit Log | /audit | ✅ | REPORTS | ✅ | — | — | — | — | — | ✅ |
| Settings | /settings | ✅ | ADMIN | ✅ | — | — | — | — | ✅ | ✅ |
| Roles & Perms | /settings/roles | ✅ | ADMIN | ✅ | — | — | — | — | — | — |
| Organization | /settings/organization | ✅ | ADMIN | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Appearance | /settings/appearance | ✅ | ADMIN | ✅ | — | — | — | — | — | — |
| Tax Rules | /payroll/settings | ✅ | ADMIN | ✅ | — | ✅ | ✅ | — | — | — |
| My Profile | /profile | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 4. Final Admin Sidebar (v2 — live routes only)

```
Dashboard

─── HR ──────────────────────────────
  Employees          /employees/manage
  Projects           /projects           [module: projects]
  Tasks              /tasks              [module: tasks]

─── ATTENDANCE ───────────────────────
  Attendance         /attendance
  Timesheets         /timesheets
  Shifts             /settings/shifts
  Kiosk (QR)         /kiosk/qr           [absolute route]
  Kiosk (Face)       /kiosk/face         [absolute route]
  Events             /events             [module: events]

─── PAYROLL ──────────────────────────
  Payroll Runs       /payroll
  My Payslips        /my-payslips
  Loans              /loans
  Gov. Contributions /reports/government
  BIR Compliance     /payroll/bir-compliance

─── WORKFLOW ─────────────────────────
  Leave              /leave
  Messages           /messages           [module: messages]
  Notifications      /notifications

─── REPORTS ──────────────────────────
  Reports            /reports
  Audit Log          /audit

─── ADMIN ────────────────────────────
  Settings           /settings
  Roles & Perms      /settings/roles
  Organization       /settings/organization
  Appearance         /settings/appearance
  Tax Rules          /payroll/settings
```

---

## 5. Technical Implementation

### 5.1 `src/lib/constants.ts`

Add before `NAV_ITEMS`:

```ts
export type NavGroup = "hr" | "attendance" | "payroll" | "workflow" | "reports" | "admin";

export const NAV_GROUPS: { key: NavGroup; label: string }[] = [
    { key: "hr",         label: "HR" },
    { key: "attendance", label: "Attendance" },
    { key: "payroll",    label: "Payroll" },
    { key: "workflow",   label: "Workflow" },
    { key: "reports",    label: "Reports" },
    { key: "admin",      label: "Admin" },
];
```

Add `group?: NavGroup` to the `NAV_ITEMS` array type.

Each existing item gets a `group` field assigned per the table above.

Add 6 new items: Gov. Contributions, BIR Compliance, Roles & Perms, Organization, Appearance, Tax Rules.

### 5.2 `src/components/shell/sidebar.tsx`

- Import `NAV_GROUPS` from `@/lib/constants`
- Add new Lucide icons: `Landmark`, `ReceiptText`, `ShieldCheck`, `Paintbrush`, `Calculator`
- Add a `groupedNav` useMemo that splits `filtered.systemItems` into `topLevel` (no group) and `sections` (grouped)
- Extract `renderNavItem` as an inline function to avoid duplication
- Update `navContent`:
  - Render `topLevel` items first (Dashboard)
  - For each section: `border-t` divider → section label (hidden in collapsed mode) → items
  - Section label style: `text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/40`

### 5.3 UX Details

| State | Section label | Divider | Items |
|---|---|---|---|
| Expanded (desktop) | ✅ visible | ✅ | icon + label |
| Collapsed (icon-only) | ❌ hidden | ✅ thin divider | icon only + tooltip |
| Mobile drawer | ✅ visible | ✅ | icon + label |

Active page highlight: unchanged (`bg-sidebar-primary text-sidebar-primary-foreground shadow-sm`).

---

## 6. Planned Items (Future Sprint)

The following were in the original spec but have no page yet. Add them to NAV_ITEMS once their pages exist:

| Item | Group | Route to build |
|---|---|---|
| Departments | HR | /employees/departments |
| Positions | HR | /employees/positions |
| Documents | HR | /documents |
| Disciplinary | HR | /disciplinary |
| Biometric Devices | Attendance | /biometric |
| Holidays | Attendance | /settings/holidays |
| Approvals | Workflow | /approvals |


