# 🇵🇭 NexHRMS – Enterprise Payroll & Attendance Architecture Blueprint (Philippines Version)

> Production-grade, multi-tenant HRMS architecture designed for Philippine compliance, labor dispute defensibility, and enterprise trust.

---

# 1️⃣ Product Scope & Non-Negotiable Principles

## Core Principles (Never Break These)

1. **Raw attendance logs are immutable (append-only).**
2. **Timesheets are computed from logs + rules (recomputable anytime).**
3. **Payroll runs are lockable and never edited.** Corrections happen only via adjustments.
4. Every modification must record:
   - Who changed it  
   - Reason  
   - When  
   - Before/after values  
5. **Verification evidence is stored per clock event** (QR, GPS, Wi-Fi, selfie, face match, device integrity).

These principles establish enterprise trust and legal defensibility.

---

# 2️⃣ Users, Roles & RBAC Design

## Default Roles

- Company Owner / Super Admin
- HR Admin
- Payroll Admin
- Supervisor / Manager
- Project Manager
- Site Supervisor
- Employee
- Auditor (Read-only)

## Permission Groups

- Employee management  
- Attendance rule configuration  
- Attendance adjustments  
- Leave policies & approvals  
- Payroll configuration  
- Payroll run creation & locking  
- Payslip publishing  
- Loans / cash advance approval  
- Reports & exports  
- Device & verification settings  
- Audit log access  

> Rule: Payroll Admin can run payroll but **cannot modify role permissions**.

---

# 3️⃣ Core Data Model (Full Schema Blueprint)

## A) Tenant & Organization

- companies  
- company_settings (timezone, currency, toggles)  
- branches  
- departments  
- positions  
- cost_centers  
- work_sites  
- holidays  
- users  
- roles  
- permissions  
- user_roles  
- employee_profiles  
- employee_documents  
- employee_status_history  

---

## B) Projects & Location Assignment

- projects  
- project_locations (geofence polygon/radius, Wi-Fi rules)  
- employee_project_assignments  
  - employee_id  
  - project_id  
  - location_id  
  - date_from/date_to  
  - shift_id  
  - assignment_type  
  - attendance_mode_override  

---

## C) Shifts & Rules

- shift_templates  
- shift_schedules  
- attendance_rule_sets  
  - grace periods  
  - rounding rules  
  - break policies  
  - overtime rules  
  - minimum hours  
- rule_set_assignments  

---

## D) Attendance (Immutable Logs + Evidence)

### attendance_events (Append-Only)

- event_type (IN, OUT, BREAK_START, BREAK_END)  
- source  
- timestamp_utc  
- local_time  
- employee_id  
- project/location reference  
- device_id  

### attendance_evidence

- gps_lat / gps_lng  
- gps_accuracy_m  
- gps_timestamp  
- geofence_pass  
- wifi_ssid / bssid  
- qr_token_id  
- selfie_image_id  
- face_match_score  
- liveness_result  
- device_integrity_result  
- mock_location_detected  

### attendance_exceptions

- missing_in  
- missing_out  
- out_of_geofence  
- wrong_project  

---

## E) Computed Timesheets

- timesheets (per employee per day)  
  - first_in  
  - last_out  
  - total_hours  
  - regular_hours  
  - overtime_hours  
  - night_diff_hours  
  - late_minutes  
  - undertime_minutes  
  - status  

- timesheet_segments  
- timesheet_adjustments  
- overtime_requests  
- overtime_approvals  

---

## F) Leave Management

- leave_types  
- leave_policies  
- leave_balances  
- leave_requests  

Supports:
- Full-day
- Half-day
- Hourly leave
- Multi-day

---

# 4️⃣ Payroll Engine (Philippines Hard Implementation)

## Pay Structure

- pay_groups (semi-monthly default)
- payroll_periods (1–15, 16–EOM)
- employee_compensation
- earning_types
- deduction_types
- payroll_runs
- payroll_run_items
- payroll_item_lines
- payroll_adjustments
- payslips
- payslip_acknowledgements

---

## 🇵🇭 Mandatory Government Deductions

