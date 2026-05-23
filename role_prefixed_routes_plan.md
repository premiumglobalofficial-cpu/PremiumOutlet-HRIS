# Role-Prefixed Routes Plan

## Overview

Restructure all NexHRMS page routes from flat paths (`/attendance`, `/payroll`) to role-prefixed paths (`/admin/attendance`, `/employee/payroll`), so every URL clearly indicates **which role** is active.

---

## Current vs Proposed Route Mapping

### Role-Prefixed Pages (move into `[role]/`)

| Current Route              | New Pattern                      | Example (employee)                | Example (admin)                       |
|---------------------------|----------------------------------|-----------------------------------|---------------------------------------|
| `/dashboard`              | `/[role]/dashboard`              | `/employee/dashboard`             | `/admin/dashboard`                    |
| `/attendance`             | `/[role]/attendance`             | `/employee/attendance`            | `/admin/attendance`                   |
| `/leave`                  | `/[role]/leave`                  | `/employee/leave`                 | `/admin/leave`                        |
| `/payroll`                | `/[role]/payroll`                | `/employee/payroll`               | `/admin/payroll`                      |
| `/employees/manage`       | `/[role]/employees/manage`       | *(no access)*                     | `/admin/employees/manage`             |
| `/employees/[id]`         | `/[role]/employees/[id]`         | `/employee/employees/EMP001`      | `/admin/employees/EMP001`             |
| `/employees/directory`    | `/[role]/employees/directory`    | *(no access)*                     | `/admin/employees/directory`          |
| `/projects`               | `/[role]/projects`               | *(no access)*                     | `/admin/projects`                     |
| `/loans`                  | `/[role]/loans`                  | *(no access)*                     | `/admin/loans`                        |
| `/reports`                | `/[role]/reports`                | *(no access)*                     | `/admin/reports`                      |
| `/timesheets`             | `/[role]/timesheets`             | *(no access)*                     | `/admin/timesheets`                   |
| `/settings`               | `/[role]/settings`               | *(no access)*                     | `/admin/settings`                     |
| `/settings/organization`  | `/[role]/settings/organization`  | *(no access)*                     | `/admin/settings/organization`        |
| `/settings/appearance`    | `/[role]/settings/appearance`    | *(no access)*                     | `/admin/settings/appearance`          |
| `/settings/branding`      | `/[role]/settings/branding`      | *(no access)*                     | `/admin/settings/branding`            |
| `/settings/modules`       | `/[role]/settings/modules`       | *(no access)*                     | `/admin/settings/modules`             |
| `/settings/navigation`    | `/[role]/settings/navigation`    | *(no access)*                     | `/admin/settings/navigation`          |
| `/settings/kiosk`         | `/[role]/settings/kiosk`         | *(no access)*                     | `/admin/settings/kiosk`               |
| `/settings/location`      | `/[role]/settings/location`      | *(no access)*                     | `/admin/settings/location`            |
| `/settings/notifications` | `/[role]/settings/notifications` | *(no access)*                     | `/admin/settings/notifications`       |
| `/settings/roles`         | `/[role]/settings/roles`         | *(no access)*                     | `/admin/settings/roles`               |
| `/settings/shifts`        | `/[role]/settings/shifts`        | *(no access)*                     | `/admin/settings/shifts`              |
| `/settings/page-builder`  | `/[role]/settings/page-builder`  | *(no access)*                     | `/admin/settings/page-builder`        |
| `/settings/dashboard-builder` | `/[role]/settings/dashboard-builder` | *(no access)*              | `/admin/settings/dashboard-builder`   |
| `/audit`                  | `/[role]/audit`                  | *(no access)*                     | `/admin/audit`                        |
| `/notifications`          | `/[role]/notifications`          | *(no access)*                     | `/admin/notifications`                |

### Unprefixed Pages (remain at root level)

| Route     | Reason                                       |
|-----------|----------------------------------------------|
| `/login`  | Pre-authentication — no role available yet    |
| `/kiosk`  | Standalone terminal — role-independent        |
| `/`       | Root redirect → `/${role}/dashboard`          |

### Role-Specific Route Examples

