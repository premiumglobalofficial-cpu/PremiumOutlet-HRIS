# NexHRMS — Client Feature Pack: Implementation Plan

> **Requested by:** Client  
> **Date:** February 22, 2026  
> **Architecture:** Next.js 16 + Zustand (localStorage persistence) — MVP/demo mode  
> **Database:** localStorage only (production-ready schema for future migration)

---

## Table of Contents

1. [Feature A — Site Survey Photo & Location Selfie](#feature-a--site-survey-photo--location-selfie)
2. [Feature B — Lunch Break Geofence Enforcement](#feature-b--lunch-break-geofence-enforcement)
3. [Feature C — Continuous Location Tracking (5-10 min)](#feature-c--continuous-location-tracking-5-10-min)
4. [Feature D — Payslip Signing & Confirmation Workflow](#feature-d--payslip-signing--confirmation-workflow)
5. [Feature E — SMS & Email Notification Reminders](#feature-e--sms--email-notification-reminders)
6. [Data Schema (localStorage)](#data-schema-localstorage)
7. [Implementation Phases](#implementation-phases)

---

## Feature A — Site Survey Photo & Location Selfie

### Overview
Employees can take a selfie (site-survey photo) that automatically captures their GPS latitude/longitude. After the photo is taken, the coordinates are displayed on-screen. This serves as proof of physical presence at a job site.

### User Flow

```
Employee opens Attendance / Kiosk / Check-In
  ├─ Chooses "Photo Check-In"
  ├─ Camera view opens (front/selfie camera)
  ├─ Browser requests Geolocation API permission
  ├─ Employee taps "Capture"
  │   ├─ Photo is captured via <video> + <canvas>
  │   ├─ GPS lat/lng is captured via navigator.geolocation.getCurrentPosition()
  │   ├─ Accuracy (meters) is recorded
  │   └─ Timestamp is recorded
  ├─ Result screen shows:
  │   ├─ Selfie preview (thumbnail)
  │   ├─ "Latitude: 14.5995"
  │   ├─ "Longitude: 120.9842"
  │   ├─ "Accuracy: ±12m"
  │   ├─ "Address: (reverse geocoded if available)"
  │   ├─ Mini-map pin (optional — static map tile)
  │   └─ Timestamp
  ├─ Employee taps "Confirm Check-In"
  └─ Record saved → attendance event + evidence record
```

### Data Model

```typescript
// Extends existing AttendanceEvidence
interface SiteSurveyPhoto {
  id: string;
  eventId: string;            // links to AttendanceEvent
  employeeId: string;
  photoDataUrl: string;       // base64 JPEG selfie (compressed ~100KB)
  gpsLat: number;
  gpsLng: number;
  gpsAccuracyMeters: number;
  reverseGeoAddress?: string; // "123 Rizal Ave, Makati City"
  capturedAt: string;         // ISO 8601
  geofencePass?: boolean;     // computed: is within project radius?
  projectId?: string;         // which project geofence was checked
}
```

### Technical Notes
- **Camera:** `navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })` → render to `<video>` → snapshot to `<canvas>.toDataURL("image/jpeg", 0.6)`
- **GPS:** `navigator.geolocation.getCurrentPosition()` with `enableHighAccuracy: true`
- **Storage:** Photos stored as base64 in localStorage (compressed to ~80-120KB each). Keep last 100 photos, auto-purge oldest.
- **Geofence check:** Use existing `isWithinGeofence()` from `@/lib/geofence.ts` to validate against assigned project location.

### Admin Settings
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `requireSelfie` | boolean | false | Force selfie for every check-in |
| `selfieRequiredProjects` | string[] | [] | Projects that require selfie check-in |
| `selfieMaxAge` | number | 60 | Max seconds between photo capture and GPS reading |
| `showReverseGeocode` | boolean | true | Display street address from coordinates |
| `selfieCompressionQuality` | number | 0.6 | JPEG quality (0.1-1.0) |

### Components
- `<SelfieCapture />` — Camera viewfinder with capture button + GPS loading indicator
- `<LocationResult />` — Display card with lat/lng, accuracy, optional map, address
- `<SiteSurveyGallery />` — Admin view: grid of employee selfies with location data

---

## Feature B — Lunch Break Geofence Enforcement

### Overview
Employees can take lunch breaks. The system:
1. Tracks when they start and end lunch break
2. On return from lunch, checks their GPS location
3. If they are **outside** the geofenced project area after lunch, shows their **real location** with a warning
4. Warns both the employee and the admin

### User Flow

```
During work day (after check-in):
  ├─ Employee taps "Start Lunch Break"
  │   ├─ Records BREAK_START event with GPS
  │   ├─ Timer starts (configurable lunch duration, e.g., 60 min)
  │   └─ Status: "On Lunch"
  │
  ├─ Lunch timer expires → visual warning "Lunch break over"
  │
  ├─ Employee taps "End Lunch Break"
  │   ├─ Records BREAK_END event with GPS
  │   ├─ System checks: is employee within geofence?
  │   │
  │   ├─ ✅ WITHIN geofence:
  │   │   └─ Normal resume, no warning
  │   │
  │   └─ ❌ OUTSIDE geofence:
  │       ├─ Show warning to employee:
  │       │   "⚠ You are 1.2km from your work site"
  │       │   "Current location: 14.5510, 120.9915"
  │       │   "Expected site: BGC Project (14.5540, 120.9930)"
  │       ├─ Record "out_of_geofence" flag on exception
  │       ├─ Create notification for admin:
  │       │   "[Employee Name] returned from lunch outside geofence (1.2km away)"
  │       └─ GPS coordinates + timestamp logged
```

### Data Model

```typescript
interface BreakRecord {
  id: string;
  employeeId: string;
  date: string;              // "YYYY-MM-DD"
  breakType: "lunch" | "other";
  startTime: string;         // ISO
  endTime?: string;          // ISO (null = still on break)
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  endGeofencePass?: boolean;
  distanceFromSite?: number; // meters
  duration?: number;         // minutes
  overtime?: boolean;        // exceeded allowed break time
}
```

### Admin Settings
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `lunchDuration` | number | 60 | Standard lunch break in minutes |
| `lunchGeofenceRequired` | boolean | true | Check geofence on lunch return |
| `lunchOvertime Threshold` | number | 5 | Extra minutes before flagging late return |
| `alertAdminOnGeofenceViolation` | boolean | true | Notify admin of out-of-geofence returns |
| `allowedBreaksPerDay` | number | 1 | Max number of breaks |
| `breakGracePeriod` | number | 5 | Minutes grace before overtime starts |

---

## Feature C — Continuous Location Tracking (5-10 min)

### Overview
The system periodically captures employee GPS location every 5-10 minutes during work hours. Key rules:
1. Location must be **always on** — system warns employee if disabled
2. If an employee is outside the geofence at any ping, **warn them and the admin**
3. Admin can **choose the interval** (5, 10, 15, 20 min) and whether tracking is required
4. All pings are logged for audit

### User Flow

```
Employee checks in:
  ├─ System starts location watcher
  │   ├─ Uses navigator.geolocation.watchPosition() for continuous tracking
  │   ├─ Every N minutes, records a LocationPing
  │   │
  │   ├─ If location is ON:
  │   │   ├─ Ping recorded with lat/lng/accuracy
  │   │   ├─ Geofence checked against assigned project
  │   │   ├─ If OUTSIDE: warn employee + notify admin
  │   │   └─ Badge shows "📍 Tracking Active"
  │   │
  │   ├─ If location is OFF / permission denied:
  │   │   ├─ Show persistent banner: "⚠ Location is required. Enable GPS."
  │   │   ├─ Notify admin: "[Employee] has disabled location"
  │   │   └─ Record a "location_disabled" exception
  │   │
  │   └─ Every pingInterval:
  │       ├─ Capture GPS
  │       ├─ Compute geofence distance
  │       └─ Store LocationPing record
  │
  ├─ Employee checks out → stop watcher
  └─ Admin can view location trail in "Employee Location Map" view
```

### Data Model

```typescript
interface LocationPing {
  id: string;
  employeeId: string;
  timestamp: string;        // ISO 8601
  lat: number;
  lng: number;
  accuracyMeters: number;
  withinGeofence: boolean;
  projectId?: string;
  distanceFromSite?: number; // meters
  source: "auto" | "manual" | "break_end";
}

interface LocationTrackingConfig {
  // Admin-configurable
  enabled: boolean;
  pingIntervalMinutes: number;         // 5 | 10 | 15 | 20
  requireLocation: boolean;            // if true, warn when GPS is off
  warnEmployeeOutOfFence: boolean;
  alertAdminOutOfFence: boolean;
  alertAdminLocationDisabled: boolean;
  trackDuringBreaks: boolean;          // continue pinging during lunch
  retainDays: number;                  // auto-purge pings older than N days (localStorage space)
}
```

### Admin Settings Page
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | true | Master toggle for location tracking |
| `pingIntervalMinutes` | select | 10 | How often to capture location (5/10/15/20) |
| `requireLocation` | boolean | true | Force GPS on, warn if disabled |
| `warnEmployeeOutOfFence` | boolean | true | Show warning toast to employee |
| `alertAdminOutOfFence` | boolean | true | Create notification for admin |
| `alertAdminLocationDisabled` | boolean | true | Alert admin when GPS is turned off |
| `trackDuringBreaks` | boolean | false | Keep tracking during lunch/breaks |
| `retainDays` | number | 30 | Days to keep ping history |

### Admin View — Location Trail
- Map-like timeline view (list of pings with lat/lng, geofence status, timestamp)
- Filter by employee, date range
- Red/green indicators for in/out of geofence
- Export to CSV for payroll audit

---

## Feature D — Payslip Signing & Confirmation Workflow

### Overview
Complete payslip lifecycle with employee signature and admin/finance confirmation:

```
Payroll → Issue → Employee Signs → Admin/Finance Confirms Paid → Employee Acknowledges Receipt
```

### Status Flow

```
                  ┌──────────────────────────────────────────────────┐
                  │                PAYSLIP LIFECYCLE                 │
                  └──────────────────────────────────────────────────┘
                              
  ┌─────────┐    ┌───────────┐    ┌───────────┐    ┌──────────┐    ┌──────────────┐
  │ ISSUED  │ →  │ CONFIRMED │ →  │ PUBLISHED │ →  │  PAID    │ →  │ ACKNOWLEDGED │
  │         │    │ (internal)│    │ (visible)  │    │ (finance)│    │  (employee)  │
  └─────────┘    └───────────┘    └───────────┘    └──────────┘    └──────────────┘
       ↑                                ↓                ↓               ↓
  Finance creates              Employee sees it    Finance marks    Employee signs
                               and can sign         as paid         to confirm receipt
```

### Employee Signature Flow

```
Employee opens "My Payslips":
  ├─ Sees list of payslips with status badges:
  │   ├─ "Published" (orange) — awaiting signature
  │   ├─ "Signed" (blue) — signed but not yet marked paid
  │   ├─ "Paid" (green) — confirmed paid by finance
  │   └─ "Acknowledged" (emerald) — employee confirmed receipt
  │
  ├─ Clicks on a payslip → Detail view:
  │   ├─ Full breakdown (gross, deductions, net)
  │   ├─ Period dates
  │   ├─ Signature status
  │   │
  │   ├─ If "Published" and not signed:
  │   │   └─ "Sign Payslip" button → opens signature pad
  │   │       ├─ Uses existing <SignaturePad /> component
  │   │       ├─ Employee draws signature
  │   │       ├─ Confirm → saves signatureDataUrl + signedAt
  │   │       └─ Status remains "published" but signedAt is set
  │   │
  │   ├─ If "Paid" by finance:
  │   │   └─ "I Confirm Receipt" button → sets acknowledged
  │   │
  │   └─ Download PDF option
```

### Admin / Finance View

```
Admin/Finance opens "Payslip Management":
  ├─ Table of all payslips:
  │   ├─ Columns: Employee | Period | Net Pay | Status | Signed? | Actions
  │   ├─ Filter by: Status, Period, Department
  │   ├─ "Signed?" column shows:
  │   │   ├─ ✅ Signed (with date) — clickable to view signature
  │   │   └─ ⏳ Pending
  │   │
  │   ├─ Actions per payslip:
  │   │   ├─ 👁 View Details (includes signature image if signed)
  │   │   ├─ ✅ Mark as Paid (finance only)
  │   │   └─ 📥 Download PDF
  │   │
  │   └─ Bulk actions:
  │       ├─ "Mark Selected as Paid"
  │       └─ "Export Bank File"
  │
  ├─ Signature Viewer Dialog:
  │   ├─ Employee name & ID
  │   ├─ Payslip period & net pay
  │   ├─ Signature image (full size)
  │   ├─ Signed date/time
  │   └─ Status badge
```

### Data Model Changes

The existing `Payslip` type already has the needed fields:
```typescript
// Already in types/index.ts:
signedAt?: string;
signatureDataUrl?: string;
ackTextVersion?: string;

// Already in payroll.store.ts:
signPayslip: (id: string, signatureDataUrl: string) => void;
```

**New fields to add:**
```typescript
// Add to Payslip interface
acknowledgedAt?: string;             // when employee confirmed receipt
acknowledgedBy?: string;             // employee ID who acknowledged
paidConfirmedBy?: string;            // admin/finance user who marked paid
paidConfirmedAt?: string;            // when finance confirmed payment
```

**New store actions:**
```typescript
acknowledgePayslip: (id: string, employeeId: string) => void;
confirmPaid: (id: string, confirmedBy: string, method: string, reference: string) => void;
getPayslipsByStatus: (status: PayslipStatus) => Payslip[];
getSignedPayslips: () => Payslip[];
getUnsignedPayslips: () => Payslip[];
```

### New Pages / Components
| Route | Purpose | Access |
|-------|---------|--------|
| `/payroll` (existing) | Add "Payslip Management" tab | admin, finance, payroll_admin |
| `/payroll` employee view | "My Payslips" with sign flow | employee |
| `<PayslipDetailDialog />` | Full payslip breakdown + signature | all |
| `<PayslipSignatureViewer />` | View/verify employee signature | admin, finance |
| `<SignaturePad />` (existing) | Draw signature | employee |

---

## Feature E — SMS & Email Notification Reminders

### Overview
Configurable notification system that sends reminders via SMS and email to employees and admins. In MVP/localStorage mode, notifications are simulated and logged.

### Notification Types

| # | Trigger | Recipient | Channel | Message |
|---|---------|-----------|---------|---------|
| 1 | Payslip published | Employee | Email + SMS | "Your payslip for [period] is ready. Net pay: ₱XX,XXX. Please sign in NexHRMS." |
| 2 | Leave request submitted | Admin/HR | Email | "[Employee] submitted a leave request ([type], [dates])" |
| 3 | Leave approved/rejected | Employee | Email + SMS | "Your [type] leave ([dates]) has been [approved/rejected]" |
| 4 | Attendance missing | Employee | SMS | "Reminder: You have not checked in today. Please check in." |
| 5 | Geofence violation | Admin | Email | "[Employee] is outside the geofence at [time]" |
| 6 | Loan deduction upcoming | Employee | SMS | "Reminder: ₱X,XXX loan deduction will be applied to your next payslip" |
| 7 | Payslip unsigned reminder | Employee | Email + SMS | "Reminder: Please sign your payslip for [period]" |
| 8 | Overtime request | Admin/Supervisor | Email | "[Employee] submitted an overtime request for [date]" |
| 9 | Birthday greeting | Employee | Email + SMS | "Happy Birthday, [Name]! 🎂" |
| 10 | Contract/probation expiry | Admin/HR | Email | "[Employee]'s probation ends on [date]. Action required." |
| 11 | Daily attendance summary | Admin | Email | "Today: X present, Y absent, Z on leave" |
| 12 | Location disabled warning | Admin | SMS + Email | "[Employee] has disabled location tracking" |
| 13 | Payslip signed | Admin/Finance | Email | "[Employee] has signed payslip for [period]" |
| 14 | Payment confirmed | Employee | SMS | "Your payment for [period] has been confirmed. Amount: ₱XX,XXX." |

### Admin Configuration

```
Settings > Notifications:
  ├─ Global Settings:
  │   ├─ SMS Provider: [Simulated] (MVP) / Twilio / Semaphore
  │   ├─ Email Provider: [Simulated] (MVP) / Resend / SMTP
  │   ├─ SMS enabled: [toggle]
  │   ├─ Email enabled: [toggle]
  │   └─ Default sender name: "NexHRMS"
  │
  ├─ Notification Rules (per type):
  │   ├─ Enable/Disable toggle
  │   ├─ Channel: Email / SMS / Both / None
  │   ├─ Recipients: Employee / Admin / HR / Custom
  │   ├─ Timing: Immediate / Scheduled (e.g., 8:00 AM daily)
  │   └─ Custom message template (with variables: {name}, {period}, {amount}, etc.)
  │
  └─ Reminder Schedule:
      ├─ Payslip sign reminder: Days after publish (1, 3, 5, 7)
      ├─ Missing attendance: Time of day to send (e.g., 10:00 AM)
      └─ Loan reminder: Days before deduction (3 days)
```

### Data Model

```typescript
type NotificationChannel = "email" | "sms" | "both" | "in_app";
type NotificationTrigger =
  | "payslip_published" | "payslip_signed" | "payslip_unsigned_reminder" | "payment_confirmed"
  | "leave_submitted" | "leave_approved" | "leave_rejected"
  | "attendance_missing" | "geofence_violation" | "location_disabled"
  | "loan_reminder" | "overtime_submitted"
  | "birthday" | "contract_expiry" | "daily_summary";

interface NotificationRule {
  id: string;
  trigger: NotificationTrigger;
  enabled: boolean;
  channel: NotificationChannel;
  recipientRoles: string[];       // ["admin", "hr", "employee"] or specific roles
  timing: "immediate" | "scheduled";
  scheduleTime?: string;          // "08:00" for scheduled
  reminderDays?: number[];        // [1, 3, 5] for recurring reminders
  subjectTemplate: string;        // "Payslip Ready: {period}"
  bodyTemplate: string;           // "Hi {name}, your payslip for {period}..."
  smsTemplate?: string;           // shorter version for SMS
}

// Extend existing NotificationLog
interface NotificationLogExtended {
  id: string;
  employeeId: string;
  type: NotificationTrigger;
  channel: NotificationChannel;
  subject: string;
  body: string;
  sentAt: string;
  status: "sent" | "failed" | "simulated";
  recipientEmail?: string;
  recipientPhone?: string;
  errorMessage?: string;
}
```

### MVP Behavior (localStorage)
- All notifications are **simulated** — they appear in the Notifications page in-app
- Toast messages show "📧 Email sent (simulated)" or "📱 SMS sent (simulated)"
- Full notification log stored in localStorage
- Templates are editable but rendering is in-app only
- When production DB is added: swap simulated send with Resend (email) / Semaphore (SMS PH)

---

## Data Schema (localStorage)

All new data will live under these localStorage keys:

| Key | Content | Est. Size |
|-----|---------|-----------|
| `nexhrms-site-photos` | SiteSurveyPhoto[] (max 100, auto-purge oldest) | ~10-12 MB |
| `nexhrms-break-records` | BreakRecord[] | ~50 KB |
| `nexhrms-location-pings` | LocationPing[] (auto-purge after retainDays) | ~200 KB |
| `nexhrms-location-config` | LocationTrackingConfig | ~1 KB |
| `nexhrms-notification-rules` | NotificationRule[] | ~5 KB |
| `nexhrms-notifications` | NotificationLogExtended[] (existing, extended) | ~100 KB |
| `nexhrms-payroll` | Payslip[] (existing, add new fields) | existing |

### localStorage Budget
- **Total budget:** ~15 MB (safe for most browsers with 5-10 MB limit per origin)
- **Photo mitigation:** Compress selfies to 0.4-0.6 JPEG quality (~80KB each), keep max 100 → ~8 MB
- **Ping mitigation:** Auto-purge pings older than N days; 30 days × 48 pings/day × 10 employees = ~14,400 records (~500KB)

---

## Implementation Phases

### Phase 1 — Core Location & Photo (Stores + Components)
**Files to create/modify:**

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `src/store/location.store.ts` | CREATE | LocationPing[], BreakRecord[], SiteSurveyPhoto[], config |
| 2 | `src/types/index.ts` | MODIFY | Add SiteSurveyPhoto, BreakRecord, LocationPing, LocationTrackingConfig types |
| 3 | `src/components/attendance/selfie-capture.tsx` | CREATE | Camera + GPS capture component |
| 4 | `src/components/attendance/location-result.tsx` | CREATE | Lat/lng display card with accuracy |
| 5 | `src/components/attendance/location-tracker.tsx` | CREATE | Background GPS watcher (interval-based) |
| 6 | `src/components/attendance/break-timer.tsx` | CREATE | Lunch break start/end with geofence check |

### Phase 2 — Attendance Page Enhancements
| # | File | Action | Description |
|---|------|--------|-------------|
| 7 | `src/app/attendance/page.tsx` | MODIFY | Add selfie check-in option, break controls, location status |
| 8 | `src/app/kiosk/page.tsx` | MODIFY | Add selfie option (if admin enables for kiosk) |
| 9 | `src/components/attendance/site-survey-gallery.tsx` | CREATE | Admin gallery view of employee selfies |
| 10 | `src/components/attendance/location-trail.tsx` | CREATE | Admin view: employee location pings timeline |

### Phase 3 — Payslip Signing & Management
| # | File | Action | Description |
|---|------|--------|-------------|
| 11 | `src/types/index.ts` | MODIFY | Add acknowledgedAt, paidConfirmedBy fields to Payslip |
| 12 | `src/store/payroll.store.ts` | MODIFY | Add acknowledgePayslip, confirmPaid, getSignedPayslips |
| 13 | `src/app/payroll/page.tsx` | MODIFY | Add "Payslip Management" tab for admin, "My Payslips" for employee |
| 14 | `src/components/payroll/payslip-detail.tsx` | CREATE | Full payslip view with sign button |
| 15 | `src/components/payroll/payslip-signature-viewer.tsx` | CREATE | View employee signature |
| 16 | `src/components/payroll/payslip-table.tsx` | CREATE | Admin table with signed/unsigned filter |

### Phase 4 — Notification System
| # | File | Action | Description |
|---|------|--------|-------------|
| 17 | `src/store/notifications.store.ts` | MODIFY | Add rules, extended log, trigger dispatch |
| 18 | `src/types/index.ts` | MODIFY | Add NotificationRule, NotificationChannel types |
| 19 | `src/app/settings/notifications/page.tsx` | CREATE | Admin notification rules config page |
| 20 | `src/lib/notifications.ts` | MODIFY | Add template rendering, simulated send, trigger logic |
| 21 | `src/app/notifications/page.tsx` | MODIFY | Enhanced log view with channel badges, status |

### Phase 5 — Admin Settings & Integration
| # | File | Action | Description |
|---|------|--------|-------------|
| 22 | `src/app/settings/location/page.tsx` | CREATE | Location tracking config page |
| 23 | `src/app/settings/page.tsx` | MODIFY | Add links to Location Settings, Notification Settings |
| 24 | `src/store/kiosk.store.ts` | MODIFY | Add selfie-related settings |
| 25 | `src/app/settings/kiosk/page.tsx` | MODIFY | Add selfie toggle & configuration |

### Phase 6 — Polish & Integration Testing
| # | Task | Description |
|---|------|-------------|
| 26 | Cross-feature wiring | Location tracker triggers notifications on geofence violation |
| 27 | Break → notification | Lunch overtime triggers admin notification |
| 28 | Payslip → notification | Publishing payslip auto-creates reminder notifications |
| 29 | Build verification | `next build` — 0 errors across all routes |
| 30 | Git commit & push | Final commit with all features |

---

## Estimated File Count

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| Stores | 1 | 3 |
| Types | 0 | 1 |
| Pages | 2 | 5 |
| Components | 7 | 0 |
| Lib/utils | 0 | 1 |
| **Total** | **10** | **10** |

---

## Key Admin Freedom Points

The client specifically requested admin control. Here's the complete list of admin-configurable settings:

| Setting | Location | What Admin Controls |
|---------|----------|--------------------|
| Selfie required | Settings > Kiosk | Whether selfie is mandatory for check-in |
| Selfie per project | Settings > Location | Which projects need selfie proof |
| Lunch duration | Settings > Location | How long lunch break is (30/45/60/90 min) |
| Geofence on lunch return | Settings > Location | Whether to check geofence after lunch |
| Location tracking on/off | Settings > Location | Master toggle for GPS tracking |
| Tracking interval | Settings > Location | 5 / 10 / 15 / 20 minute intervals |
| Require GPS always on | Settings > Location | Whether to force GPS (warn if off) |
| Alert admin on violation | Settings > Location | Auto-notify admin on geofence breach |
| Alert admin on GPS off | Settings > Location | Auto-notify when employee disables GPS |
| Track during breaks | Settings > Location | Keep tracking during lunch |
| Ping retention days | Settings > Location | How long to keep location history |
| Notification rules | Settings > Notifications | Per-trigger enable/channel/template |
| Reminder schedule | Settings > Notifications | When to send payslip/attendance reminders |
| SMS/Email provider | Settings > Notifications | Provider configuration |

---

## Notes for Future Database Migration

When moving from localStorage to a real database (PostgreSQL/Supabase):

1. **SiteSurveyPhoto.photoDataUrl** → Move to object storage (S3/Supabase Storage), store URL only
2. **LocationPing[]** → Time-series table with proper indexing on (employeeId, timestamp)
3. **NotificationRule[]** → Normalized table with FK to roles
4. **Payslip signatures** → signatureDataUrl moves to storage, payslip gets signatureUrl
5. **SMS/Email** → Replace simulated send with actual API calls (Resend, Semaphore)
6. All Zustand stores → Server-side API routes + React Query / SWR

---

*End of plan. Ready for implementation.*
