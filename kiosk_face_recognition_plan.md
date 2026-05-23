# Kiosk Face Recognition & Developer-Options Penalty Plan

> **Project:** NexHRMS  
> **Date:** February 27, 2026  
> **Status:** Planning

---

## Table of Contents

1. [Overview](#1-overview)  
2. [Feature A — Face Recognition in Kiosk](#2-feature-a--face-recognition-in-kiosk)  
3. [Feature B — Developer-Options Penalty Timer](#3-feature-b--developer-options-penalty-timer)  
4. [Store & Type Changes](#4-store--type-changes)  
5. [Settings UI (Admin Controls)](#5-settings-ui-admin-controls)  
6. [Kiosk Page Changes](#6-kiosk-page-changes)  
7. [Attendance Page Changes](#7-attendance-page-changes)  
8. [File Change Map](#8-file-change-map)  
9. [Implementation Phases](#9-implementation-phases)  
10. [Testing Plan](#10-testing-plan)

---

## 1. Overview

Two new features to strengthen attendance verification and anti-cheat:

| # | Feature | Summary |
|---|---------|---------|
| A | **Face Recognition in Kiosk** | Integrate the existing `FaceRecognitionSimulator` into the kiosk check-in flow. Admin chooses which verification steps appear on the kiosk (QR, PIN, Face, Selfie) via a new multi-select in Kiosk Settings. |
| B | **Developer-Options Penalty Timer** | When an employee's check-in is blocked due to developer options / DevTools / location spoofing, a configurable penalty cooldown is applied (default 30 min). The employee cannot attempt check-in again until the timer expires **and** the violation is resolved. Admin sets the penalty duration from Settings. |

---

## 2. Feature A — Face Recognition in Kiosk

### 2.1 Current State

- **`FaceRecognitionSimulator`** component exists at `src/components/attendance/face-recognition.tsx`.
- Used in the **attendance page** multi-step check-in dialog (step after location verification).
- Uses the device camera with `getUserMedia({ video: { facingMode: "user" } })`.
- Falls back to a simulated viewfinder if camera access is denied.
- 3-second countdown scan → fires `onVerified()` callback.
- **Kiosk page** (`src/app/kiosk/page.tsx`) currently supports QR and PIN check-in only — no face recognition.

### 2.2 Desired Behavior

```
┌─────────────────────────────────────────────────┐
│                 KIOSK SCREEN                    │
│                                                 │
│  ┌─── QR Panel ───┐   ┌─── PIN Panel ────┐     │
│  │  (if enabled)   │   │  (if enabled)    │     │
│  └─────────────────┘   └─────────────────-┘     │
│                                                 │
│        ┌──── Face Recognition Panel ────┐       │
│        │  (if enabled)                  │       │
│        │  Live camera viewfinder        │       │
│        │  "Position your face" guide    │       │
│        │  Auto-scan on face detected    │       │
│        │  Success → Check In/Out        │       │
│        └────────────────────────────────┘       │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2.3 Admin Controls (what the admin can choose)

The admin gets a **multi‑select checklist** in Kiosk Settings to pick which verification methods appear on the kiosk:

| Option | Default | Description |
|--------|---------|-------------|
| **QR Code** | ✅ On | Show the rotating QR/token panel |
| **PIN Keypad** | ✅ On | Show the PIN entry numpad |
| **Face Recognition** | ❌ Off | Show the face scan panel as a check-in method |
| **Selfie Capture** | ❌ Off | Prompt a selfie after successful PIN/QR/Face check-in (proof photo, not identity verification) |

Additional face-rec settings the admin can configure:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `faceRecEnabled` | boolean | `false` | Master toggle for face recognition on kiosk |
| `faceRecRequired` | boolean | `false` | If true, face scan is mandatory — cannot skip |
| `faceRecAutoStart` | boolean | `true` | Automatically activate camera when kiosk loads (vs. tap to start) |
| `faceRecCountdown` | number | `3` | Seconds for the scan countdown (1–10) |
| `faceRecPosition` | `"left"` \| `"right"` \| `"bottom"` | `"bottom"` | Where the face-rec panel sits relative to QR/PIN |

### 2.4 Kiosk Flow with Face Recognition

```
Employee approaches kiosk
  │
  ├── QR scan ──────────► Employee identified → (if faceRec required) → Face Scan → ✅ Check In
  │                                           → (if faceRec optional) → ✅ Check In
  │
  ├── PIN entry ────────► Employee identified → (same as above)
  │
  └── Face Recognition ─► Camera activates → Face detected → 3s countdown
                           → ✅ Verified → employeeId resolved → Check In
```

**Key behaviors:**
- When used as a **standalone method** (no QR/PIN), the system needs employee identification. In the simulated MVP, it will prompt for a name/PIN *after* face scan succeeds (since we don't have a real face-matching database).
- When used **alongside QR/PIN**, it acts as a **second factor** — the employee first identifies via QR/PIN, then verifies their face.
- On verification success, `faceVerified: true` is set on the attendance log.
- If the employee **skips** face scan (when not required), `faceVerified` stays `false`.

---

## 3. Feature B — Developer-Options Penalty Timer

### 3.1 Current State

- **DevTools detection** in `src/app/attendance/page.tsx` at `startCheckIn()`:
  - Checks `window.outerWidth - window.innerWidth > 160` (desktop DevTools panel).
  - Blocks check-in with toast error.
- **Location spoofing detection** in `detectLocationSpoofing()`:
  - Checks `navigator.webdriver`, GPS accuracy outliers, missing altitude data, negative speed.
  - Blocks check-in and shows error reason.
- **Current penalty:** None — the employee can just close DevTools / disable mock location and immediately retry.

### 3.2 Desired Behavior

When a violation is detected (DevTools open, location spoofing, mock GPS), the system:

1. **Blocks check-in immediately** (same as now).
2. **Records a penalty timestamp** for that employee: `penaltyUntil = now + penaltyDuration`.
3. **Prevents any further check-in attempts** until:
   - The penalty timer has expired, **AND**
   - The violation condition is no longer detected.
4. Shows a **countdown timer** to the employee: "Check-in blocked. You can try again in 28:42."
5. The penalty is **per-employee** and persists across page refreshes (stored in Zustand with `persist`).

### 3.3 Admin Controls

| Setting | Type | Default | Location |
|---------|------|---------|----------|
| `devOptionsPenaltyEnabled` | boolean | `true` | Settings → Kiosk (Security section) |
| `devOptionsPenaltyMinutes` | number | `30` | Settings → Kiosk (Security section) |
| `devOptionsPenaltyApplyTo` | `"devtools"` \| `"spoofing"` \| `"both"` | `"both"` | Settings → Kiosk (Security section) |
| `devOptionsPenaltyNotifyAdmin` | boolean | `true` | Settings → Kiosk (Security section) |

**Range for penalty duration:** 5 minutes → 480 minutes (8 hours), slider with step 5.

### 3.4 Penalty Flow

```
Employee opens /attendance → Clicks "Check In"
  │
  ├── Has active penalty? ──────► YES → Show countdown timer
  │                                      "Blocked until HH:MM:SS (reason)"
  │                                      Cannot click Check In button (disabled)
  │
  └── No penalty → proceed normally
        │
        ├── DevTools detected? ──► Block + apply penalty timer
        │                          Toast: "Developer tools detected. Check-in locked for 30 minutes."
        │                          Record: { employeeId, reason, penaltyUntil, triggeredAt }
        │                          (Optional) Send admin notification
        │
        ├── Location spoof? ────► Block + apply penalty timer
        │                          Toast: "Mock location detected. Check-in locked for 30 minutes."
        │
        └── Clean → continue to geolocation → face scan → check in ✅
```

### 3.5 Penalty Data Structure

```typescript
interface PenaltyRecord {
  employeeId: string;
  reason: string;               // "DevTools detected" | "Mock location: ..." 
  triggeredAt: string;          // ISO timestamp
  penaltyUntil: string;         // ISO timestamp = triggeredAt + penaltyMinutes
  resolved: boolean;            // Admin can manually clear
}
```

### 3.6 Where Penalties Are Shown

| View | What's shown |
|------|-------------|
| **Employee `/attendance`** | Countdown banner above Check In button: "Check-in blocked for 28:42 — Developer tools were detected." |
| **Kiosk** | Error feedback with remaining time: "Locked — try again in 28 min." |
| **Admin `/attendance` (Event Ledger)** | Penalty events logged as `PENALTY_APPLIED` and `PENALTY_EXPIRED` events |
| **Admin `/settings/kiosk`** | Configure penalty duration and triggers |

---

## 4. Store & Type Changes

### 4.1 `kiosk.store.ts` — New KioskSettings Fields

```typescript
// ── Face Recognition (Kiosk) ──
faceRecEnabled: boolean;          // default: false
faceRecRequired: boolean;         // default: false
faceRecAutoStart: boolean;        // default: true
faceRecCountdown: number;         // default: 3 (seconds, range 1-10)
faceRecPosition: "left" | "right" | "bottom"; // default: "bottom"

// ── Developer Options Penalty ──
devOptionsPenaltyEnabled: boolean;      // default: true
devOptionsPenaltyMinutes: number;       // default: 30 (range 5-480)
devOptionsPenaltyApplyTo: "devtools" | "spoofing" | "both"; // default: "both"
devOptionsPenaltyNotifyAdmin: boolean;  // default: true
```

### 4.2 `attendance.store.ts` — Penalty Records

```typescript
// New state
penalties: PenaltyRecord[];

// New actions
applyPenalty: (record: Omit<PenaltyRecord, "resolved">) => void;
clearPenalty: (employeeId: string) => void;       // Admin manual clear
getActivePenalty: (employeeId: string) => PenaltyRecord | undefined;
cleanExpiredPenalties: () => void;
```

### 4.3 `types/index.ts` — New Types

```typescript
interface PenaltyRecord {
  id: string;
  employeeId: string;
  reason: string;
  triggeredAt: string;
  penaltyUntil: string;
  resolved: boolean;
}
```

---

## 5. Settings UI (Admin Controls)

### 5.1 Kiosk Settings Page — New Sections

**Location:** `src/app/settings/kiosk/page.tsx`

#### Section: "Face Recognition" (new, after "Selfie & Photo")

```
┌─ 🧑‍💻 Face Recognition ──────────────────────────────┐
│                                                      │
│  Enable Face Recognition    [toggle]                 │
│  Require Face Scan          [toggle] (disabled if    │
│                              face rec is off)        │
│  Auto-Start Camera          [toggle]                 │
│  Scan Countdown             [slider 1–10s]           │
│  Panel Position             [select: left/right/     │
│                              bottom]                 │
│                                                      │
│  ℹ️ When enabled, a face scan panel appears on the   │
│  kiosk. Can be used as a standalone check-in method  │
│  or as a second verification step after QR/PIN.      │
└──────────────────────────────────────────────────────┘
```

#### Section: "Anti-Cheat Penalty" (new, after "Security")

```
┌─ ⚠️ Anti-Cheat Penalty ─────────────────────────────┐
│                                                      │
│  Enable Penalty Timer       [toggle]                 │
│  Penalty Duration           [slider 5–480 min]       │
│                              "30 minutes"            │
│  Apply To                   [select: DevTools /      │
│                              Spoofing / Both]        │
│  Notify Admin               [toggle]                 │
│                                                      │
│  ℹ️ When an employee is caught with developer tools  │
│  or mock location, their check-in is locked for the  │
│  configured duration. They must wait AND resolve the │
│  issue before retrying.                              │
└──────────────────────────────────────────────────────┘
```

---

## 6. Kiosk Page Changes

**File:** `src/app/kiosk/page.tsx`

### 6.1 Face Recognition Panel

- Import `FaceRecognitionSimulator` from `@/components/attendance/face-recognition`.
- Conditionally render a **third panel** based on `ks.faceRecEnabled`.
- Position determined by `ks.faceRecPosition`:
  - `"left"` → flex before QR
  - `"right"` → flex after PIN  
  - `"bottom"` → below the QR/PIN row (full width, centered)
- On `onVerified`:
  - If face-rec is the **only** enabled method → prompt name/PIN for identification, then record check-in.
  - If used alongside QR/PIN → act as second-factor after PIN/QR success.
- Dark-themed card to match kiosk aesthetic (`bg-white/[0.04] border-white/10 rounded-3xl`).
- Auto-start camera on load if `faceRecAutoStart` is true.

### 6.2 Selfie Capture on Kiosk

- After successful check-in (any method), if `selfieEnabled` is true → show `SelfieCapture` component overlay before confirming success.
- If `selfieRequired` is true → block success until selfie is taken.

### 6.3 Layout Adjustments

```
CURRENT LAYOUT:
┌─────────────────────────────────────┐
│   [QR Panel]       [PIN Panel]      │
└─────────────────────────────────────┘

NEW LAYOUT (faceRec bottom):
┌─────────────────────────────────────┐
│   [QR Panel]       [PIN Panel]      │
│                                     │
│         [Face Recognition]          │
└─────────────────────────────────────┘

NEW LAYOUT (faceRec left):
┌─────────────────────────────────────┐
│ [Face]  [QR Panel]  [PIN Panel]     │
└─────────────────────────────────────┘

NEW LAYOUT (faceRec right):
┌─────────────────────────────────────┐
│ [QR Panel]  [PIN Panel]  [Face]     │
└─────────────────────────────────────┘
```

---

## 7. Attendance Page Changes

**File:** `src/app/attendance/page.tsx`

### 7.1 Penalty Integration in `startCheckIn()`

```typescript
const startCheckIn = () => {
    // 1. Check for active penalty FIRST
    const penalty = getActivePenalty(myEmployeeId);
    if (penalty && new Date(penalty.penaltyUntil) > new Date()) {
        const remaining = Math.ceil((new Date(penalty.penaltyUntil).getTime() - Date.now()) / 60000);
        toast.error(`Check-in locked for ${remaining} more minute(s). Reason: ${penalty.reason}`);
        return;
    }

    // 2. DevTools detection (existing) → now applies penalty
    if (!isMobile && isDesktopDevToolsOpen()) {
        if (kioskSettings.devOptionsPenaltyEnabled && ["devtools", "both"].includes(kioskSettings.devOptionsPenaltyApplyTo)) {
            applyPenalty({
                employeeId: myEmployeeId,
                reason: "Developer tools detected",
                triggeredAt: new Date().toISOString(),
                penaltyUntil: new Date(Date.now() + kioskSettings.devOptionsPenaltyMinutes * 60000).toISOString(),
            });
        }
        toast.error(`Check-in blocked: Developer tools detected. Locked for ${kioskSettings.devOptionsPenaltyMinutes} minutes.`);
        return;
    }

    // ... rest of check-in flow
};
```

### 7.2 Penalty Countdown Banner (Employee View)

Above the hero status card, show a red penalty banner when active:

```
┌─── ⚠️ Check-In Locked ──────────────────────────┐
│                                                   │
│  Developer tools were detected.                   │
│  You can try again in  27:42                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░ (progress bar)   │
│                                                   │
│  Close developer tools and wait for the timer     │
│  to expire before attempting check-in.            │
└───────────────────────────────────────────────────┘
```

- Live countdown timer (updates every second).
- Check In button is disabled while penalty is active.
- Banner auto-dismisses when penalty expires.

### 7.3 Spoofing Penalty in `requestLocation()`

After `detectLocationSpoofing()` returns a reason, also apply penalty:

```typescript
const spoof = detectLocationSpoofing(pos.coords);
if (spoof) {
    if (kioskSettings.devOptionsPenaltyEnabled && ["spoofing", "both"].includes(kioskSettings.devOptionsPenaltyApplyTo)) {
        applyPenalty({
            employeeId: myEmployeeId,
            reason: spoof,
            triggeredAt: new Date().toISOString(),
            penaltyUntil: new Date(Date.now() + kioskSettings.devOptionsPenaltyMinutes * 60000).toISOString(),
        });
    }
    setSpoofReason(spoof);
    setStep("error");
    return;
}
```

---

## 8. File Change Map

| File | Action | What Changes |
|------|--------|-------------|
| `src/store/kiosk.store.ts` | **Modify** | Add face-rec & penalty settings to `KioskSettings` interface + defaults |
| `src/store/attendance.store.ts` | **Modify** | Add `penalties[]` state + `applyPenalty` / `clearPenalty` / `getActivePenalty` / `cleanExpiredPenalties` actions |
| `src/types/index.ts` | **Modify** | Add `PenaltyRecord` type |
| `src/app/settings/kiosk/page.tsx` | **Modify** | Add "Face Recognition" and "Anti-Cheat Penalty" sections |
| `src/app/kiosk/page.tsx` | **Modify** | Import face-rec component, render panel conditionally, handle second-factor flow, add layout positioning |
| `src/app/attendance/page.tsx` | **Modify** | Integrate penalty checks in `startCheckIn()` and `requestLocation()`, add penalty countdown banner to employee view |
| `src/components/attendance/face-recognition.tsx` | **Modify** | Add kiosk-themed variant (dark bg, white text) via optional `variant="kiosk"` prop, configurable countdown, auto-start support |

**No new files needed** — all changes fit into existing files.

---

## 9. Implementation Phases

### Phase 1: Store & Types (30 min)
1. Add `PenaltyRecord` to `types/index.ts`
2. Extend `KioskSettings` in `kiosk.store.ts` with face-rec and penalty defaults
3. Add penalty state + actions to `attendance.store.ts`

### Phase 2: Admin Settings UI (45 min)
4. Add "Face Recognition" section to kiosk settings page
5. Add "Anti-Cheat Penalty" section to kiosk settings page

### Phase 3: Face Recognition in Kiosk (1 hr)
6. Update `FaceRecognitionSimulator` to support `variant="kiosk"` dark theme + configurable countdown + auto-start
7. Integrate face-rec panel into kiosk page with position logic
8. Wire up check-in flow: face-rec as standalone or second-factor
9. Mobile responsive — face-rec panel stacks below QR/PIN on narrow screens

### Phase 4: Developer-Options Penalty (45 min)
10. Integrate `applyPenalty` into `startCheckIn()` for DevTools detection
11. Integrate `applyPenalty` into `requestLocation()` for spoofing detection
12. Add penalty countdown banner to employee attendance view
13. Disable Check In button while penalty is active
14. Add penalty events to Event Ledger (admin view)
15. Optional admin notification when penalty is applied

### Phase 5: Testing & Build (30 min)
16. Add Jest tests for penalty store actions
17. Add Jest tests for kiosk face-rec settings
18. Verify build passes (all routes clean)
19. Manual QA: kiosk face-rec flow, penalty timer, admin settings

---

## 10. Testing Plan

### Unit Tests (Jest)

| Test Suite | Cases |
|-----------|-------|
| `penalty.store.test.ts` | Apply penalty, check active penalty, clear penalty, auto-clean expired, persist across reload |
| `kiosk.store.test.ts` | Face-rec defaults, update settings, reset restores defaults, penalty settings |

### Integration Tests

| Scenario | Expected Outcome |
|----------|-----------------|
| Employee checks in on kiosk with face-rec enabled + required | Must complete face scan before check-in succeeds |
| Employee checks in on kiosk with face-rec enabled + optional | Can skip face scan, check-in still succeeds |
| Employee opens DevTools → clicks Check In | Blocked + 30 min penalty applied |
| Employee waits 30 min after penalty | Can check in again (if DevTools closed) |
| Admin reduces penalty to 5 min | New penalties use 5 min duration |
| Admin clears penalty manually | Employee can immediately check in |
| Face-rec position set to "left" | Panel renders on left side of QR/PIN row |
| All three methods enabled (QR + PIN + Face) | All three panels visible on kiosk |

### Manual QA Checklist

- [ ] Kiosk: Face-rec panel appears when enabled
- [ ] Kiosk: Face-rec panel hidden when disabled
- [ ] Kiosk: Camera activates on auto-start
- [ ] Kiosk: Countdown timer works (configurable seconds)
- [ ] Kiosk: Panel position (left / right / bottom) renders correctly
- [ ] Kiosk: Mobile responsive — panels stack vertically
- [ ] Kiosk: Selfie capture after face-rec (both enabled)
- [ ] Settings: All new toggles and sliders work
- [ ] Settings: Disabling face-rec grays out sub-settings
- [ ] Attendance: Penalty banner appears after DevTools detection
- [ ] Attendance: Countdown timer ticks down in real-time
- [ ] Attendance: Check In button disabled during penalty
- [ ] Attendance: Penalty clears after timer expires
- [ ] Attendance: Spoofing triggers penalty
- [ ] Attendance: Admin can manually clear penalty from Event Ledger
- [ ] Build: 33/33 routes, 0 errors

---

*End of plan — ready for implementation.*