| Role           | Available Routes                                                                            |
|----------------|--------------------------------------------------------------------------------------------|
| **admin**      | `/admin/dashboard`, `/admin/employees/manage`, `/admin/projects`, `/admin/attendance`, `/admin/leave`, `/admin/payroll`, `/admin/loans`, `/admin/reports`, `/admin/timesheets`, `/admin/settings`, `/admin/settings/*`, `/admin/audit`, `/admin/notifications` |
| **hr**         | `/hr/dashboard`, `/hr/employees/manage`, `/hr/projects`, `/hr/attendance`, `/hr/leave`, `/hr/reports`, `/hr/notifications`, `/hr/timesheets`, `/hr/settings/shifts` |
| **finance**    | `/finance/dashboard`, `/finance/payroll`, `/finance/loans`, `/finance/reports`, `/finance/employees/directory`, `/finance/employees/manage` |
| **employee**   | `/employee/dashboard`, `/employee/attendance`, `/employee/leave`, `/employee/payroll`       |
| **supervisor** | `/supervisor/dashboard`, `/supervisor/attendance`, `/supervisor/leave`, `/supervisor/timesheets`, `/supervisor/employees/manage` |
| **payroll_admin** | `/payroll_admin/dashboard`, `/payroll_admin/payroll`, `/payroll_admin/loans`, `/payroll_admin/reports`, `/payroll_admin/timesheets` |
| **auditor**    | `/auditor/dashboard`, `/auditor/audit`, `/auditor/reports`                                  |

---

## Implementation Approach: Dynamic `[role]` Segment

Use Next.js App Router's dynamic segment `[role]` to namespace all authenticated pages under the user's role slug.

### New Folder Structure

```
src/app/
  layout.tsx                       ← Root layout (unchanged)
  client-layout.tsx                ← Updated: role-aware auth guard
  page.tsx                         ← Updated: redirect → /[role]/dashboard
  not-found.tsx                    ← 404 page (unchanged)
  login/
    page.tsx                       ← Updated: redirect to /[role]/dashboard on login
  kiosk/
    page.tsx                       ← Unchanged (no role prefix)
  [role]/
    layout.tsx                     ← NEW: Role validation guard layout
    dashboard/
      page.tsx
    attendance/
      page.tsx
      _views/
        admin-view.tsx
        employee-view.tsx
    leave/
      page.tsx
      _views/
        admin-view.tsx
        employee-view.tsx
    payroll/
      page.tsx
      _views/
        admin-view.tsx
        employee-view.tsx
    employees/
      manage/
        page.tsx
        _views/
          admin-view.tsx
          readonly-view.tsx
          finance-view.tsx
      [id]/
        page.tsx
        _views/
          admin-view.tsx
          viewer-view.tsx
      directory/
        page.tsx
    projects/
      page.tsx
      _views/
        admin-view.tsx
        readonly-view.tsx
    loans/
      page.tsx
      _views/
        admin-view.tsx
        readonly-view.tsx
    reports/
      page.tsx
      _views/
        admin-view.tsx
        basic-view.tsx
    timesheets/
      page.tsx
    settings/
      page.tsx
      _views/
        admin-view.tsx
        hr-view.tsx
        employee-view.tsx
      organization/page.tsx
      appearance/page.tsx
      branding/page.tsx
      modules/page.tsx
      navigation/page.tsx
      kiosk/page.tsx
      location/page.tsx
      notifications/page.tsx
      roles/page.tsx
      shifts/page.tsx
      page-builder/page.tsx
      dashboard-builder/page.tsx
    audit/
      page.tsx
    notifications/
      page.tsx
    custom/
      [slug]/page.tsx
```

### Key New/Modified Files

#### 1. `src/app/[role]/layout.tsx` — Role Guard Layout (NEW)

```tsx
"use client";

import { useAuthStore } from "@/store/auth.store";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import type { Role } from "@/types";

const VALID_ROLES: Role[] = ["admin", "hr", "finance", "employee", "supervisor", "payroll_admin", "auditor"];

export default function RoleLayout({ children }: { children: React.ReactNode }) {
    const { role: urlRole } = useParams<{ role: string }>();
    const userRole = useAuthStore((s) => s.currentUser.role);
    const router = useRouter();
    const pathname = usePathname();

    const isValidRole = VALID_ROLES.includes(urlRole as Role);

    useEffect(() => {
        if (!isValidRole) {
            // Invalid role slug → 404 or redirect to correct role
            router.replace(`/${userRole}/dashboard`);
            return;
        }
        if (urlRole !== userRole) {
            // User is trying to access another role's URL → redirect to their own
            const subPath = pathname.replace(`/${urlRole}`, "");
            router.replace(`/${userRole}${subPath}`);
        }
    }, [urlRole, userRole, isValidRole, router, pathname]);

    if (!isValidRole || urlRole !== userRole) return null;

    return <>{children}</>;
}
```

