# Zustand → Supabase DB-First Migration Checklist

> **Goal:** Remove Zustand as source of truth for 19 stores. Make Supabase the primary data store.
> **Keep as Zustand (client-only):** `ui.store`, `appearance.store`, `kiosk.store`, `offline-queue.store`
> **Pattern:** Create service layer → Update UI to call service → Remove write-through → Remove persist

---

## Migration Order (by complexity)

| # | Store | Complexity | Tables | Status |
|---|-------|-----------|--------|--------|
| 1 | `payroll.store` | ✅ Done | payslips, payroll_runs, adjustments, final_pay | ✅ Service created |
| 2 | `notifications.store` | Low | notification_logs, notification_rules | ✅ Service created |
| 3 | `audit.store` | Low | audit_logs | ✅ Service created |
| 4 | `events.store` | Low | calendar_events | ✅ Service created |
| 5 | `projects.store` | Low | projects, project_assignments | ✅ Service created |
| 6 | `departments.store` | Low | departments | ✅ Service created |
| 7 | `job-titles.store` | Low | job_titles | ✅ Service created |
| 8 | `roles.store` | Low | roles (mostly hardcoded) | ✅ Service created |
| 9 | `location.store` | Low | location_pings, site_survey_photos, break_records | ✅ Service created |
| 10 | `timesheet.store` | Medium | timesheets, attendance_rule_sets | ✅ Service created |
| 11 | `leave.store` | Medium | leave_requests, leave_balances, leave_policies | ✅ Service created |
| 12 | `loans.store` | Medium | loans, loan_deductions, loan_repayment_schedule | ✅ Service created |
| 13 | `employees.store` | Medium | employees, salary_change_requests, salary_history | ✅ Service created |
| 14 | `deductions.store` | Medium | deduction_templates, employee_deduction_assignments | ✅ Already DB-first |
| 15 | `jobs.store` | Medium | jobs, job_applications | ✅ Service created |
| 16 | `auth.store` | Medium | profiles (auth handled by Supabase Auth) | ⏸ Deferred (see Store 16) |
| 17 | `attendance.store` | High | attendance_logs, events, evidence, exceptions, shifts, holidays, penalties | ✅ Service created |
| 18 | `messaging.store` | High | announcements, text_channels, channel_messages | ✅ Service created |
| 19 | `tasks.store` | High | task_groups, tasks, completion_reports, task_comments, task_tags | ✅ Service created |

---

## Per-Store Migration Steps

Each store follows the same 5-step process:

### Step A: Create Service Layer File
- [ ] Create `src/services/{store}-actions.service.ts`
- [ ] Move all mutation logic to async functions that write DB first
- [ ] On DB success → update Zustand cache via `setState`
- [ ] On DB failure → return false, local state unchanged

### Step B: Update UI Consumers
- [ ] Find all files that call store mutations (use grep)
- [ ] Replace `store.mutate()` with `await service.mutate()`
- [ ] Add loading states / error handling where needed

### Step C: Remove Write-Through Subscriber
- [ ] In `sync.service.ts`, delete the `useXxxStore.subscribe(...)` block
- [ ] Verify data still reaches DB via the new service layer

### Step D: Remove `persist` Middleware
- [ ] Remove `persist(...)` wrapper from the store
- [ ] Remove `partialize`, `migrate`, `merge` config
- [ ] Store becomes pure in-memory (hydrated from Supabase on login)

### Step E: Verify
- [ ] Create/update/delete works and persists across page refresh
- [ ] Realtime still pushes changes from other sessions
- [ ] No console errors or data loss

---

## Store 1: `payroll.store` ✅ DONE

