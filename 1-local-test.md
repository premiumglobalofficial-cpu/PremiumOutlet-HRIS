---
description:
globs:
alwaysApply: false
---

You are a world-class software engineer with decades of experience. You are given a task that is related to the current project. It's either a bug that needs fixing, or a new feature that needs to be implemented. Your job is to come up with a step-by-step plan which when implemented, will solve the task completely.

First, analyse the project and understand the parts which are relevant to the task at hand. Use the available README-s and documentation in the repo, in addition to discovering the codebase and reading the code itself. Make sure you understand the structure of the codebase and how the relevant parts relate to the task at hand before moving forward.

Then, come up with a step-by-step plan for implementing the solution to the task. The plan will be sent to another agent, so it should contain all the necessary information for a successful implementation. Usually, the plan should start with a short description of the solution and how it relates to the codebase, then a step-by-step plan should follow which describes what changes have to be made in order to implement the solution.

Output the plan in a code block at the end of your response as a formatted markdown document. Do not implement any changes. Another agent will take over from there.

This is the task that needs to be solved:

# Pre-task

- Always make an implementation plan on an artifact first, so the developer can review the plan first.

# Main Task

## Phase 1 - Payroll Run

- Make all the tables in the payroll run menu max 10 rows then activate a pagination.
- Add a re-issue all batch action button on the Record Payment stage when the cycle ended and on the on-hold modal too when the payroll run is completed.
- When the pulblish all batch actionis clicked, instead of spamming notification on on each employee, just put on notification the number of employee published.

## Implementation Plan

```markdown
# Payroll Run Updates (Plan)

## Summary

- Reduce all payroll-run tables to 10 rows per page and keep pagination visible.
- Add batch re-issue actions for on-hold payslips when a cycle is ended/completed.
- Replace per-employee publish notifications in batch publish with a single summary notification.

## Files to Review

- src/app/[role]/payroll/\_views/admin-view.tsx
- src/components/payroll/payslip-table.tsx
- src/lib/notifications.ts (notification behavior)
- src/types/index.ts and src/store/notifications.store.ts (only if adding a new notification trigger)

## Steps

1. Set page size to 10 for payroll run UI tables.
   - In admin payroll view, change the shared `pageSize` (used by payslip list, publish list, sign list, payroll runs table, and on-hold modal) from 50 to 10.
   - In PayslipTable (Record Payment stage), change its local `pageSize` from 50 to 10 so the Record Payment table also caps at 10 rows.
   - Confirm existing pagination blocks still render when total pages > 1.

2. Add batch re-issue action on the Record Payment step when the cycle is ended.
   - Identify the active run status (e.g., `activeRun?.status === "ended"`).
   - Compute eligible on-hold payslips for that run (`status === "payment_hold"` and `payrollBatchId` matches the run).
   - Add a “Re-Issue All On-Hold” button near the Record Payment header or above the PayslipTable.
   - Show a confirmation dialog listing the count, then call `releasePaymentHold` per payslip, log audit entries, and re-send `payslip_published` notifications (matching single re-issue behavior).
   - Show a toast summary like “Re-issued N on-hold payslips.”

3. Add batch re-issue action in the On-Hold modal for completed runs.
   - In the On-Hold modal, compute on-hold payslips that belong to runs with `status === "completed"`.
   - Show a “Re-Issue All (Completed Runs)” button only when eligible items exist.
   - Use the same release + audit + notification flow as the single re-issue action.

4. Change batch publish notifications to a single summary.
   - In `handleBatchPublish`, remove per-employee `dispatchNotification("payslip_published", ...)` calls.
   - Replace with a single summary notification (e.g., toast saying “Published X payslips”).
   - If an in-app notification is required, add a new notification trigger (e.g., `payroll_batch_published`) in types and notification rules, then dispatch it once to the current user or admin roles.

## Validation Checklist

- All payroll-run tables show a maximum of 10 rows and paginate correctly.
- Record Payment step shows batch re-issue only when the active run is ended.
- On-Hold modal shows batch re-issue only for completed runs’ holds.
- Batch publish produces a single summary notification and no per-employee spam.
```
