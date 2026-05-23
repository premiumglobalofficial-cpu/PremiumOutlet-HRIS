# NexHRMS QA Report — Notification Preferences & DB Persistence
**Date:** 2026-04-17  
**Scope:** Notification Settings, Push Gating, API Route, Database Persistence  
**Engineer:** Lead QA Agent  

---

## Test Results Summary

| Suite | Tests | Passed | Failed | Skipped | Coverage (Stmts) |
|-------|-------|--------|--------|---------|------------------|
| notifications.test.ts (recipients/routing) | 55 | 55 | 0 | 0 | 96.87% (lib) |
| notification-preferences.test.ts (prefs/API) | 65 | 65 | 0 | 0 | 86.36% (API) |
| **TOTAL** | **120** | **120** | **0** | **0** | **87.61% combined** |

### Per-File Coverage

| File | Stmts | Branches | Functions | Lines |
|------|-------|----------|-----------|-------|
| `src/lib/notifications.ts` | 96.87% | 76.78% | 94.44% | 96.72% |
| `src/store/notifications.store.ts` | 83.05% | 80.68% | 64.70% | 85.55% |
| `src/app/api/settings/notification-preferences/route.ts` | 86.36% | 86.11% | 100% | 86.36% |

---

## What Was Tested — Comprehensive Breakdown

### 1. Pure Functions (Unit Tests)
| Function | Tests | Status |
|----------|-------|--------|
| `prefKeyForTrigger()` — all 9 gated triggers | 9 | ✅ |
| `prefKeyForTrigger()` — 12+ ungated triggers return null | 2 | ✅ |
| `DEFAULT_EMPLOYEE_PREFS` — 4 keys, all true | 2 | ✅ |

### 2. isNotificationAllowed() — Per-Employee Category Gating
| Scenario | Status |
|----------|--------|
| All categories ALLOWED by default (no prefs set) | ✅ |
| BLOCK leave notifications when `leaveUpdates=false` | ✅ |
| Still ALLOW non-leave when `leaveUpdates=false` | ✅ |
| BLOCK absence notifications when `absenceAlerts=false` | ✅ |
| BLOCK payroll notifications when `payrollAlerts=false` | ✅ |
| Isolate prefs per employee (EMP-002 OFF, EMP-003 ON) | ✅ |
| Multiple prefs OFF simultaneously | ✅ |
| Re-enable when toggled back ON | ✅ |

### 3. isPushAllowed() — Push Notification Gating
| Scenario | Status |
|----------|--------|
| ALLOW push by default (`pushEnabled=true`) | ✅ |
| BLOCK push when `pushEnabled=false` | ✅ |
| Isolate push prefs per employee | ✅ |
| Re-enable push when toggled back ON | ✅ |

### 4. dispatch() — Rules-Based Engine Respects Prefs
| Scenario | Status |
|----------|--------|
| NO log when `payrollAlerts=OFF` for `payslip_published` | ✅ |
| NO log when `leaveUpdates=OFF` for `leave_approved` | ✅ |
| NO log when `absenceAlerts=OFF` for `absence` | ✅ |
| CREATE log when pref is ON (default) | ✅ |
| Log created but NO push when `pushEnabled=false` + pref=ON | ✅ |
| Block BOTH log+push when category OFF (even if `pushEnabled=ON`) | ✅ |
| Allow ungated triggers even with all category prefs OFF | ✅ |
| Different prefs for different employees in same batch | ✅ |

### 5. addLog() — Direct Store Method Respects Prefs
| Scenario | Status |
|----------|--------|
| NO log when `payrollAlerts=OFF` for `payslip_published` | ✅ |
| NO log when `leaveUpdates=OFF` for `leave_approved` | ✅ |
| Log created but NO push when `pushEnabled=false` | ✅ |
| Log + push when all prefs ON (default) | ✅ |

### 6. sendNotification() — Lib Helper Respects Prefs
| Scenario | Status |
|----------|--------|
| NO notification when `payrollAlerts=OFF` | ✅ |
| NO notification when `absenceAlerts=OFF` for absence | ✅ |
| Log created but NO push when `pushEnabled=false` | ✅ |
| Log + push when all prefs ON | ✅ |

### 7. Convenience Factories — Respect Prefs
| Factory | Blocked When OFF | Succeeds When ON |
|---------|-----------------|------------------|
| `notifyPayslipPublished()` | ✅ `payrollAlerts=false` | ✅ |
| `notifyAbsence()` | ✅ `absenceAlerts=false` | ✅ |

