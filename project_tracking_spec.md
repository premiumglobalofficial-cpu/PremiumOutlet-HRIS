# NexHRMS — Project Tracking, Geofencing & Auth Specification

> **Status**: Plan only — implementation pending.
> **Stack**: Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Zustand (localStorage) · No database.

---

## Overview

This document outlines the full requirements for Phase 2 of NexHRMS:
- A **Sign-In page** with demo credentials and role-based routing.
- A **Project Management** module where admins create projects, set geo-locations, and assign employees.
- A **Geofenced Attendance** flow: share location → simulate face recognition → check-in only if within project radius.
- An **Email Notification** system (mock/simulated) for absences and project assignments.

---

## 1. Sign-In Page (`/login`)

### Features
- Full-page, branded sign-in form (shadcn/ui `Card`, `Input`, `Button` components).
- Demo credential selector so testers can pick a role in one click.
- On sign-in, redirect to `/dashboard` based on role.

### Demo Credentials
| Role     | Email                    | Password     |
|----------|--------------------------|--------------|
| Admin    | admin@nexhrms.com        | demo1234     |
| HR       | hr@nexhrms.com           | demo1234     |
| Finance  | finance@nexhrms.com      | demo1234     |
| Employee | employee@nexhrms.com     | demo1234     |

### State
- Auth state lives in `useAuthStore` (Zustand + localStorage).
- `isAuthenticated: boolean` guards all routes via `ClientLayout`.
- Unauthenticated users are redirected to `/login`.

### Design
- Centered card layout, company logo at top.
- "Quick Login" pill buttons for each demo role beneath the form.
- Consistent with app theme (dark/light support).

---

## 2. Employee Dashboard (Post Sign-In)

### Navigation (Role-Based)
After sign-in, the sidebar shows items based on role:

| Section    | Admin | HR | Finance | Employee |
|------------|-------|----|---------|----------|
| Dashboard  | ✅    | ✅ | ✅      | ✅       |
| Employees  | ✅    | ✅ | ❌      | ❌       |
| Projects   | ✅    | ✅ | ❌      | ❌       |
| Attendance | ✅    | ✅ | ❌      | ✅       |
| Leave      | ✅    | ✅ | ❌      | ✅       |
| Payroll    | ✅    | ❌ | ✅      | ✅ (view own) |
| Settings   | ✅    | ❌ | ❌      | ❌       |

---

## 3. Project Management (Admin / HR)

### Features
- **Create Projects**: Admin defines project name, description, latitude, longitude, and geofence radius.
- **Assign Employees**: Multi-select employee picker per project.
- **View Projects**: Table listing all projects and assigned headcount.
- **Admin Attendance View**: Admin can view any employee's attendance broken down by project.

### Data Model
```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  location: {
    lat: number;
    lng: number;
    radius: number; // meters — default 100m
  };
  assignedEmployeeIds: string[];
  createdAt: string;
}
```

### Store: `useProjectsStore`
- `projects: Project[]` — persisted to `localStorage`.
- `addProject(data)` — add new project.
- `updateProject(id, data)` — edit project fields.
- `assignEmployee(projectId, employeeId)` — add assignment.
- `removeEmployee(projectId, employeeId)` — remove assignment.
- `getProjectForEmployee(employeeId)` — returns the project the employee is assigned to.

---

## 4. Geofenced Check-In / Check-Out Flow (Employee)

The attendance check-in is a **multi-step process** on the `/attendance` page:

```
Step 1: Share Location
  → Browser Geolocation API request
  → Show coordinates + distance to assigned project location
  → If no project assigned → show "Remote / Unassigned" fallback

Step 2: Face Recognition (Simulated)
  → Show camera viewfinder UI (simulated — no real ML)
  → Display a countdown (3s) with a "Scanning..." animation
  → After countdown, show "Face Verified ✅" (always succeeds in simulation)
  → If employee is close enough AND face verified → allow check-in
  → If out of geofence → show error after location step, skip face step

Step 3: Check-In Confirmed
  → Record timestamp, location snapshot, project ID
  → Show success toast
```