**What this does:**
- Validates the `[role]` URL segment matches the authenticated user's role
- Redirects to the correct role prefix if mismatch (e.g., employee visiting `/admin/payroll` → `/employee/payroll`)
- Returns null (blank) while redirect is processing

#### 2. `src/app/client-layout.tsx` — Updated Auth Guard

Key changes:
- Add role-prefix detection: if URL starts with a valid role but user isn't authenticated → redirect to `/login`
- If authenticated and on root `/` → redirect to `/${role}/dashboard`
- Shell bypass: `/login`, `/kiosk`, root `/` remain outside AppShell
- All `/${role}/*` routes get AppShell

```tsx
// Updated logic:
const isLoginPage = pathname === "/login";
const isRoot      = pathname === "/";
const isKiosk     = pathname === "/kiosk";
const skipShell   = isLoginPage || isRoot || isKiosk;
```

#### 3. `src/app/page.tsx` — Updated Root Redirect

```tsx
// Before: redirect("/dashboard")
// After: role-aware redirect (client-side since role is in Zustand)
"use client";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
    const router = useRouter();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const role = useAuthStore((s) => s.currentUser.role);

    useEffect(() => {
        if (isAuthenticated) {
            router.replace(`/${role}/dashboard`);
        } else {
            router.replace("/login");
        }
    }, [isAuthenticated, role, router]);

    return null;
}
```

#### 4. `src/app/login/page.tsx` — Updated Post-Login Redirect

```tsx
// Before: router.push("/dashboard")
// After:  router.push(`/${role}/dashboard`)
```

#### 5. `src/lib/constants.ts` — Updated Config

**NAV_ITEMS:** Change `href` from static to dynamic. Two options:

**Option A — Helper function (recommended):**
```tsx
/** Generate a role-prefixed href */
export function roleHref(role: Role, path: string): string {
    return `/${role}${path}`;
}

// NAV_ITEMS keep their base paths (without role prefix)
// Sidebar generates full href at render time: roleHref(role, item.href)
```

NAV_ITEMS `href` values remain as base paths:
```tsx
{ label: "Dashboard",  href: "/dashboard",        ... }
{ label: "Attendance", href: "/attendance",        ... }
{ label: "Settings",   href: "/settings",          ... }
// etc.
```

**ROLE_ACCESS:** Same — keep base paths, comparison logic strips the role prefix:
```tsx
// When checking access, strip the /[role]/ prefix first:
const basePath = pathname.replace(/^\/(admin|hr|finance|employee|supervisor|payroll_admin|auditor)/, "");
```

**PATH_TO_PERMISSION:** Same — keep base paths, strip prefix before lookup.

#### 6. `src/components/shell/sidebar.tsx` — Updated Navigation Links

```tsx
// Before:
<Link href={item.href}>

// After:
<Link href={`/${role}${item.href}`}>
```

Also update the dashboard logo link:
```tsx
// Before: <Link href="/dashboard">
// After:  <Link href={`/${role}/dashboard`}>
```

And custom page links:
```tsx
// Before: href={`/custom/${page.slug}`}
// After:  href={`/${role}/custom/${page.slug}`}
```

#### 7. `src/components/shell/topbar.tsx` — Updated Navigation

```tsx
// Notifications bell:
// Before: router.push("/notifications")
// After:  router.push(`/${role}/notifications`)

// Settings menu item:
// Before: router.push("/settings")
// After:  router.push(`/${role}/settings`)

// Search results navigation:
// Before: router.push(p.href)
// After:  router.push(`/${role}${p.href}`)

// Employee search:
// Before: router.push(`/employees/${emp.id}`)
// After:  router.push(`/${role}/employees/${emp.id}`)
```

#### 8. All Internal `<Link>` References — Updated

