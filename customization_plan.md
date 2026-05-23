# NexHRMS — Admin Customization System Plan
### Dynamic Roles · Permission Matrix · Dashboard Builder · Custom Pages

> **Assessment: Fully Doable ✅**
> Everything below is achievable within the current stack (Next.js 16 App Router, Zustand, Tailwind, no backend).
> No external paid services needed. Estimated total effort: ~12–16 focused dev sessions.

---

## Feasibility Analysis

| Feature | Doable? | Complexity | Notes |
|---------|---------|---------|-------|
| Custom roles (CRUD) | ✅ Yes | Low | Extend types + new Zustand store |
| Permission matrix per role | ✅ Yes | Low-Medium | Replace hardcoded `isAdmin` checks with `usePermission()` hook |
| Assign roles to users | ✅ Yes | Low | Extend `employees.store` + `auth.store` |
| Custom dashboard per role | ✅ Yes | Medium | Widget registry + JSON layout config |
| Drag-to-reorder dashboard | ✅ Yes | Medium | `@dnd-kit/core` (already tree-shakeable, tiny) |
| Custom pages (page builder) | ✅ Yes | Medium | Dynamic route `/custom/[slug]` + JSON renderer |
| Sidebar auto-shows custom pages | ✅ Yes | Low | Sidebar reads custom pages from store |
| Custom page content widgets | ✅ Yes | Medium | Same widget registry as dashboards |
| Custom icon/color per role | ✅ Yes | Low | Lucide icon picker + color picker |
| Export/import role configs | ✅ Yes | Low | JSON download/upload |

**What is NOT feasible without a real backend:**
- Role-based server-side route protection (App Router middleware can be added later)
- Multi-tenant role configs
- Real-time sync across browser sessions

---

## Architecture Overview

```
src/
├── store/
│   ├── roles.store.ts          ← NEW: custom role CRUD + permission matrix
│   └── page-builder.store.ts   ← NEW: custom page configs + dashboard layouts
├── types/
│   └── index.ts                ← EXTEND: Role, Permission, WidgetConfig, CustomPage
├── lib/
│   └── permissions.ts          ← NEW: permission check helpers + usePermission() hook
├── components/
│   ├── shell/
│   │   └── sidebar.tsx         ← MODIFY: render custom pages + hide nav by permission
│   └── dashboard-builder/
│       ├── widget-registry.tsx ← NEW: catalog of all available widgets
│       ├── widget-grid.tsx     ← NEW: drag-and-drop grid renderer
│       └── widget-selector.tsx ← NEW: admin UI to pick + configure widgets
├── app/
│   ├── dashboard/
│   │   └── page.tsx            ← MODIFY: read dashboard layout from store
│   ├── custom/
│   │   └── [slug]/
│   │       └── page.tsx        ← NEW: dynamic custom page renderer
│   └── settings/
│       ├── roles/
│       │   └── page.tsx        ← NEW: role manager
│       └── page-builder/
│           └── page.tsx        ← NEW: custom page builder
```

---

## Phase 1 — Dynamic Role System

**Goal:** Admin can create, edit, and delete custom roles beyond the 7 built-in ones.

### 1.1 Extended Types (`src/types/index.ts`)