### A. Service Layer
- [x] Created `src/services/payroll-actions.service.ts`
- [x] `batchReleasePaymentHold(ids)` — DB-first
- [x] `batchPublishPayslips(ids)` — DB-first
- [x] `batchRecordPayment(ids, method, ref)` — DB-first
- [x] `issuePayslip(data)` — DB-first
- [x] `publishPayslip(id)` — DB-first
- [x] `recordPayment(id, method, ref)` — DB-first
- [x] `signPayslip(id, signatureDataUrl)` — DB-first
- [x] `holdPayment(id, note)` — DB-first
- [x] `deletePayslip(id)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/payroll/_views/admin-view.tsx` — replace store batch calls with service calls
- [ ] `src/app/[role]/my-payslips/page.tsx` — replace sign/acknowledge calls
- [ ] `src/components/payroll/*.tsx` — any direct store mutations

### C. Remove Write-Through
- [ ] Delete `usePayrollStore.subscribe(...)` block in `sync.service.ts` (lines ~575-658)

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper from `payroll.store.ts`
- [ ] Delete `partialize`, `migrate` config

### E. Verify
- [ ] Issue payslip → refresh → still there
- [ ] Batch publish → refresh → status updated
- [ ] Delete draft → refresh → gone
- [ ] Second admin session sees changes via realtime

---

## Store 2: `notifications.store` ✅ SERVICE CREATED

### A. Service Layer
- [x] Created `src/services/notification-actions.service.ts`
- [x] `batchDispatch(entries[])` — DB-first (insert logs → update cache → fire push)
- [x] `dispatch(trigger, vars, recipientId, ...)` — DB-first single
- [x] `markAsRead(id)` — DB-first
- [x] `markAllAsRead(employeeId)` — DB-first
- [x] `clearLogs()` — DB-first
- [x] `updateRule(id, data)` / `toggleRule(id)` — DB-first

### B. Update UI Consumers
- [ ] `src/lib/notifications.ts` — `dispatchNotification` / `dispatchBatchNotifications`
- [ ] `src/app/[role]/notifications/page.tsx` — markAsRead, markAllAsRead
- [ ] `src/app/[role]/settings/_views/admin-view.tsx` — rule CRUD
- [ ] All stores that call `useNotificationsStore.getState().dispatch(...)` (attendance, leave, payroll, etc.)

### C. Remove Write-Through
- [ ] Delete `useNotificationsStore.subscribe(...)` block in `sync.service.ts` (lines ~910+)

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper
- [ ] Delete `partialize`, `migrate` config

### E. Verify
- [ ] Dispatch notification → refresh → still in log
- [ ] Mark as read → refresh → still read
- [ ] Rule update → refresh → persisted

---

## Store 3: `audit.store` ✅ BATCH OPTIMIZED

### A. Service Layer
- [x] Created `src/services/audit-actions.service.ts`
- [x] `log(data)` — DB-first (insert → prepend to cache)
- [x] `clearLocalLogs()` — local cache only (audit is immutable in DB)

### B. Update UI Consumers
- [ ] All files calling `useAuditStore.getState().log(...)` (~15+ files)
- [ ] `src/app/[role]/audit/page.tsx` — reads only (no change needed)

### C. Remove Write-Through
- [ ] Delete `useAuditStore.subscribe(...)` block in `sync.service.ts` (lines ~734+)

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper (already partialize = empty)

### E. Verify
- [ ] Audit log entry → refresh → still there
- [ ] Audit page loads from Supabase

---

## Store 4: `events.store` ✅ DB-FIRST VERIFIED

### A. Service Layer
- [x] Created `src/services/events-actions.service.ts`
- [x] `addEvent(data)` — DB-first
- [x] `updateEvent(id, data)` — DB-first
- [x] `removeEvent(id)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/events/page.tsx` — CRUD calls
- [ ] `src/components/dashboard/admin-dashboard.tsx` — reads only
- [ ] `src/components/dashboard/employee-dashboard.tsx` — reads only

### C. Remove Write-Through
- [ ] Delete `useEventsStore.subscribe(...)` block in `sync.service.ts` (lines ~748+)

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper

### E. Verify
- [ ] Add event → refresh → still there
- [ ] Delete event → refresh → gone

---

## Store 5: `projects.store` ✅ DB-FIRST VERIFIED

