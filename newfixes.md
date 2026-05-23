# NexHRMS — Payroll Adjustments & Corrected Operational Flow (PH-Compliant)

This document upgrades the current NexHRMS MVP to align with Philippine payroll controls, internal finance governance, and audit defensibility.

It introduces:

- Proper **post-lock adjustment workflow**
- Removal of unsafe payroll “unlock”
- Salary change approval controls
- Payment lifecycle separation from signature
- Versioned statutory snapshots
- Corrected end-to-end payroll and attendance flow

---

# 1️⃣ Critical Policy Changes

## ❌ Removed
- Payroll Run “Unlock”

## ✅ Replaced With
- **Adjustment Workflow**
- **Off-cycle Payroll Run (Adjustment Type)**
- **Immutable Locked Runs**

---

# 2️⃣ Payroll Run Lifecycle (Corrected Version)

## Payroll Run States

| Status | Meaning |
|--------|---------|
| draft | Payslips being generated |
| validated | All checks passed |
| locked | No modification allowed |
| published | Payslips visible to employees |
| paid | Payment recorded |

---

## Corrected Payroll Flow

### Step 1 — Attendance Lock
Supervisor approves timesheets
HR locks attendance period
Attendance becomes read-only


### Step 2 — Payroll Build
Finance → /payroll → Create Payroll Run
System pulls:

Locked timesheets

Approved leave

Active compensation

Active loan schedules

Current statutory table versions


### Step 3 — Compute
System calculates:
- Basic pay
- Overtime
- Holiday pay
- Allowances
- Loan deductions
- SSS (versioned)
- PhilHealth (versioned)
- Pag-IBIG (versioned)
- Withholding Tax (TRAIN table versioned)

### Step 4 — Validate
System checks:
- Net pay > 0
- Loan deduction cap respected
- Missing approvals
- Extreme variances
- Negative YTD anomalies

### Step 5 — Lock
Finance → Lock Payroll Run


When locked:
- Policy snapshot saved:
  - tax_table_version
  - sss_version
  - philhealth_version
  - pagibig_version
  - formula_version
- No editing allowed
- No deletion allowed
- No recalculation allowed

### Step 6 — Publish
Payslips visible to employees
Notification triggered


### Step 7 — Record Payment
Finance records:
- paid_at
- payment_method
- bank_reference_id
- payroll_batch_id

Payslip status becomes `paid`.

---

# 3️⃣ Payroll Adjustment System (Post-Lock)

## When Is Adjustment Used?

- Late overtime approval
- Salary correction
- Loan correction
- Tax correction
- Retroactive allowance
- Final pay correction

---

## Adjustment Types

| Type | Behavior |
|------|----------|
| Earnings Adjustment | Adds to gross |
| Deduction Adjustment | Adds to deductions |
| Net Correction | Direct net modification |
| Statutory Correction | Adjust SSS/Tax difference |

---

## Adjustment Data Model

payroll_adjustments
id
payroll_run_id (reference)
employee_id
adjustment_type
reference_payslip_id
before_values_json
after_values_json
reason
created_by
approved_by
created_at
applied_run_id (future run)
status (pending/approved/applied)


---

## Adjustment Workflow

### Option A — Applied to Next Payroll
Finance creates adjustment
Admin approves adjustment
System attaches adjustment to next payroll run
Appears as line item:
"Payroll Adjustment - Prior Period"


### Option B — Off-Cycle Payroll Run
Finance → Create Off-Cycle Run
Type: Adjustment
Includes only affected employees
Lock → Publish → Pay


---

## Important Rule

> Locked payroll runs are NEVER modified.
> Adjustments create new financial records.

This preserves audit defensibility.

---

# 4️⃣ Salary Change Governance (Corrected)

## New Flow

HR cannot directly overwrite salary.

### Step 1 — HR Proposes
HR → /employees/directory → Propose Salary Change