```ts
// All granular permission flags
export type Permission =
  // Pages
  | "page:dashboard" | "page:employees" | "page:attendance"
  | "page:leave" | "page:payroll" | "page:loans" | "page:projects"
  | "page:reports" | "page:kiosk" | "page:notifications"
  | "page:audit" | "page:settings"
  // Employee actions
  | "employees:view" | "employees:create" | "employees:edit" | "employees:delete"
  | "employees:view_salary" | "employees:approve_salary"
  // Attendance
  | "attendance:view_all" | "attendance:edit" | "attendance:approve_overtime"
  // Leave
  | "leave:view_all" | "leave:approve" | "leave:manage_policies"
  // Payroll
  | "payroll:view_all" | "payroll:generate" | "payroll:lock" | "payroll:issue"
  | "payroll:view_own"
  // Loans
  | "loans:view_all" | "loans:approve" | "loans:view_own"
  // Audit
  | "audit:view"
  // Settings
  | "settings:roles" | "settings:organization" | "settings:shifts"
  | "settings:page_builder";

export interface CustomRole {
  id: string;                    // e.g. "role-abc123"
  name: string;                  // e.g. "Regional Manager"
  slug: string;                  // e.g. "regional_manager" (unique)
  color: string;                 // Tailwind color token e.g. "#6366f1"
  icon: string;                  // Lucide icon name e.g. "ShieldCheck"
  isSystem: boolean;             // true = built-in role, cannot be deleted
  permissions: Permission[];
  dashboardLayout?: DashboardLayout;  // custom dashboard for this role
  createdAt: string;
}

export interface DashboardLayout {
  roleId: string;
  widgets: WidgetConfig[];
}

export interface WidgetConfig {
  id: string;               // e.g. "widget-abc123"  
  type: WidgetType;         // e.g. "kpi_present_today"
  title?: string;           // optional override label
  colSpan: 1 | 2 | 3 | 4;  // grid columns (out of 4)
  order: number;
  config?: Record<string, unknown>;  // widget-specific settings
}

export type WidgetType =
  // KPI cards
  | "kpi_present_today" | "kpi_absent_today" | "kpi_on_leave"
  | "kpi_pending_leaves" | "kpi_active_employees" | "kpi_outstanding_loans"
  | "kpi_payslips_issued" | "kpi_pending_adjustments" | "kpi_locked_runs"
  | "kpi_audit_total" | "kpi_audit_today" | "kpi_pending_ot"
  // Charts
  | "chart_team_performance" | "chart_dept_distribution"
  | "chart_leave_trends" | "chart_attendance_heatmap"
  // Tables
  | "table_employee_status" | "table_recent_audit" | "table_pending_leaves"
  | "table_active_loans" | "table_recent_payslips"
  // Personal (employee self-view)
  | "my_attendance_status" | "my_leave_balance" | "my_latest_payslip"
  | "my_leave_requests"
  // General
  | "events_widget" | "birthdays_widget" | "announcements";

export interface CustomPage {
  id: string;
  title: string;
  slug: string;              // URL: /custom/[slug]
  icon: string;              // Lucide icon name
  description?: string;
  allowedRoles: string[];    // role IDs that can see this page
  widgets: WidgetConfig[];
  showInSidebar: boolean;
  order: number;
  createdAt: string;
}
```

### 1.2 System Role Defaults

The 7 built-in roles get a `isSystem: true` flag and cannot be deleted.
Each has a pre-configured permission set:

| Built-in Role | Key Permissions |
|---------------|----------------|
| `admin` | All permissions |
| `hr` | employees:*, attendance:*, leave:*, page:reports, page:notifications |
| `finance` | payroll:*, loans:*, page:reports |
| `payroll_admin` | payroll:*, loans:view_all, page:reports |
| `supervisor` | employees:view, attendance:view_all, leave:view_all, leave:approve, attendance:approve_overtime |
| `employee` | page:dashboard, page:leave, page:payroll (own only), page:attendance (self), loans:view_own |
| `auditor` | audit:view, employees:view, page:reports (read-only) |

### 1.3 Roles Store (`src/store/roles.store.ts`)

```ts
interface RolesState {
  roles: CustomRole[];
  // CRUD
  createRole: (data: Omit<CustomRole, "id" | "createdAt" | "isSystem">) => void;
  updateRole: (id: string, patch: Partial<CustomRole>) => void;
  deleteRole: (id: string) => void;  // blocked if isSystem or assigned to any user
  // Permissions
  addPermission: (roleId: string, perm: Permission) => void;
  removePermission: (roleId: string, perm: Permission) => void;
  setPermissions: (roleId: string, perms: Permission[]) => void;
  // Dashboard layout
  saveDashboardLayout: (roleId: string, widgets: WidgetConfig[]) => void;
  getDashboardLayout: (roleId: string) => WidgetConfig[];
  // Helpers
  getRoleBySlug: (slug: string) => CustomRole | undefined;
  hasPermission: (roleId: string, perm: Permission) => boolean;
}
```

---

## Phase 2 — Permission-Gated UI

**Goal:** Replace all hardcoded `role === "admin"` checks with a proper permission hook.

### 2.1 Permission Hook (`src/lib/permissions.ts`)

```ts
import { useRolesStore } from "@/store/roles.store";
import { useAuthStore } from "@/store/auth.store";

export function usePermission(perm: Permission): boolean {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { hasPermission, getRoleBySlug } = useRolesStore();
  const role = getRoleBySlug(currentUser.role);
  if (!role) return false;
  return hasPermission(role.id, perm);
}

export function usePermissions(perms: Permission[]): Record<Permission, boolean> {
  // returns map of each permission to true/false
}
```