| File                                    | Current href                       | New href                                 |
|-----------------------------------------|-------------------------------------|------------------------------------------|
| `widget-registry.tsx`                   | `/employees/manage`                | `/${role}/employees/manage`              |
| `widget-registry.tsx`                   | `/employees/${emp.id}`             | `/${role}/employees/${emp.id}`           |
| `widget-registry.tsx`                   | `/audit`                           | `/${role}/audit`                         |
| `widget-registry.tsx`                   | `/leave`                           | `/${role}/leave`                         |
| `widget-registry.tsx`                   | `/payroll`                         | `/${role}/payroll`                       |
| `settings/appearance/page.tsx`          | `/settings`                        | `/${role}/settings`                      |
| `settings/branding/page.tsx`            | `/settings`                        | `/${role}/settings`                      |
| `settings/modules/page.tsx`             | `/settings`                        | `/${role}/settings`                      |
| `settings/navigation/page.tsx`          | `/settings`                        | `/${role}/settings`                      |
| `settings/kiosk/page.tsx`              | `/settings`                        | `/${role}/settings`                      |
| `settings/kiosk/page.tsx`              | `/kiosk`                           | `/kiosk` *(stays unprefixed)*            |
| `settings/notifications/page.tsx`       | `/settings`                        | `/${role}/settings`                      |
| `settings/location/page.tsx`            | `/settings`                        | `/${role}/settings`                      |
| `settings/_views/hr-view.tsx`           | `/settings/organization`           | `/${role}/settings/organization`         |
| `settings/_views/hr-view.tsx`           | `/settings/shifts`                 | `/${role}/settings/shifts`               |
| `settings/_views/admin-view.tsx`        | `/settings/organization`           | `/${role}/settings/organization`         |
| `settings/_views/admin-view.tsx`        | `/settings/shifts`                 | `/${role}/settings/shifts`               |
| `employees/manage/_views/admin-view.tsx`| `/employees/${emp.id}`             | `/${role}/employees/${emp.id}`           |
| `employees/manage/_views/finance-view.tsx`| `/employees/${emp.id}`           | `/${role}/employees/${emp.id}`           |
| `employees/directory/page.tsx`          | `/employees/${emp.id}`             | `/${role}/employees/${emp.id}`           |
| `not-found.tsx`                         | `/dashboard`                       | `/${role}/dashboard` *(or just `/`)*     |
| `notifications/page.tsx`               | `/settings/notifications`          | `/${role}/settings/notifications`        |

**Approach for `<Link>` updates:** Create a `useRoleHref()` hook:
```tsx
// src/lib/hooks/use-role-href.ts
import { useAuthStore } from "@/store/auth.store";

export function useRoleHref() {
    const role = useAuthStore((s) => s.currentUser.role);
    return (basePath: string) => `/${role}${basePath}`;
}
```

Or simply read role in each component that needs dynamic hrefs.

---

## Implementation Phases

### Phase 1 — Create `[role]` layout and infrastructure
1. Create `src/app/[role]/layout.tsx` (role validation guard)
2. Add `roleHref()` helper to `src/lib/constants.ts`
3. Add `useRoleHref()` hook to `src/lib/hooks/use-role-href.ts`

### Phase 2 — Move page folders into `[role]/`
Move all authenticated page folders from `src/app/` into `src/app/[role]/`:
- `dashboard/` → `[role]/dashboard/`
- `attendance/` (with `_views/`) → `[role]/attendance/`
- `leave/` (with `_views/`) → `[role]/leave/`
- `payroll/` (with `_views/`) → `[role]/payroll/`
- `employees/` (with all sub-routes & `_views/`) → `[role]/employees/`
- `projects/` (with `_views/`) → `[role]/projects/`
- `loans/` (with `_views/`) → `[role]/loans/`
- `reports/` (with `_views/`) → `[role]/reports/`
- `timesheets/` → `[role]/timesheets/`
- `settings/` (with all sub-pages & `_views/`) → `[role]/settings/`
- `audit/` → `[role]/audit/`
- `notifications/` → `[role]/notifications/`

**NOT moved:** `login/`, `kiosk/`, `page.tsx` (root), `not-found.tsx`

### Phase 3 — Update root redirect & login
1. Update `src/app/page.tsx` — redirect to `/${role}/dashboard` (client-side)
2. Update `src/app/login/page.tsx` — post-login redirect to `/${role}/dashboard`

### Phase 4 — Update client-layout.tsx
1. Update auth guard to handle role-prefixed URLs
2. Update shell bypass logic (login, kiosk, root remain outside shell)

### Phase 5 — Update navigation components
1. `sidebar.tsx` — Use `roleHref()` for all nav links
2. `topbar.tsx` — Use role-prefixed paths for all `router.push()` calls

