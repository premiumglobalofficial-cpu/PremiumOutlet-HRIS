# NexHRMS — MVP Compliance Upgrade Addendum
**Version:** MVP v2 (PH-Compliant Demo Architecture)  
**Scope:** Align current MVP (Next.js + Zustand + localStorage) with enterprise payroll requirements while preserving demo simplicity.

> This document upgrades the current NexHRMS System Overview to comply with non-negotiable payroll and attendance principles, while remaining compatible with the localStorage-based MVP sample.

---

# 1️⃣ Core Compliance Guarantees (Applied to MVP)

Even in demo mode (browser storage), the following logical controls are enforced:

1. Attendance logs are append-only (no editing events).
2. Timesheets are computed from logs + rule sets.
3. Payroll runs are lock-only (no unlock).
4. All changes require actor + timestamp + reason + before/after snapshot.
5. Verification evidence is stored per attendance event.
6. Corrections are done via adjustments — never by editing locked records.

---

# 2️⃣ Attendance Engine Upgrade (MVP-Compatible)

## A) Append-Only Event Ledger

New logical store collections:

attendance_events[]
attendance_evidence[]
attendance_exceptions[]


### attendance_events
- id
- employeeId
- eventType (IN / OUT / BREAK_START / BREAK_END)
- timestampUTC
- projectId
- deviceId
- createdAt

⚠️ Editing or deleting is disabled in UI.
Manual corrections generate a new `attendance_adjustment` entry instead.

---

### attendance_evidence (Per Event)
- eventId
- gpsLat
- gpsLng
- gpsAccuracyMeters
- geofencePass (boolean)
- qrTokenId (if kiosk mode)
- deviceIntegrityResult (basic mock check)
- faceVerified (boolean)
- mockLocationDetected (boolean)

---

### attendance_exceptions
Auto-generated flags:
- missing_in
- missing_out
- out_of_geofence
- duplicate_scan
- device_mismatch
- overtime_without_approval

Admin view shows exceptions but does not modify original logs.

---

# 3️⃣ Timesheet Computation Layer

Timesheets are not directly stored as user-edited records.

New logical collections:

timesheets[]
timesheet_segments[]
attendance_rule_sets[]


## Rule Sets (MVP Simplified)

Each rule set contains:
- standardHoursPerDay
- graceMinutes
- roundingPolicy
- overtimeRequiresApproval (boolean)
- nightDiffWindow (optional)
- holidayMultiplier (configurable)

Timesheets are computed:
attendance_events + rule_set + shift_schedule
→ timesheet (read-only until approved)


Supervisor approval required before payroll pulls hours.

---

# 4️⃣ Payroll Lock-Only System

## Removed
❌ Unlock Payroll Run

## Added
payroll_adjustments[]


---

## Payroll Run States (Updated)

| Status | Meaning |
|--------|---------|
| draft | Being computed |
| validated | Passed checks |
| locked | Immutable |
| published | Visible to employee |
| paid | Payment recorded |

Once locked:
- Payslips cannot be edited
- Government table versions are snapshotted
- Formula version is snapshotted

---

# 5️⃣ Adjustment Workflow (Post-Lock)

## Use Cases
- Late overtime
- Salary correction
- Loan correction
- Retroactive allowance

---

## Adjustment Model

payroll_adjustments[]
id
employeeId
referenceRunId
type (earning/deduction)
amount
reason
createdBy
approvedBy
createdAt
appliedRunId
status


Adjustments apply:
- To next payroll run OR
- Through off-cycle run (Adjustment Type)

Locked runs remain untouched.

---

# 6️⃣ Salary Governance Upgrade

HR cannot directly change salary.

## New Flow

### Step 1 — Propose
salary_change_requests[]


Fields:
- employeeId
- oldSalary
- proposedSalary
- effectiveDate
- reason
- proposedBy
- status

### Step 2 — Finance Approval
On approval:
salary_history[]


Stored:
- annualSalary
- effectiveFrom
- effectiveTo
- approvedBy

Payroll always reads from active salary_history record.

---

# 7️⃣ Government Table Versioning (MVP-Compatible)

Add version objects:

sss_versions[]
philhealth_versions[]
pagibig_versions[]
tax_versions[]


Payroll run stores:

policy_snapshot_json = {
sssVersion,
philhealthVersion,
pagibigVersion,
taxVersion,
ruleSetVersion,
formulaVersion
}


Even in localStorage, snapshot ensures reproducibility.

---

# 8️⃣ Payment Lifecycle Separation

Payslip statuses:

| Status | Description |
|--------|------------|
| issued | Generated |
| confirmed | Finance validated |
| published | Visible |
| paid | Payment recorded |
| acknowledged | Employee signed |

New fields:
- paidAt
- paymentMethod
- paymentReference
- payrollBatchId
- pdfHash
- signaturePayload
- ackTextVersion

Employee signature confirms receipt, not payment execution.

---

# 9️⃣ Leave Engine Upgrade (Minimal PH Standard)

New stores:

leave_policies[]
leave_balances[]


Policy includes:
- accrualFrequency (monthly/annual)
- carryForwardAllowed
- maxBalance
- expiryRule
- negativeLeaveAllowed
- attachmentRequired

Attendance conflict detection:
If employee clocks in on approved leave day:
→ exception flag generated.

---

# 🔟 Expanded Role Matrix

| Role | New Capabilities |
|------|------------------|
| Payroll Admin | Run payroll but cannot edit role permissions |
| Supervisor | Approve timesheets & overtime |
| Auditor | Read-only access to audit logs and reports |

---

# 1️⃣1️⃣ Audit Logging (MVP Logical Layer)

New store:

audit_logs[]


Each entry contains:
- entityType
- entityId
- action
- performedBy
- timestamp
- reason
- beforeSnapshot
- afterSnapshot

Tracked actions:
- Salary proposals
- Salary approvals
- Leave approvals/rejections
- Overtime approvals/rejections
- Payroll run lock
- Adjustment creation
- Loan freeze/unfreeze
- Payment recording

---

# 1️⃣2️⃣ Kiosk Hardening (Demo-Safe Version)

Kiosk enhancements:
- Device registration ID stored
- Rotating QR token (mock expiration logic)
- Optional employee PIN
- Supervisor override PIN

Evidence recorded per scan.

---

# 1️⃣3️⃣ Loan Engine Upgrade

Add:

loan_repayment_schedule[]
loan_balance_history[]


New Controls:
- Deduction cap % of net pay (default 30%)
- Carry-forward if insufficient net pay
- Freeze repayment toggle
- Auto-settle when balance = 0

---

# 1️⃣4️⃣ Final Pay Flow

When employee status becomes "resigned":

Create Final Pay Run


Includes:
- Pro-rated salary
- Unpaid OT
- Leave payout (if enabled)
- Remaining loan handling

Final pay follows:
Compute → Validate → Lock → Publish → Paid

---

# 1️⃣5️⃣ MVP Storage Disclaimer

Current implementation uses:
Zustand + localStorage (demo only).

Controls are logically enforced in UI and store,
but enterprise-grade immutability requires server-backed storage (PostgreSQL).

This structure ensures:
Future migration will require minimal schema redesign.

---

# ✅ Compliance Alignment Summary

With these modifications:

- Attendance logs are append-only
- Evidence stored per clock event
- Timesheets computed from rules
- Payroll runs lock-only
- Adjustments replace editing
- Salary changes require approval
- Government tables versioned
- Audit trail enforced
- Role separation strengthened
- Loan deductions capped
- Final pay supported

NexHRMS now aligns with PH payroll governance standards
while remaining fully compatible with the current MVP sample architecture.