### 2.2 Migration — Replace Role Checks

Every hardcoded check gets replaced:

```ts
// BEFORE (scattered across every page):
const canEdit = role === "admin" || role === "hr";

// AFTER (unified, respects custom roles):
const canEdit = usePermission("employees:edit");
```

**Files to update:**
- All 20 page files — replace `role ===` guards
- `sidebar.tsx` — filter nav items by `page:*` permissions  
- `app-shell.tsx` — permission-based route guard

### 2.3 Sidebar Permission Filtering

```tsx
// sidebar.tsx BEFORE:
const navItems = ALL_NAV_ITEMS.filter(item => {
  if (item.adminOnly) return isAdmin;
  return true;
});

// AFTER:
const navItems = [
  ...SYSTEM_NAV_ITEMS.filter(item => hasPermission(item.requiredPermission)),
  ...customPages.filter(p => p.allowedRoles.includes(roleId)),
];
```

---

## Phase 3 — Dashboard Builder

**Goal:** Admin can visually build a custom dashboard layout for any role.

### 3.1 Widget Registry (`src/components/dashboard-builder/widget-registry.tsx`)

A static map of every widget type → its React component + metadata:

```ts
export const WIDGET_REGISTRY: Record<WidgetType, WidgetMeta> = {
  kpi_present_today: {
    label: "Present Today",
    description: "Count of employees present today",
    category: "KPI",
    defaultColSpan: 1,
    component: KpiPresentToday,
    preview: "📊 Present: 12",
  },
  chart_team_performance: {
    label: "Team Performance Chart",
    description: "Monthly productivity trend by department",
    category: "Chart",
    defaultColSpan: 2,
    component: TeamPerformanceChart,
  },
  table_employee_status: {
    label: "Employee Status Table",
    description: "Today's attendance snapshot",
    category: "Table",
    defaultColSpan: 4,
    component: EmployeeStatusTable,
  },
  events_widget: {
    label: "Events & Meetings",
    category: "General",
    defaultColSpan: 2,
    component: EventsWidget,
  },
  // ... all other types
};
```

### 3.2 Dashboard Builder UI (`src/app/settings/page-builder/page.tsx`)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Dashboard Builder — [Role Selector Dropdown]        │
├──────────────────────┬──────────────────────────────┤
│  Widget Library      │  Dashboard Canvas (4-col grid)│
│  ─────────────────   │  ──────────────────────────── │
│  [KPI] Present Today │  ┌──────┐ ┌──────┐ ┌──────┐  │
│  [KPI] Absent Today  │  │KPI 1 │ │KPI 2 │ │KPI 3 │  │
│  [Chart] Performance │  └──────┘ └──────┘ └──────┘  │
│  [Chart] Dept Donut  │  ┌─────────────┐ ┌──────────┐│
│  [Table] Emp Status  │  │  Perf Chart │ │Dept Donut││
│  [General] Events    │  └─────────────┘ └──────────┘│
│  [General] Birthdays │  ┌────────────────────────┐  │
│                      │  │   Employee Status Table │  │
│  Drag or click (+)   │  └────────────────────────┘  │
│  to add to canvas    │  [+ Add Widget]               │
└──────────────────────┴──────────────────────────────┘
│  [Reset to Default]  [Preview as Role]  [Save Layout]│
└─────────────────────────────────────────────────────┘
```

**UX interactions:**
- **Click widget in library** → appears at bottom of canvas  
- **Drag widget card** (via `@dnd-kit/sortable`) → reorder on canvas
- **Resize handle** on each widget → change `colSpan` (1–4)
- **× button** → remove widget
- **Preview as Role** → opens preview modal showing the dashboard as that role would see it
- **Save Layout** → calls `saveDashboardLayout(roleId, widgets)` in store

### 3.3 Dashboard Page Renders from Config

```tsx
// src/app/dashboard/page.tsx (after builder integration)
export default function DashboardPage() {
  const { role } = useAuthStore((s) => s.currentUser);
  const { getDashboardLayout } = useRolesStore();
  const layout = getDashboardLayout(role);  // falls back to built-in defaults

  return (
    <div className="space-y-4">
      <WelcomeBanner />
      <WidgetGrid layout={layout} />
    </div>
  );
}
```

---

## Phase 4 — Custom Pages (Page Builder)

**Goal:** Admin can create entirely new internal pages composed of widgets, with their own sidebar entry.

### 4.1 Page Builder UI

**Admin flow:**
1. Go to **Settings → Page Builder**
2. Click **"New Custom Page"**
3. Fill in: Title, URL slug (auto-generated), icon, description
4. Select which roles can access it
5. Add widgets from the widget library (same registry as dashboards)
6. Toggle **"Show in Sidebar"**
7. Click **Save** → page immediately accessible at `/custom/[slug]`

### 4.2 Dynamic Route Renderer (`src/app/custom/[slug]/page.tsx`)

```tsx
"use client";
import { usePageBuilderStore } from "@/store/page-builder.store";
import { WidgetGrid } from "@/components/dashboard-builder/widget-grid";
import { usePermission } from "@/lib/permissions";
import { notFound } from "next/navigation";