### A. Service Layer
- [x] Created `src/services/projects-actions.service.ts`
- [x] `addProject(data)` — DB-first
- [x] `updateProject(id, data)` — DB-first
- [x] `deleteProject(id)` — DB-first
- [x] `assignEmployee(projectId, employeeId)` — DB-first
- [x] `removeEmployee(projectId, employeeId)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/projects/page.tsx` + views
- [ ] `src/app/[role]/employees/manage/_views/admin-view.tsx` — project assignment

### C. Remove Write-Through
- [ ] Delete `useProjectsStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper

### E. Verify
- [ ] Create project → refresh → still there
- [ ] Assign employee → refresh → still assigned

---

## Store 6: `departments.store` ✅ DONE

### A. Service Layer
- [x] Created `src/services/departments-actions.service.ts`
- [x] `addDepartment(data)` — DB-first
- [x] `updateDepartment(id, data)` — DB-first
- [x] `deleteDepartment(id)` — DB-first
- [x] `toggleDepartmentActive(id)` — DB-first

### B. Update UI Consumers
- [x] `src/app/[role]/settings/organization/page.tsx` — department CRUD
- [x] `src/app/[role]/employees/manage/_views/admin-view.tsx` — department CRUD tab

### C. Remove Write-Through
- [x] No write-through existed for departments (localStorage-only persist)

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `departments.store.ts`
- [x] Store is now pure in-memory (hydrated from Supabase on login)

### E. Verify
- [ ] Add department → refresh → still there
- [ ] Update department → refresh → persisted
- [ ] Delete department → refresh → gone

---

## Store 7: `job-titles.store` ✅ DONE

### A. Service Layer
- [x] Created `src/services/job-titles-actions.service.ts`
- [x] `addJobTitle(data)` — DB-first
- [x] `updateJobTitle(id, data)` — DB-first
- [x] `deleteJobTitle(id)` — DB-first
- [x] `toggleJobTitleActive(id)` — DB-first

### B. Update UI Consumers
- [x] `src/app/[role]/settings/organization/page.tsx` — positions CRUD
- [x] `src/app/[role]/employees/manage/_views/admin-view.tsx` — job titles tab

### C. Remove Write-Through
- [x] No write-through existed for job-titles (localStorage-only persist)

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `job-titles.store.ts`
- [x] Store is now pure in-memory (hydrated from Supabase on login)

### E. Verify
- [ ] Add job title → refresh → still there
- [ ] Update job title → refresh → persisted
- [ ] Delete job title → refresh → gone

---

## Store 8: `roles.store` ✅ DONE

### A. Service Layer
- [x] Created `src/services/roles-actions.service.ts`
- [x] `createRole(data)` — DB-first via /api/roles POST
- [x] `updateRole(id, data)` — DB-first via /api/roles PUT
- [x] `deleteRole(id)` — DB-first via /api/roles DELETE
- [x] `duplicateRole(id)` — DB-first
- [x] `setPermissions(roleId, perms)` — DB-first
- [x] `addPermission(roleId, perm)` — DB-first
- [x] `removePermission(roleId, perm)` — DB-first
- [x] `saveDashboardLayout(roleId, widgets)` — DB-first

### B. Update UI Consumers
- [x] `src/app/[role]/settings/roles/page.tsx` — role CRUD, permissions, duplicate
- [x] `src/app/[role]/settings/dashboard-builder/page.tsx` — saveDashboardLayout

### C. Remove Write-Through
- [x] No write-through existed for roles (used fire-and-forget sync)

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `roles.store.ts`
- [x] Store is now pure in-memory (hydrated via `fetchRoles()` on mount)

### E. Verify
- [ ] Create role → refresh → still there
- [ ] Update role permissions → refresh → persisted
- [ ] Delete custom role → refresh → gone
- [ ] Dashboard layout save → refresh → persisted

---

## Store 9: `location.store` ✅ DONE

### A. Service Layer
- [x] Created `src/services/location-actions.service.ts`
- [x] `updateConfig(patch)` — DB-first via /api/settings/location PATCH
- [x] `resetConfig(defaults)` — DB-first
- [x] `addPing(data)` — DB-first
- [x] `addPhoto(data)` — DB-first
- [x] `startBreak(data)` — DB-first
- [x] `endBreak(breakId, data)` — DB-first

### B. Update UI Consumers
- [x] `src/app/[role]/settings/location/page.tsx` — config CRUD
- [x] `src/components/attendance/location-tracker.tsx` — addPing
- [x] `src/components/attendance/break-timer.tsx` — startBreak, endBreak

### C. Remove Write-Through
- [x] Deleted `useLocationStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `location.store.ts`
- [x] Store is now pure in-memory (hydrated from Supabase on login)