### Phase 6 — Update all internal Link/router references
1. `widget-registry.tsx` — 7 Link href updates
2. Settings sub-pages — 7 back-link updates
3. Settings views — 4 Link updates
4. Employee views — 3 Link updates  
5. `employees/directory/page.tsx` — 1 Link update
6. `notifications/page.tsx` — 1 Link update
7. `not-found.tsx` — 1 Link update

### Phase 7 — Update constants & access control
1. **ROLE_ACCESS** — Keep base paths; update access-check logic to strip role prefix
2. **PATH_TO_PERMISSION** — Keep base paths; update permission-check logic to strip role prefix
3. **NAV_ITEMS** — Keep base `href`; sidebar/topbar add prefix at render time

### Phase 8 — Update tests
1. RBAC test routes → role-prefixed
2. Auth store tests → updated redirect paths
3. Any routing-related test expectations

### Phase 9 — Build verification
1. `npm run build` — verify all routes compile
2. Manual smoke test each role's navigation
3. Verify role mismatch redirects work correctly

---

## Edge Cases & Considerations

### 1. Dynamic Employee ID Routes
`/[role]/employees/[id]` has two dynamic segments. Next.js App Router handles this cleanly — `params` will contain `{ role: "admin", id: "EMP001" }`.

### 2. Custom Pages
Custom pages follow the same pattern: `/[role]/custom/[slug]`. The `[role]` layout handles role validation, and the `[slug]` page handles content.

### 3. Kiosk Stays Unprefixed
The kiosk page is a standalone terminal that doesn't need role context in the URL. It remains at `/kiosk` and its link from settings (`/kiosk`) stays unchanged.

### 4. Not-Found Page
`not-found.tsx` stays at root level. Its "Go to Dashboard" link needs to be **client-side** to read the role:
```tsx
// Can't use useAuthStore in a server component, so either:
// Option A: Link to "/" which redirects
// Option B: Make it a client component and use roleHref
```

### 5. Role Prefix Mismatch (URL Spoofing)
If an employee manually types `/admin/dashboard`, the `[role]/layout.tsx` guard will catch the mismatch and redirect to `/employee/dashboard`.

### 6. Access Control (Unauthorized Pages)
If an employee types `/employee/audit` (a page they can't access), the `RoleViewDispatcher` will show `<AccessDenied />` since the employee role has no view mapped for audit.

### 7. Settings Sub-Page Access
Settings sub-pages (organization, appearance, etc.) are admin/hr only. The `[role]` layout validates the role prefix, and individual pages can still check permissions.

### 8. Middleware Alternative (Not Using)
We could use Next.js middleware to rewrite URLs, but that adds complexity. The `[role]` segment approach is cleaner, more explicit, and works naturally with the App Router.

### 9. Reports Government Sub-Route
`/reports/government` becomes `/[role]/reports/government`. Need to verify this sub-route exists and moves properly.

---

## File Count Estimates

| Change Type                  | File Count |
|------------------------------|------------|
| New files                    | 2 (`[role]/layout.tsx`, `use-role-href.ts`) |
| Moved directories            | 12 (all page folders except login, kiosk) |
| Modified files               | ~25 (Link/router updates, constants, layout, login, sidebar, topbar, widget-registry, settings sub-pages, views, tests) |
| Deleted files                | 0 (only moved) |

---

## Risk Assessment

| Risk                         | Severity | Mitigation                                              |
|------------------------------|----------|--------------------------------------------------------|
| Broken internal links        | High     | Grep all `href=` and `router.push` before & after      |
| Test failures                | Medium   | Update test expectations in Phase 8                     |
| PowerShell path issues       | Medium   | Use `robocopy` or Git mv to move `[id]` folders        |
| Role mismatch loops          | Low      | `[role]/layout.tsx` guard has loop protection           |
| SEO/bookmarks broken         | Low      | MVP app — no public SEO concern                         |

---

## Summary

- **33 routes** → move 30 under `[role]/`, keep 3 at root (login, kiosk, root redirect)
- **1 new layout** (`[role]/layout.tsx`) as role validation guard
- **1 new hook** (`useRoleHref`) for convenient role-prefixed href generation
- **~25 files** need Link/router reference updates
- **Tests** updated to reflect new URL structure
- **Build verification** at the end ensures zero regressions