export default function CustomPage({ params }: { params: { slug: string } }) {
  const { getPageBySlug } = usePageBuilderStore();
  const page = getPageBySlug(params.slug);
  const { currentUser } = useAuthStore();

  if (!page) return notFound();
  if (!page.allowedRoles.includes(currentUser.role)) return notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{page.title}</h1>
        {page.description && <p className="text-muted-foreground mt-1">{page.description}</p>}
      </div>
      <WidgetGrid layout={{ roleId: "custom", widgets: page.widgets }} readOnly />
    </div>
  );
}
```

### 4.3 Page Builder Store (`src/store/page-builder.store.ts`)

```ts
interface PageBuilderState {
  customPages: CustomPage[];
  createPage: (data: Omit<CustomPage, "id" | "createdAt">) => string;  // returns id
  updatePage: (id: string, patch: Partial<CustomPage>) => void;
  deletePage: (id: string) => void;
  reorderPages: (orderedIds: string[]) => void;
  getPageBySlug: (slug: string) => CustomPage | undefined;
  getPagesForRole: (roleId: string) => CustomPage[];
}
```

---

## Phase 5 — Role Manager UI

**Goal:** Admin-only settings page to create/edit/delete roles and their permissions.

### 5.1 Role Manager (`src/app/settings/roles/page.tsx`)

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  Roles & Permissions                [+ New Role] │
├────────────┬──────────────────────────────────── ┤
│  Role List │  Editing: "Regional Manager"         │
│  ────────  │  ─────────────────────────────────── │
│ ● Admin    │  Name:  [Regional Manager          ] │
│ ● HR       │  Slug:  [regional_manager          ] │
│ ● Finance  │  Color: [████] Icon: [ShieldCheck ▾] │
│ ● Payroll  │                                      │
│ ● Employee │  Permissions                         │
│ ● Auditor  │  ┌── Pages ──────────────────────┐  │
│ ● Supervis │  │ ☑ Dashboard  ☑ Employees      │  │
│  ──────    │  │ ☑ Attendance ☐ Payroll        │  │
│ ★ Regional │  │ ☑ Leave      ☐ Audit          │  │
│   Manager  │  └───────────────────────────────┘  │
│ [+ New]    │  ┌── Actions ─────────────────────┐  │
│            │  │ ☑ View Salaries ☐ Approve Pay  │  │
│            │  │ ☑ Approve OT   ☑ Approve Leave │  │
│            │  └───────────────────────────────┘  │
│            │                                      │
│            │  Dashboard: [Edit Layout →]          │
│            │                                      │
│            │  [Delete Role]  [Duplicate]  [Save]  │
└────────────┴──────────────────────────────────────┘
```

### 5.2 Permission Groups (UI categories)

| Group | Permissions |
|-------|-------------|
| **Pages** | dashboard, employees, attendance, leave, payroll, loans, projects, reports, kiosk, audit, settings |
| **Employee Management** | view, create, edit, delete, view_salary, approve_salary |
| **Attendance** | view_all, edit, approve_overtime |
| **Leave** | view_all, approve, manage_policies |
| **Payroll** | view_all, view_own, generate, lock, issue |
| **Loans** | view_all, view_own, approve |
| **Settings** | roles, organization, shifts, page_builder |
| **Audit** | view |

---

## Phase 6 — Export / Import Config

Admin can export all custom roles + page configs as a JSON file, and import them in another instance.