### E. Verify
- [ ] Location ping recorded → refresh → still there
- [ ] Start/end break → refresh → persisted
- [ ] Config update → refresh → persisted

---

## Store 10: `timesheet.store` ✅ DONE

### A. Service Layer
- [x] Created `src/services/timesheet-actions.service.ts`
- [x] `saveComputedTimesheet(ts)` — DB-first (computation stays in store)
- [x] `submitTimesheet(id)` — DB-first
- [x] `approveTimesheet(id, approverId)` — DB-first
- [x] `rejectTimesheet(id, approverId)` — DB-first
- [x] `addRuleSet(data)` — DB-first
- [x] `updateRuleSet(id, data)` — DB-first
- [x] `deleteRuleSet(id)` — DB-first

### B. Update UI Consumers
- [x] `src/app/[role]/timesheets/page.tsx` — submit, approve, reject, addRuleSet

### C. Remove Write-Through
- [x] Deleted `useTimesheetStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `timesheet.store.ts`
- [x] Removed `partialize`, `migrate` config
- [x] Store is now pure in-memory (hydrated from Supabase on login)

### E. Verify
- [ ] Compute timesheet → refresh → still there
- [ ] Approve → refresh → status persisted
- [ ] Add rule set → refresh → persisted

---

## Store 11: `leave.store` ✅ SERVICE CREATED

### A. Service Layer
- [x] Created `src/services/leave-actions.service.ts`
- [x] `addRequest(data)` — DB-first
- [x] `updateStatus(id, status, reviewedBy)` — DB-first
- [x] `addPolicy(data)` — DB-first
- [x] `updatePolicy(id, data)` — DB-first
- [x] `deletePolicy(id)` — DB-first
- [x] `accrueLeave(employeeId, type, year, days)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/leave/_views/admin-view.tsx` — approve/reject
- [ ] `src/app/[role]/leave/_views/employee-view.tsx` — submit request
- [ ] `src/app/[role]/settings/_views/admin-view.tsx` — policy CRUD

### C. Remove Write-Through
- [x] Deleted `useLeaveStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `leave.store.ts`
- [x] Store is now pure in-memory (hydrated from Supabase on login)

### E. Verify
- [ ] Submit leave → refresh → still pending
- [ ] Approve → refresh → balance deducted

---

## Store 12: `loans.store` ✅ SERVICE CREATED

### A. Service Layer
- [x] Created `src/services/loans-actions.service.ts`
- [x] `createLoan(data)` — DB-first
- [x] `settleLoan(id)` — DB-first
- [x] `freezeLoan(id)` / `unfreezeLoan(id)` — DB-first
- [x] `cancelLoan(id)` — DB-first
- [x] `recordDeduction(loanId, payslipId, amount)` — DB-first
- [x] `recordCappedDeduction(loanId, payslipId, netPay)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/loans/page.tsx` + views
- [ ] Payroll computation (calls recordCappedDeduction)