- **SSS**
- **PhilHealth**
- **Pag-IBIG**
- **Withholding Tax**

Requirements:
- Versioned yearly tables
- Effective-date based
- Snapshotted per payroll run

---

## 13th Month Pay Logic

- Accrued monthly
- Based on basic salary only
- Auto-calculation
- December auto-trigger or manual release

---

## Holiday Rules (PH Multipliers)

- Regular Holiday
- Special Non-Working Holiday
- Holiday + Rest Day combinations

All based on DOLE multipliers.

---

# 5️⃣ Payroll Run Lifecycle

1. Attendance lock  
2. Build payroll run  
3. Compute earnings  
4. Compute deductions  
5. Validation  
6. Lock run  
7. Publish payslips  
8. Export bank file  

## Policy Snapshot (Critical)

Store `policy_snapshot_json` containing:
- Rule set version
- Tax table version
- Holiday list version
- Rates used

Ensures reproducibility and audit safety.

---

# 6️⃣ Attendance Verification Engine

## Baseline Mode (Required)

1. Dynamic QR (expires 30s, single-use)
2. Geofence validation
   - Default radius: 100m
   - Accuracy ≤ 30m
   - Fresh timestamp validation
3. Device binding (1 device per employee)

Stored Evidence:
- GPS coordinates
- Accuracy
- QR token ID
- Device ID
- Timestamp
- Pass/fail result

---

## Anti-Cheat Controls

- Location freshness threshold
- Mock location detection
- Root/jailbreak detection
- Integrity validation
- Device change approval
- Single-use QR tokens

---

# 7️⃣ Payslips with Drawn Signature

## Flow

1. Employee opens payslip
2. PDF preview displayed
3. Signature pad enabled
4. Signature saved (PNG)
5. Store:
   - signed_at
   - IP address
   - device
   - signature image
   - pdf_hash

PDF must embed:
- Employee signature
- Company stamp
- Timestamp
- Verification hash

No edits allowed after signing.

---

# 8️⃣ Loans / Cash Advance Module

## Configuration

Company-level settings:
- Max deduction % of net pay (default 30%)
- Deduction priority
- Allow override toggle

Per loan:
- Fixed amount per cutoff OR
- Fixed number of installments
- Interest optional
- Early settlement allowed
- Freeze repayment allowed

System safeguards:
- Prevent deduction exceeding configured %
- Carry forward if net pay insufficient
- Log every deduction event

---

# 9️⃣ Required PH Reports

## Attendance

- Late report
- Absence report
- Project manpower report

## Payroll

- Payroll register
- SSS summary
- PhilHealth summary
- Pag-IBIG summary
- Withholding tax summary
- Loan balances
- 13th month accrual report

---

# 🔟 System Layers (Production Architecture)

## Frontend

- Admin Web
- Payroll Web
- Employee Mobile App
- Kiosk QR Display

## Backend

- Multi-tenant API
- Payroll computation engine
- Rule engine
- Evidence validation engine
- PDF generation service
- Notification service
- Queue workers

## Database

- PostgreSQL (relational integrity)
- Object storage:
  - Payslip PDFs
  - Signatures
  - Selfies
  - Attachments

---

# 🔐 Security & Compliance

- Encrypted in transit & at rest
- Strict RBAC (least privilege)
- Immutable audit logs
- Biometric template storage (not raw images)
- Explicit biometric consent tracking
- Data retention policies
- Two-person payroll lock option

---

# 🚨 Critical Safeguards Checklist

- Payroll locking mechanism
- Immutable attendance logs
- Full audit trail
- Payroll policy snapshot per run
- Attendance evidence storage
- Role separation enforcement

---

# ⚠️ Operational Advisory

Drawn signature improves compliance perception but increases friction.

Best practices:
- Require signature once per payslip
- Ensure fast signature UI
- No re-signing after submission

---

# Final Positioning

This architecture is:

- Enterprise-grade  
- Legally defensible  
- PH-compliant  
- Multi-tenant scalable  
- Audit-safe  
- Rule-pack extensible  

This is not a basic HR tool — this is a production-ready payroll infrastructure framework for serious Philippine businesses.