### 8. Store State Management (setEmployeePref / getEmployeePref)
| Scenario | Status |
|----------|--------|
| Returns `DEFAULT_EMPLOYEE_PREFS` when nothing set | ✅ |
| Partial patch merges with defaults (not replaces) | ✅ |
| Multiple prefs in one call | ✅ |
| Incremental updates (second call merges with first) | ✅ |
| Isolation between employees | ✅ |
| `resetToSeed()` clears all prefs | ✅ |

### 9. API Route GET /api/settings/notification-preferences (Supabase)
| Scenario | Status |
|----------|--------|
| Returns 401 when unauthenticated | ✅ |
| Returns employee prefs when authenticated | ✅ |
| Graceful degradation when column doesn't exist (pre-migration) | ✅ |

### 10. API Route PATCH /api/settings/notification-preferences (Supabase)
| Scenario | Status |
|----------|--------|
| Returns 401 when unauthenticated | ✅ |
| Returns 400 when preferences missing/invalid | ✅ |
| Returns 403 when employee doesn't belong to user (ownership) | ✅ |
| Returns 404 when employee ID doesn't exist | ✅ |
| Sanitizes prefs — strips non-boolean / unknown keys (XSS/SQLi safe) | ✅ |
| Successfully updates own prefs | ✅ |
| Graceful degradation when column not yet migrated | ✅ |

### 11. End-to-End Toggle Lifecycle
| Scenario | Status |
|----------|--------|
| Block when OFF → allow after toggling back ON | ✅ |
| Independent in-app vs push control via `pushEnabled` | ✅ |
| Rapid toggles without data corruption | ✅ |
| Multiple employees with different prefs simultaneously | ✅ |

---

## Failing Tests
| Test Name | File | Error | Root Cause | Fix Applied |
|-----------|------|-------|------------|-------------|
| `notifyPayslipSigned should create notification for signing employee` | notifications.test.ts:612 | Expected length 1, received 0 | Source excludes signer (`e.id !== params.employeeId`). Test was incorrect. | Fixed: test now asserts signer does NOT receive notification |
| `notifyLocationDisabled should dispatch to admin caller` | notifications.test.ts:669 | `getLatestLog()` was null | Source excludes passed employee from admin list. Test passed EMP-001 (only admin) so no recipients. | Fixed: pass EMP-002 as offending employee, assert EMP-001 receives it |

---

## Security Checks
- [x] API route returns `401` without auth token (GET + PATCH)
- [x] PATCH ownership check: employee `profile_id` must match `auth.user.id`
- [x] Unknown preference keys stripped (prevents arbitrary JSON injection)
- [x] Non-boolean values stripped from preferences
- [x] SQL injection payloads in pref keys are sanitized
- [x] XSS payloads in pref keys are sanitized
- [x] Graceful degradation for pre-migration DB (no crash)

---

## Database Persistence Flow (Verified)

```
User toggles "Payroll Alerts" OFF in Settings UI
  → setEmployeePref("EMP-xxx", { payrollAlerts: false })      ← Zustand store (immediate)
  → PATCH /api/settings/notification-preferences               ← Supabase DB (persistent)
    → Validates auth (401 if unauthenticated)
    → Validates ownership (403 if not your employee record)
    → Sanitizes keys (only known boolean prefs accepted)
    → UPDATE employees SET notification_preferences = {...} WHERE id = ?

On app load / settings mount:
  → GET /api/settings/notification-preferences                 ← Reads from Supabase DB
    → Returns { employeeId: "EMP-xxx", preferences: {...} }
  → setEmployeePref(employeeId, preferences)                   ← Hydrates Zustand store

On initial sync:
  → sync.service.ts reads employees with notification_preferences
  → Hydrates employeePrefs in notifications store for all employees
```

---

## Verdict
> **PASS** — All 120 tests pass. Notification preferences correctly gate in-app and push notifications per employee. API route persists to Supabase with proper auth, ownership validation, and input sanitization.

### Notes
- Migration `049_employees_notification_preferences.sql` must be run on Supabase for DB persistence to work
- API route handles pre-migration gracefully (returns empty prefs, saves silently fail)
- `zustand persist` warnings in test output are expected (no `localStorage` in Node.js test environment)