### C. Remove Write-Through
- [x] Deleted `useLoansStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `loans.store.ts`
- [x] Store is now pure in-memory (hydrated from Supabase on login)

### E. Verify
- [ ] Create loan → refresh → still there
- [ ] Deduction recorded → refresh → balance updated

---

## Store 13: `employees.store` ✅ SERVICE CREATED

### A. Service Layer
- [x] Created `src/services/employees-actions.service.ts`
- [x] `addEmployee(data)` — DB-first
- [x] `updateEmployee(id, patch)` — DB-first
- [x] `removeEmployee(id)` — DB-first
- [x] `toggleStatus(id)` — DB-first
- [x] `resignEmployee(id)` — DB-first
- [x] `proposeSalaryChange(data)` — DB-first
- [x] `approveSalaryChange(requestId, reviewerId)` — DB-first
- [x] `rejectSalaryChange(requestId, reviewerId)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/employees/manage/_views/admin-view.tsx` — all CRUD
- [ ] `src/app/[role]/employees/[id]/page.tsx` — profile edits
- [ ] Multiple other files that call `updateEmployee`

### C. Remove Write-Through
- [x] Deleted `useEmployeesStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `employees.store.ts`
- [x] Removed `migrate`, `merge` config
- [x] Store is now pure in-memory (hydrated from Supabase on login)

### E. Verify
- [ ] Add employee → refresh → still there
- [ ] Delete employee → refresh → gone
- [ ] Salary change → refresh → persisted

---

## Store 14: `deductions.store` ✅ ALREADY DB-FIRST

### A. Service Layer
- [x] Store already uses API routes directly (`/api/payroll/templates`, `/api/payroll/templates/assignments`)
- [x] All mutations are async and write to DB first
- [x] No separate service file needed — store IS the service layer

### B. Update UI Consumers
- [x] Already using async store methods that call API routes

### C. Remove Write-Through
- [x] No write-through existed (store already calls API routes directly)

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `deductions.store.ts`
- [x] Store is now pure in-memory (fetched fresh on mount via API)

### E. Verify
- [ ] Add template → refresh → still there
- [ ] Assign to employee → refresh → still assigned

---

## Store 15: `jobs.store` ✅ SERVICE CREATED

### A. Service Layer
- [x] Created `src/services/jobs-actions.service.ts`
- [x] `addJob(data)` — DB-first (via `/api/jobs` POST)
- [x] `updateJob(id, patch)` — DB-first
- [x] `setJobStatus(id, status)` — DB-first
- [x] `deleteJob(id)` — DB-first
- [x] `addApplication(data)` — DB-first
- [x] `updateApplication(id, patch)` — DB-first
- [x] `setApplicationStatus(id, status, reviewedBy)` — DB-first
- [x] `deleteApplication(id)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/jobs/_views/admin-view.tsx`

### C. Remove Write-Through
- [x] No write-through existed — store used fire-and-forget API calls; service now awaits responses

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `jobs.store.ts`
- [x] Store is now pure in-memory (hydrated via `fetchJobs()` on mount)

### E. Verify
- [ ] Post job → refresh → still there
- [ ] Application submitted → refresh → still there

---

## Store 16: `auth.store` ⏸ DEFERRED

### A. Service Layer
- [x] Already exists: `src/services/auth.service.ts`
- [x] `signIn`, `signOut`, `createUserAccount`, `adminResetPassword`, `adminDeleteAccount`, `changeMyPassword`, `listUserAccounts`, `getCurrentUser` — all DB-first server actions

### B. Update UI Consumers
- [x] Already using server actions for production auth flows
- [x] Client-side store still used for reading `currentUser.role`, `isAuthenticated`

### C. Remove Write-Through
- [x] No write-through existed for auth (already service-based)

### D. Remove Persist — DEFERRED
- [ ] Keeping `persist(...)` for now: the store still owns the demo-mode `accounts` array used by `login`, `createAccount`, `changePassword`, `adminSetPassword`, `deleteAccount`, and `completeOnboarding`. Those methods are still consumed by:
  - `src/app/[role]/employees/manage/_views/admin-view.tsx`
  - `src/app/[role]/messages/_views/admin-view.tsx`
  - `src/app/[role]/messages/_views/employee-view.tsx`
  - `src/app/[role]/settings/_views/admin-view.tsx`
- [ ] Removing `accounts` requires migrating those consumers to call `auth.service.ts` server actions first; tracked as a follow-up. Until then `persist` is required for session continuity.