Stored as:
salary_change_requests
employee_id
old_salary
proposed_salary
effective_date
reason
proposed_by
status (pending)


### Step 2 — Finance Approves
Finance reviews and approves.

Upon approval:
- salary_history record created
- new salary becomes active
- old salary archived

---

## Salary History Model

salary_history
employee_id
annual_salary
effective_from
effective_to
approved_by
approval_reason


This supports:
- Pro-rating
- Audit trail
- Final pay accuracy

---

# 5️⃣ Payment Lifecycle (Separated from Signature)

## Payslip Status Model

| Status | Meaning |
|--------|---------|
| issued | Generated but not confirmed |
| confirmed | Finance validated |
| published | Visible to employee |
| paid | Payment recorded |
| acknowledged | Employee signed |

---

## Why Separate?

Employee signature:
- Confirms payslip receipt
- Does NOT confirm payment occurred

Payment record:
- Is financial proof
- Includes bank reference ID

---

# 6️⃣ Government Table Versioning

Replace flat percentages with versioned tables:

sss_versions
philhealth_versions
pagibig_versions
withholding_tax_versions


Each record:
version_id
effective_from
effective_to
rates_json
created_at


Payroll run stores:

policy_snapshot_json
{
sss_version: "2026-v1",
philhealth_version: "2026-v2",
pagibig_version: "2025-v1",
tax_version: "TRAIN-2026"
}


This ensures historical reproducibility.

---

# 7️⃣ Attendance Control Fixes

## Kiosk Hardening

Replace open kiosk with:

- Device registration required
- Device ID stored per log
- Optional employee PIN
- Supervisor override PIN
- QR token validation

---

## Attendance Exception Flags

Add:

- missing_in
- missing_out
- out_of_geofence
- duplicate_scan
- device_mismatch
- overtime_without_approval

These appear in Admin attendance view.

---

# 8️⃣ Leave Engine Upgrade (Minimum PH Standard)

Add:

- leave_balance tracking
- monthly accrual
- carry-forward toggle
- negative leave toggle
- attachment requirement toggle
- leave expiry rule

---

# 9️⃣ Final Pay Flow (Separation Handling)

When employee status changes to resigned:

### Step 1
HR sets:
- last_working_day

### Step 2
Finance triggers:
Create Final Pay Run


Includes:
- Pro-rated salary
- Unpaid OT
- Leave conversion (if policy allows)
- Loan balance handling

Final pay uses same lock + adjustment rules.

---

# 🔟 Corrected End-to-End Payroll Flow (Enterprise Version)

Attendance Period Ends
→ Supervisor approves timesheets
→ HR locks attendance

Finance creates payroll run
→ Compute
→ Validate
→ Lock
→ Publish

Finance records payment
→ Payslips marked PAID

Employee signs payslip
→ Status becomes ACKNOWLEDGED

If correction needed
→ Create payroll adjustment
→ Apply next run or off-cycle


---

# 1️⃣1️⃣ Control Separation Matrix (Finance Governance)

| Action | HR | Finance | Admin |
|--------|----|---------|-------|
| Edit salary | Propose | Approve | Approve |
| Run payroll | ❌ | ✅ | ✅ |
| Lock payroll | ❌ | ✅ | Optional 2nd approval |
| Create adjustment | ❌ | ✅ | Approve |
| Modify rule packs | ❌ | ❌ | ✅ |
| Approve leave | ✅ | ❌ | ✅ |

---

# 1️⃣2️⃣ Enterprise Safeguards Summary

- Immutable attendance logs
- No payroll unlock
- Adjustment-only corrections
- Salary approval workflow
- Versioned statutory tables
- Payroll snapshotting
- Payment record separation
- Audit logging for all changes

---

# Final Position

With these modifications:

- Finance controls are defensible
- HR governance is structured
- PH compliance is version-safe
- Audit reproducibility is preserved
- Separation of duties is enforced

This transforms NexHRMS from demo-grade to operationally credible architecture.