### Location Validation Logic (Haversine Formula)
```typescript
function getDistanceMeters(lat1, lng1, lat2, lng2): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

### Updated Attendance Log Model
```typescript
interface AttendanceLog {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  hours?: number;
  status: "present" | "absent" | "on_leave";
  projectId?: string;           // NEW: which project they checked in for
  locationSnapshot?: {          // NEW: coordinates at time of check-in
    lat: number;
    lng: number;
  };
  faceVerified?: boolean;       // NEW: simulated face recognition result
}
```

---

## 5. Email Notifications (Mock / Simulated)

### Triggers
| Event | Recipient | Subject |
|--|--|--|
| Project Assignment | Employee | `New Project Assignment: [Project Name]` |
| Project Reassignment | Employee | `Project Update: You've been moved to [New Project]` |
| Absent (no check-in) | Employee | `Attendance Alert: You were marked absent on [Date]` |

### API Endpoint: `POST /api/notifications/resend`
```typescript
// Request body
{
  employeeId: string;
  type: "assignment" | "reassignment" | "absence";
  projectId?: string;
  date?: string; // for absence
}

// Response
{ success: boolean; message: string; simulatedEmail: EmailPayload; }
```

### Mock Email Payload
```typescript
interface EmailPayload {
  to: string;        // employee email
  subject: string;
  body: string;
  sentAt: string;    // ISO timestamp
}
```

### MVP Simulation
- `lib/notifications.ts`: Exports `sendNotification(payload)` function.
- Does **not** call a real email API.
- Saves notification to `useNotificationsStore` (Zustand + localStorage).
- Shows a toast: "📧 Email sent to [employee name]".
- Admin can see a **Notification Log** table (who was notified, when, for what).

### Store: `useNotificationsStore`
```typescript
interface NotificationLog {
  id: string;
  employeeId: string;
  type: "assignment" | "reassignment" | "absence";
  subject: string;
  sentAt: string;
}
```

---

## 6. Design Consistency Rules

- All new pages and dialogs use **shadcn/ui** components exclusively.
- Forms use `react-hook-form` + `zod` for validation.
- Toasts use `sonner`.
- Loading states use `shadcn/ui Skeleton`.
- Empty states use an icon + descriptive message (no bare "No data" strings).
- Colors follow existing token system: `bg-emerald-500/15` for success, `bg-red-500/15` for error, `bg-amber-500/15` for warning — consistent with the rest of the app.
- Dark/light theme is inherited automatically — no hardcoded colors.

---

## 7. Implementation Phases

### Phase 0: Auth & Sign-In Page
- [ ] Update `useAuthStore`: add `isAuthenticated`, `login(email, password)`, `logout()`.
- [ ] Create `/login` page with demo credentials.
- [ ] Update `ClientLayout` to redirect unauthenticated users to `/login`.

### Phase 1: Project Module
- [ ] Add `Project` and `NotificationLog` to `types/index.ts`.
- [ ] Create `store/projects.store.ts`.
- [ ] Create `store/notifications.store.ts`.
- [ ] Create `src/app/projects/page.tsx` (Admin view).
- [ ] Add Projects to sidebar nav (Admin/HR only).
- [ ] Add seed projects to `data/seed.ts`.

### Phase 2: Geofenced Attendance
- [ ] Create `lib/geofence.ts` (Haversine calculation).
- [ ] Update `AttendanceLog` type with new fields.
- [ ] Refactor `/attendance` page with multi-step check-in flow.
- [ ] Build `FaceRecognitionSimulator` component (camera UI + countdown).

### Phase 3: Notification System
- [ ] Create `lib/notifications.ts` (mock send function).
- [ ] Create `store/notifications.store.ts`.
- [ ] Create `src/app/api/notifications/resend/route.ts` (Next.js API route).
- [ ] Add Notification Log UI to Admin Dashboard or dedicated page.
- [ ] Wire up triggers: project assignment → notification, absence → notification.