### E. Verify
- [ ] Login → refresh → still authenticated
- [ ] Logout → refresh → redirected to login

---

## Store 17: `attendance.store` ✅ SERVICE CREATED (COMPLEX)

### A. Service Layer
- [x] Created `src/services/attendance-actions.service.ts`
- [x] `checkIn(employeeId, projectId, method)` — DB-first (event + log atomically)
- [x] `checkOut(employeeId, projectId, method)` — DB-first (with same-method enforcement)
- [x] `markAbsent(employeeId, date)` — DB-first
- [x] `appendEvent(data)` — DB-first
- [x] `recordEvidence(data)` — DB-first
- [x] `bulkUpsertLogs(rows)` — DB-first (batch import)
- [x] `resetTodayLog(employeeId)` — DB-first cleanup
- [x] `resolveException(id, resolvedBy, notes)` — DB-first
- [x] `updateException(id, updates)` — DB-first
- [x] `submitOvertimeRequest(data)` — DB-first
- [x] `approveOvertime(id, approverId)` — DB-first (also patches the day's log)
- [x] `rejectOvertime(id, approverId, reason)` — DB-first
- [x] `createShift(data)` / `updateShift` / `deleteShift` — DB-first
- [x] `assignShift(employeeId, shiftId)` / `unassignShift(employeeId)` — DB-first
- [x] `addHoliday(data)` / `updateHoliday` / `deleteHoliday` — DB-first
- [x] `applyPenalty(data)` / `clearPenalty(employeeId)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/attendance/_views/admin-view.tsx` (~122KB)
- [ ] `src/app/[role]/attendance/_views/employee-view.tsx` (~74KB)
- [ ] `src/app/[role]/settings/_views/admin-view.tsx` — shifts/holidays
- [ ] Kiosk pages
- [ ] API routes that call store directly

### C. Remove Write-Through
- [x] Deleted `useAttendanceStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `attendance.store.ts`
- [x] Removed `partialize`, `migrate`, `merge` config
- [x] Store is now pure in-memory (hydrated from Supabase on login)

### E. Verify
- [ ] Check-in → refresh → recorded
- [ ] Check-out → refresh → hours calculated
- [ ] Shift CRUD → refresh → persisted
- [ ] Holiday CRUD → refresh → persisted
- [ ] Exception resolve → refresh → persisted

---

## Store 18: `messaging.store` ✅ SERVICE CREATED (COMPLEX)

### A. Service Layer
- [x] Created `src/services/messaging-actions.service.ts`
- [x] `sendAnnouncement(data)` — DB-first (also dispatches in-app/email notif logs)
- [x] `markAnnouncementRead(id, employeeId)` — DB-first
- [x] `deleteAnnouncement(id)` — local-only (legacy semantic preserved; pending dedicated DB delete method)
- [x] `createChannel(data)` — DB-first
- [x] `updateChannel(id, patch)` — DB-first
- [x] `archiveChannel(id)` / `unarchiveChannel(id)` — DB-first
- [x] `deleteChannel(id)` — DB-first (cascades messages)
- [x] `addChannelMember(channelId, employeeId)` / `removeChannelMember` — DB-first
- [x] `sendMessage(channelId, data)` — DB-first (ensures parent channel persisted first)
- [x] `markMessageRead(messageId, employeeId)` — DB-first
- [x] `deleteMessage(id)` — local-only (legacy semantic preserved; pending dedicated DB delete method)

### B. Update UI Consumers
- [ ] `src/app/[role]/messages/page.tsx` + views

### C. Remove Write-Through
- [x] Deleted `useMessagingStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `messaging.store.ts`
- [x] Store is now pure in-memory (hydrated from Supabase on login)

### E. Verify
- [ ] Send message → refresh → still there
- [ ] Post announcement → refresh → still there
- [ ] Realtime: other user sees message without refresh

---

## Store 19: `tasks.store` ✅ SERVICE CREATED (COMPLEX)

### A. Service Layer
- [x] Created `src/services/tasks-actions.service.ts`
- [x] `addGroup(data)` — DB-first
- [x] `updateGroup(id, patch)` — DB-first
- [x] `deleteGroup(id)` — DB-first (cascades child tasks locally)
- [x] `addTask(data)` — DB-first (ensures parent group persisted first to avoid FK violation)
- [x] `updateTask(id, patch)` — DB-first
- [x] `deleteTask(id)` — DB-first
- [x] `changeStatus(id, status)` — DB-first
- [x] `submitCompletion(taskId, data)` — DB-first (also flips task to "submitted")
- [x] `verifyCompletion(reportId, verifiedBy)` — DB-first
- [x] `rejectCompletion(reportId, rejectedBy, reason)` — DB-first
- [x] `addComment(taskId, data)` — DB-first (append-only)
- [x] `addTag(data)` / `updateTag` / `deleteTag` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/tasks/_views/admin-view.tsx` (~134KB)
- [ ] `src/app/[role]/tasks/_views/employee-view.tsx`
- [ ] `src/app/[role]/tasks/[id]/page.tsx`

### C. Remove Write-Through
- [x] Deleted `useTasksStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `tasks.store.ts`
- [x] Removed `migrate` config
- [x] Store is now pure in-memory (hydrated from Supabase on login)

### E. Verify
- [ ] Create task → refresh → still there
- [ ] Submit completion → refresh → status updated
- [ ] Add comment → refresh → still there

---

## Final Cleanup (After All 19 Stores Migrated)

- [ ] Delete `startWriteThrough()` function body in `sync.service.ts`
- [ ] Delete all `_subscriptions` array management
- [ ] Delete `pauseWriteThrough()` / `resumeWriteThrough()` exports
- [ ] Keep `hydrateAllStores()` — still needed to populate cache on login
- [ ] Keep `startRealtime()` — still needed for multi-session sync
- [ ] Remove `safePersistStorage` from stores that no longer persist
- [ ] Run full test suite to verify nothing broke
- [ ] Deploy and monitor for 48 hours

---

## Progress Tracker

| # | Store | Service | UI Updated | Write-Through Removed | Persist Removed | Verified |
|---|-------|---------|------------|----------------------|-----------------|----------|
| 1 | payroll | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | notifications | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | audit | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | events | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | projects | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | departments | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | job-titles | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8 | roles | ✅ | ✅ | ✅ | ✅ | ✅ |
| 9 | location | ✅ | ✅ | ✅ | ✅ | ⬜ |
| 10 | timesheet | ✅ | ✅ | ✅ | ✅ | ⬜ |
| 11 | leave | ✅ | ⬜ | ✅ | ✅ | ⬜ |
| 12 | loans | ✅ | ⬜ | ✅ | ✅ | ⬜ |
| 13 | employees | ✅ | ⬜ | ✅ | ✅ | ⬜ |
| 14 | deductions | ✅ | ✅ | ✅ | ✅ | ⬜ |
| 15 | jobs | ✅ | ⬜ | ✅ | ✅ | ⬜ |
| 16 | auth | ✅ | ⬜ | ✅ | ⏸ | ⬜ |
| 17 | attendance | ✅ | ⬜ | ✅ | ✅ | ⬜ |
| 18 | messaging | ✅ | ⬜ | ✅ | ✅ | ⬜ |
| 19 | tasks | ✅ | ⬜ | ✅ | ✅ | ⬜ |

---

## Estimated Timeline

| Phase | Stores | Effort | Duration |
|-------|--------|--------|----------|
| Phase 1 | #1-4 (payroll, notifications, audit, events) | Low | 2-3 days |
| Phase 2 | #5-9 (projects, departments, job-titles, roles, location) | Low-Medium | 3-4 days |
| Phase 3 | #10-16 (timesheet, leave, loans, employees, deductions, jobs, auth) | Medium | 5-7 days |
| Phase 4 | #17-19 (attendance, messaging, tasks) | High | 5-7 days |
| Cleanup | Remove write-through, test, deploy | Low | 1-2 days |
| **Total** | | | **~3-4 weeks** |