```ts
// Export
const config = {
  roles: customRoles.filter(r => !r.isSystem),
  customPages: allCustomPages,
  version: "1.0",
  exportedAt: new Date().toISOString(),
};
const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
// trigger download

// Import
const parsed = JSON.parse(uploadedText);
parsed.roles.forEach(r => createRole(r));
parsed.customPages.forEach(p => createPage(p));
```

---

## Implementation Roadmap

### Session 1-2: Types + Roles Store
- Extend `src/types/index.ts` with `Permission`, `CustomRole`, `WidgetConfig`, `CustomPage`
- Create `src/store/roles.store.ts` with 7 built-in system roles pre-loaded
- Create `src/lib/permissions.ts` with `usePermission()` hook
- Seed default permission sets for each built-in role

### Session 3-4: Permission Migration
- Replace all `role === "admin"` style checks in every page with `usePermission()`
- Update `sidebar.tsx` to filter nav items by permission
- Add `app-shell.tsx` client-side redirect for unauthorized page access

### Session 5-6: Widget Registry + Grid
- Create `src/components/dashboard-builder/widget-registry.tsx`  
  (extract all dashboard sub-components into individually importable widgets)
- Create `src/components/dashboard-builder/widget-grid.tsx`  
  (renders a `WidgetConfig[]` as a responsive 4-column CSS grid)
- Update `src/app/dashboard/page.tsx` to read layout from `roles.store`
  with built-in hardcoded layouts as fallback defaults

### Session 7-8: Dashboard Builder UI
- Install `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop
- Create `src/app/settings/page-builder/page.tsx` with split-panel layout
- Widget library panel (left) + canvas panel (right)
- Drag/click to add, × to remove, resize handles for colSpan
- "Preview as Role" modal
- Save → `saveDashboardLayout()` in roles store

### Session 9-10: Role Manager UI
- Create `src/app/settings/roles/page.tsx`
- Role list sidebar + detail form
- Grouped permission checkboxes
- Create/Duplicate/Delete role actions
- "Edit Dashboard Layout" deep-link into builder

### Session 11-12: Custom Pages
- Create `src/store/page-builder.store.ts`
- Create `src/app/custom/[slug]/page.tsx` dynamic renderer
- Create custom page builder UI inside settings (tab alongside dashboard builder)
- Sidebar integration: pull `customPages` from store, render under "Custom Pages" section

### Session 13: Export / Import + Polish
- JSON export/import in Settings → Roles
- Guard: block deleting a role if any user is currently assigned to it
- Guard: block creating a slug that already exists
- Toast feedback throughout

### Session 14: QA + Docs
- Test every built-in role still has the same access as before migration
- Test custom role creation end-to-end
- Test custom page creation, access control, sidebar display
- Update `project_tracking_spec.md`

---

## Dependencies to Add

| Package | Purpose | Size |
|---------|---------|------|
| `@dnd-kit/core` | Drag-and-drop primitives | ~12 KB gzip |
| `@dnd-kit/sortable` | Sortable list/grid | ~5 KB gzip |

No other new dependencies required. Everything else re-uses existing Zustand, Tailwind, Lucide, shadcn/ui.

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| TypeScript `Role` union breaks if dynamic roles use string slugs | Medium | Widen `currentUser.role: string` (already done in `Employee` type), keep union only for system roles |
| Custom role slug collision with built-in routes | Low | Prefix custom page routes with `/custom/` |
| Admin accidentally removes all admin access | Low | Lock "admin" role permissions (isSystem guard), require at least one admin user |
| Widget performance with many widgets on dashboard | Low | `React.memo()` on every widget component |
| localStorage size limit (5MB) with many configs | Very Low | Keep configs lean; widget configs are small JSON objects |

---

## Summary

| Phase | What Gets Built | Sessions |
|-------|----------------|---------|
| 1 | Types + Roles Store | 1–2 |
| 2 | Permission hook + sidebar/page migration | 3–4 |
| 3 | Widget registry + grid + dashboard reads from config | 5–6 |
| 4 | Dashboard Builder UI (drag-drop) | 7–8 |
| 5 | Role Manager UI | 9–10 |
| 6 | Custom Pages (builder + dynamic route) | 11–12 |
| 7 | Export/import + guards + polish + QA | 13–14 |

**Total: ~14 focused sessions. Fully doable within the current tech stack.**
