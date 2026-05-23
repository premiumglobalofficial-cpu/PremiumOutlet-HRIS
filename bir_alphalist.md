# NexHRMS — BIR Compliance Engine Implementation Plan
**Tailored to the current NexHRMS stack (Next.js + Supabase + Zustand)**
**Last updated: May 2026**

---

## 1. Current State Inventory — What We Already Have

Before building anything, this is what is reusable from the existing system.

### Reusable Assets

| Asset | Location | Notes |
|---|---|---|
| TRAIN law monthly tax table | `src/lib/ph-deductions.ts` → `computeWithholdingTax()` | Already correct for 2023+ TRAIN. Needs annual variant. |
| SSS / PhilHealth / Pag-IBIG formulas | `src/lib/ph-deductions.ts` | 2026 rates. Reuse as-is. |
| Payslip type | `src/types/index.ts` → `Payslip` | Has gross, SSS, PhilHealth, Pag-IBIG, tax, allowances, holiday. Missing BIR category breakdowns. |
| Employee type | `src/types/index.ts` → `Employee` | Missing TIN, employment classification, MWE flag, substituted filing. |
| DeductionOverride + PH_EXEMPTION_REASONS | `src/types/index.ts` | Already supports "Minimum wage earner". Needs formal `is_mwe` flag. |
| Government deduction override system | `deduction_overrides` DB table | Supports auto/exempt/percentage/fixed modes. Reuse for MWE. |
| Government reports UI | `src/components/payroll/government-reports.tsx` | BIR CSV export works. Extend for Alphalist format. |
| Gov table version snapshots | `gov_table_versions` DB table | Use as the BIR tax rules version registry. |
| Audit trail | `audit_logs` DB table | Full who/when/what already in place. Wire BIR actions into `entity_type = 'bir'`. |
| Employee documents | `employee_documents` DB table | Use for storing generated 2316 PDFs. |
| Signature infrastructure | `SignaturePad` component + `payslip.signedAt` | Extend to 2316 employer/employee dual-signature workflow. |
| Payroll signature config | `PayrollSignatureConfig` type | Reuse authorized signature stamp for 2316 employer block. |
| 13th month generation | `payroll.store.ts` | Already computes 13th month payslips. Tag as `NON_TAXABLE_13TH` / `TAXABLE_13TH`. |
| Payroll service | `src/services/payroll.service.ts` | Extend to populate `tax_categories` JSON on each payslip. |
| Print-to-PDF workflow | `printable-payslip.tsx` | HTML → `window.open` → `window.print()`. Reuse exact pattern for Form 2316. |
| RBAC | Existing roles (`admin`, `hr`, `finance`, `payroll_admin`) | Wire BIR page permissions into this — no new roles needed. |
| Migration pipeline | `supabase/migrations/` at 055 | Next migration = **056**. |

### Missing — Must Build

| What | Where Needed |
|---|---|
| `tin` field on employee | Employees table + Employee type |
| Employment classification (R/C/CP/S/P/AL) | Employees table |
| `is_mwe` boolean + `mwe_daily_rate` | Employees table |
| `substituted_filing` boolean | Employees table |
| Employee tax profile table | New DB table `employee_tax_profiles` |
| Per-payslip BIR tax category breakdown | `payslips` table + `Payslip` type |
| Annual tax summaries per employee-year | New DB table `annual_tax_summaries` |
| Previous employer records | New DB table `previous_employer_records` |
| Form 2316 records | New DB table `form_2316_records` |
| Alphalist export log | New DB table `alphalist_exports` |
| BIR tax category engine | `src/lib/bir-tax-categories.ts` |
| MWE rules engine | `src/lib/mwe-rules.ts` |
| Annual withholding computation | `src/lib/annual-tax-engine.ts` |
| Year-end adjustment | `src/lib/annual-tax-engine.ts` |
| Form 2316 generator | `src/lib/form-2316-generator.ts` |
| Alphalist generator | `src/lib/alphalist-generator.ts` |
| BIR validation engine | `src/lib/bir-validation.ts` |
| BIR export engine (CSV/XLSX/DAT-ready) | `src/lib/bir-export.ts` |
| Anomaly detection rules | `src/lib/bir-anomaly-detector.ts` |
| API routes (annual summary, 2316, alphalist) | `src/app/api/payroll/bir/` |
| BIR Compliance page | `src/app/[role]/payroll/bir-compliance/` |
| Form 2316 UI component | `src/components/payroll/form-2316.tsx` |
| Alphalist preview UI | `src/components/payroll/alphalist-preview.tsx` |
| Validation dashboard | `src/components/payroll/bir-validation-dashboard.tsx` |
| eFPS workflow tracker | `src/components/payroll/efps-assistant.tsx` |
| Employee self-service 2316 download | Extend employee payroll portal |

---

## 2. Database Schema — New Tables & Additions (Migration 056)

### Additions to existing tables

**`employees` table:**
```sql
tin                       text UNIQUE,
employment_classification text DEFAULT 'R',   -- R, C, CP, S, P, AL
is_mwe                    bool DEFAULT false,
mwe_daily_rate            numeric,
substituted_filing        bool DEFAULT false,
tax_status                text DEFAULT 'S',   -- S, M, ME, MX
tax_residency             text DEFAULT 'resident',
separation_date           date,
separation_type           text                -- resigned | terminated | end_of_contract
```

**`payslips` table:**
```sql
tax_categories            jsonb,   -- TaxCategoryBreakdown JSON
taxable_compensation      numeric,
non_taxable_compensation  numeric
```

### New tables

**`employee_tax_profiles`** — extended BIR compliance record:
```sql
id                        text PRIMARY KEY,
employee_id               text UNIQUE REFERENCES employees(id),
tin                       text,
employment_classification text DEFAULT 'R',
is_mwe                    bool DEFAULT false,
mwe_daily_rate            numeric,
substituted_filing        bool DEFAULT false,
tax_status                text DEFAULT 'S',
tax_residency             text DEFAULT 'resident',
prev_employer_tin         text,
prev_employer_name        text,
prev_income               numeric,
prev_tax_withheld         numeric,
prev_2316_received        bool DEFAULT false,
separation_date           date,
separation_type           text,
created_at                timestamptz DEFAULT now(),
updated_at                timestamptz DEFAULT now()
```

**`annual_tax_summaries`** — one row per employee per calendar year:
```sql
id                        text PRIMARY KEY,
employee_id               text REFERENCES employees(id),
year                      int4,
total_taxable_comp        numeric DEFAULT 0,
total_non_taxable_comp    numeric DEFAULT 0,
total_de_minimis          numeric DEFAULT 0,
total_sss                 numeric DEFAULT 0,
total_philhealth          numeric DEFAULT 0,
total_pagibig             numeric DEFAULT 0,
total_13th_non_taxable    numeric DEFAULT 0,
total_13th_taxable        numeric DEFAULT 0,
total_other_benefits      numeric DEFAULT 0,
total_tax_withheld        numeric DEFAULT 0,
prev_employer_income      numeric DEFAULT 0,
prev_employer_tax         numeric DEFAULT 0,
annual_tax_due            numeric,
adjustment_type           text,               -- over_withheld | under_withheld | balanced
adjustment_amount         numeric,
status                    text DEFAULT 'open',-- open | reconciled | finalized | exported
finalized_at              timestamptz,
finalized_by              text,
created_at                timestamptz DEFAULT now(),
updated_at                timestamptz DEFAULT now(),
UNIQUE(employee_id, year)
```

**`previous_employer_records`** — for mid-year hires with prior 2316:
```sql
id                        text PRIMARY KEY,
employee_id               text REFERENCES employees(id),
year                      int4,
employer_name             text,
employer_tin              text,
employer_address          text,
total_income              numeric,
total_tax_withheld        numeric,
reference_2316            text,
submitted_at              timestamptz,
submitted_by              text,
created_at                timestamptz DEFAULT now()
```

**`form_2316_records`** — generated and archived 2316 certificates:
```sql
id                        text PRIMARY KEY,
employee_id               text REFERENCES employees(id),
year                      int4,
annual_summary_id         text REFERENCES annual_tax_summaries(id),
generated_at              timestamptz,
generated_by              text,
employer_signed_at        timestamptz,
employer_signed_by        text,
employer_signature_url    text,
employee_signed_at        timestamptz,
employee_signature_url    text,
pdf_url                   text,
document_hash             text,               -- SHA-256 tamper detection
status                    text DEFAULT 'draft',
released_at               timestamptz,
downloaded_at             timestamptz,
downloaded_by             text,
revoked_at                timestamptz,
revoked_by                text,
revoke_reason             text,
created_at                timestamptz DEFAULT now()
```

**`alphalist_exports`** — audit trail for every alphalist generation:
```sql
id                        text PRIMARY KEY,
year                      int4,
schedule_type             text,               -- schedule_1 | schedule_2 | both
generated_at              timestamptz,
generated_by              text,
employee_count            int4,
total_taxable_comp        numeric,
total_tax_withheld        numeric,
validation_status         text,               -- passed | has_warnings | has_errors
validation_errors         jsonb,
export_format             text,               -- csv | xlsx | dat
file_url                  text,
efps_status               text DEFAULT 'draft',
submitted_at              timestamptz,
submitted_by              text,
created_at                timestamptz DEFAULT now()
```

RLS rules for all new tables follow the existing `011_rls_policies.sql` pattern:
- Employees see only their own `form_2316_records`
- `payroll_admin`, `finance`, `admin` read all; only `payroll_admin`/`admin` can write

---

## 3. TypeScript Type Additions (`src/types/index.ts`)

```typescript
export interface TaxCategoryBreakdown {
  BASIC_TAXABLE: number;
  NON_TAXABLE_BASIC: number;
  DE_MINIMIS: number;
  SSS_EMPLOYEE_SHARE: number;
  PHILHEALTH_EMPLOYEE_SHARE: number;
  PAGIBIG_EMPLOYEE_SHARE: number;
  NON_TAXABLE_13TH: number;
  TAXABLE_13TH: number;
  OVERTIME: number;
  HOLIDAY_PAY: number;
  NIGHT_DIFF: number;
  HAZARD_PAY: number;
  ALLOWANCE: number;
  BONUS: number;
  OTHER_COMPENSATION: number;
  WITHHOLDING_TAX: number;
}

export type BIREmploymentClassification = 'R' | 'C' | 'CP' | 'S' | 'P' | 'AL';
export type BIRTaxStatus = 'S' | 'M' | 'ME' | 'MX';

export interface EmployeeTaxProfile {
  id: string;
  employeeId: string;
  tin?: string;
  employmentClassification: BIREmploymentClassification;
  isMWE: boolean;
  mweDailyRate?: number;
  substitutedFiling: boolean;
  taxStatus: BIRTaxStatus;
  taxResidency: 'resident' | 'non_resident';
  prevEmployerTin?: string;
  prevEmployerName?: string;
  prevIncome?: number;
  prevTaxWithheld?: number;
  prev2316Received?: boolean;
  separationDate?: string;
  separationType?: 'resigned' | 'terminated' | 'end_of_contract';
}

export interface AnnualTaxSummary {
  id: string;
  employeeId: string;
  year: number;
  totalTaxableComp: number;
  totalNonTaxableComp: number;
  totalDeMinimis: number;
  totalSSS: number;
  totalPhilHealth: number;
  totalPagIBIG: number;
  total13thNonTaxable: number;
  total13thTaxable: number;
  totalOtherBenefits: number;
  totalTaxWithheld: number;
  prevEmployerIncome: number;
  prevEmployerTax: number;
  annualTaxDue?: number;
  adjustmentType?: 'over_withheld' | 'under_withheld' | 'balanced';
  adjustmentAmount?: number;
  status: 'open' | 'reconciled' | 'finalized' | 'exported';
  finalizedAt?: string;
  finalizedBy?: string;
}

export interface BIRValidationIssue {
  employeeId?: string;
  employeeName?: string;
  field?: string;
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

export interface AlphalistExport {
  id: string;
  year: number;
  scheduleType: 'schedule_1' | 'schedule_2' | 'both';
  generatedAt: string;
  generatedBy: string;
  employeeCount: number;
  totalTaxableComp: number;
  totalTaxWithheld: number;
  validationStatus: 'passed' | 'has_warnings' | 'has_errors';
  validationErrors?: BIRValidationIssue[];
  exportFormat: 'csv' | 'xlsx' | 'dat';
  fileUrl?: string;
  efpsStatus: 'draft' | 'validated' | 'ready' | 'submitted' | 'paid' | 'completed';
}

// Additions to existing Payslip interface:
// taxCategories?: TaxCategoryBreakdown;
// taxableCompensation?: number;
// nonTaxableCompensation?: number;

// Additions to existing Employee interface:
// tin?: string;
// employmentClassification?: BIREmploymentClassification;
// isMWE?: boolean;
// substitutedFiling?: boolean;
// taxStatus?: BIRTaxStatus;
```

---

## 4. Implementation Phases

---

### Phase 1 — DB Schema + Types + Store Foundation
**Effort: 1 day**

1. Write `supabase/migrations/056_bir_compliance_foundation.sql`
   - All column additions + 5 new tables listed in Section 2
   - RLS policies for each new table
   - Indexes: `(employee_id, year)` on annual_tax_summaries; `tin` on employee_tax_profiles

2. Extend `src/types/index.ts` with all types from Section 3

3. Create `src/store/bir-compliance.store.ts` (Zustand, persisted)
   - State: `taxProfiles: EmployeeTaxProfile[]`, `annualSummaries: AnnualTaxSummary[]`, `alphalistExports: AlphalistExport[]`
   - Actions: `loadTaxProfiles`, `upsertTaxProfile`, `loadAnnualSummaries`, `loadAlphalistExports`
   - All actions hit the new API routes (see Phase 3)

---

### Phase 2 — Tax Categorization Engine
**Effort: 2 days**

**`src/lib/bir-tax-categories.ts`** — pure, no I/O:
- `categorizePay(payslip: Payslip, profile: EmployeeTaxProfile): TaxCategoryBreakdown`
- Mapping rules:
  - `grossPay` → `BASIC_TAXABLE` (non-MWE) or `NON_TAXABLE_BASIC` (MWE within MWE ceiling)
  - `allowances` → split: first ₱7,500/mo to `DE_MINIMIS` (within ₱90K/yr limit), excess to `ALLOWANCE`
  - `holidayPay` → `HOLIDAY_PAY` (non-taxable for MWE; taxable for non-MWE)
  - `overtimePay` → `OVERTIME` (non-taxable for MWE)
  - 13th month → `NON_TAXABLE_13TH` up to ₱90,000 cumulative; excess to `TAXABLE_13TH`
  - `sssDeduction` → `SSS_EMPLOYEE_SHARE`
  - `philhealthDeduction` → `PHILHEALTH_EMPLOYEE_SHARE`
  - `pagibigDeduction` → `PAGIBIG_EMPLOYEE_SHARE`
  - `taxDeduction` → `WITHHOLDING_TAX`

**`src/lib/mwe-rules.ts`** — pure:
- `isMWEExempt(profile: EmployeeTaxProfile, earningType: keyof TaxCategoryBreakdown): boolean`
- MWE exempts: BASIC (at/below MWE rate), HOLIDAY_PAY, OVERTIME, NIGHT_DIFF, HAZARD_PAY

**`src/lib/bir-tax-rules.ts`** — TRAIN law wrapper:
- `computeAnnualWithholdingTax(annualTaxableIncome: number): number` — annual brackets
- `computeYearEndAdjustment(summary: AnnualTaxSummary): { type, amount }`
- Reads brackets from `gov_table_versions` by `table_name = 'train_tax_table'` and effective year

**Update `src/services/payroll.service.ts`:**
- After standard payslip computation, call `categorizePay()` and store result in `payslip.taxCategories`
- Compute `taxableCompensation` and `nonTaxableCompensation` from the breakdown

**Update `payroll.store.ts`:**
- When generating any payslip (including 13th month), populate `taxCategories`
- 13th month detection: check if `periodLabel` includes "13th" or `is13thMonth` flag

---

### Phase 3 — Annual Tax Engine & Year-End Reconciliation
**Effort: 2 days**

**`src/lib/annual-tax-engine.ts`** — pure:
```typescript
aggregateAnnualSummary(
  payslips: Payslip[],
  prevEmployerRecord: PreviousEmployerRecord | null,
  year: number
): AnnualTaxSummary

computeAnnualTaxDue(summary: AnnualTaxSummary): number

computeYearEndAdjustment(summary: AnnualTaxSummary): {
  type: 'over_withheld' | 'under_withheld' | 'balanced';
  amount: number;
}
```

**API routes — `src/app/api/payroll/bir/`:**

| Route | Method | Purpose |
|---|---|---|
| `/api/payroll/bir/annual-summary` | GET `?year=` | Load all summaries for a year |
| `/api/payroll/bir/annual-summary/[employeeId]/[year]` | GET / PUT | One employee summary |
| `/api/payroll/bir/annual-summary/generate` | POST `{ year }` | Aggregate all payslips → save summaries |
| `/api/payroll/bir/year-end-adjustment` | POST `{ year }` | Run reconciliation for all employees |
| `/api/payroll/bir/previous-employer` | GET / POST / DELETE | Manage prior employer records |

**December reconciliation trigger:**
- In the payroll admin view, when December payroll is finalized, show a banner: "Run Year-End Reconciliation"
- Clicking it calls `/api/payroll/bir/year-end-adjustment`
- Under-withheld → flag employee, deduct adjustment balance in December payslip
- Over-withheld → generate refund memo, flag for manual refund by payroll admin

---

### Phase 4 — Form 2316 Generator
**Effort: 2-3 days**

**`src/lib/form-2316-generator.ts`** — pure:
```typescript
buildForm2316Data(
  employee: Employee,
  taxProfile: EmployeeTaxProfile,
  summary: AnnualTaxSummary,
  prevEmployerRecord?: PreviousEmployerRecord
): Form2316Data
```
Returns a typed object matching all BIR Form 2316 fields (Part I–VII + Schedule 1).

**API routes:**

| Route | Method | Purpose |
|---|---|---|
| `/api/payroll/bir/form-2316` | POST `{ employeeId, year }` | Generate + store in `form_2316_records` |
| `/api/payroll/bir/form-2316/[id]` | GET | Retrieve a record |
| `/api/payroll/bir/form-2316/[id]/sign` | POST `{ signatureUrl, signerRole }` | Record employer/employee signature |
| `/api/payroll/bir/form-2316/[id]/release` | POST | Set status to `released` |
| `/api/payroll/bir/form-2316/[id]/revoke` | POST `{ reason }` | Revoke with audit log entry |

**`src/components/payroll/form-2316.tsx`:**
- Renders the official BIR Form 2316 layout (all 7 parts)
- Reuses the existing `printWindow.open → HTML → print()` pattern from `printable-payslip.tsx`
- **No Puppeteer** — browser print is sufficient for the current stack
- Employer and employee signature sections with `SignaturePad` integration
- Status badge: Draft / For Signature / Released / Downloaded / Revoked

**Employee self-service:**
- Extend the employee payroll tab to show "Tax Documents" section
- Employee can download their own Form 2316 when `status = 'released'`
- Download event recorded to `form_2316_records.downloaded_at` and `downloaded_by`
- Revoked 2316s show "Revoked" badge; cannot be downloaded

---

### Phase 5 — Alphalist Generator & BIR Validation
**Effort: 2-3 days**

**`src/lib/alphalist-generator.ts`** — pure:
```typescript
generateSchedule1(
  summaries: AnnualTaxSummary[],
  employees: Employee[],
  profiles: EmployeeTaxProfile[]
): AlphalistRow[]

generateSchedule2(
  mweSummaries: AnnualTaxSummary[],
  employees: Employee[],
  profiles: EmployeeTaxProfile[]
): AlphalistMWERow[]
```

**Schedule 1 row fields:** Seq, TIN, Last Name, First Name, Middle Name, Employment Status,
Gross Compensation, Total Non-Taxable, De Minimis, SSS, PhilHealth, Pag-IBIG,
Other Non-Taxable, 13th Month (non-taxable), 13th Month (taxable excess),
Taxable Compensation, Prev Employer Income, Prev Employer Tax,
Total Tax Withheld, Annual Tax Due, Adjustment Type, Adjustment Amount

**Schedule 2 — MWE:** Same as Schedule 1 + Holiday Pay, OT Pay, Night Diff, Hazard Pay columns (all non-taxable)

**`src/lib/bir-validation.ts`** — validation engine:
```typescript
validateForAlphalist(
  rows: AlphalistRow[],
  profiles: EmployeeTaxProfile[]
): BIRValidationIssue[]
```

Validation codes:

| Code | Severity | Check |
|---|---|---|
| BV001 | error | Missing TIN |
| BV002 | error | TIN format invalid (not 12 digits NNN-NNN-NNN-NNN) |
| BV003 | error | Duplicate TIN across employees |
| BV004 | error | Missing last or first name |
| BV005 | warning | Missing employment dates |
| BV006 | error | Negative withholding tax |
| BV007 | error | Negative compensation |
| BV008 | warning | Tax withheld > tax due by >10% with no adjustment record |
| BV009 | error | MWE employee income above regional MWE ceiling |
| BV010 | warning | Previous employer income entered but no TIN |
| BV011 | warning | Employee has < 12 payroll months with no separation date |

**`src/lib/bir-export.ts`** — export engine:
```typescript
exportToCSV(rows: AlphalistRow[]): string
exportToXLSX(rows: AlphalistRow[]): Blob
formatDATRecord(row: AlphalistRow): string  // DAT stub for future use
```
- CSV: browser-side download (same pattern as `government-reports.tsx`)
- XLSX: use `xlsx` library (add to package.json if not present)
- DAT: stub implementation — format strings ready, not exported as file yet

**API routes:**

| Route | Method | Purpose |
|---|---|---|
| `/api/payroll/bir/alphalist/preview` | POST `{ year }` | Generate preview rows + run validation |
| `/api/payroll/bir/alphalist/export` | POST `{ year, format }` | Finalize, save to `alphalist_exports`, return download |
| `/api/payroll/bir/alphalist/[id]` | GET | Retrieve one export record |

**`src/components/payroll/alphalist-preview.tsx`:**
- Data table with all rows + validation status per row
- Color-coded: green = clean, yellow = warning, red = error
- "Resolve Issues" button opens the employee tax profile editor
- Export buttons: CSV / XLSX
- Summary panel: "87 of 90 employees BIR-ready (97%)"

**`src/components/payroll/bir-validation-dashboard.tsx`:**
- Aggregated view of all validation issues grouped by severity
- Quick-jump to employee record
- "Re-validate" button re-runs validation without regenerating

---

### Phase 6 — BIR Compliance Page, eFPS Assistant & Anomaly Flags
**Effort: 2 days**

**Page: `src/app/[role]/payroll/bir-compliance/page.tsx`**
Accessible to: `admin`, `payroll_admin`, `finance`

Tabs:
1. **Dashboard** — year selector, BIR readiness %, metrics cards (total employees, total taxable, total withheld, open anomalies)
2. **Employee Tax Profiles** — table with TIN, classification, MWE status — inline edit with save to API
3. **Monthly Withholding** — month selector → payslip table with BIR category breakdown columns
4. **Year-End / 2316** — run reconciliation button, generate all or individual 2316, status tracker
5. **Alphalist** — year selector → preview → validate → export
6. **eFPS Assistant** — filing checklist, status workflow, attachment uploads
7. **Export History** — past alphalist exports with download and status
8. **Audit Trail** — `audit_logs` filtered by `entity_type = 'bir'`

**`src/components/payroll/efps-assistant.tsx`:**
- Filing checklist (computed, not manual):
  - Annual summaries finalized ✓
  - All 2316 generated ✓
  - Alphalist validated ✓
  - Export package ready ✓
- Status workflow: Draft → Validated → Ready for eFPS → Submitted by Accountant → Payment Pending → Paid → Completed
- Status changes write to `alphalist_exports.efps_status` and `audit_logs`
- File upload: eFPS confirmation screenshot, payment confirmation, submitted DAT
- **NO** auto-login, **NO** auto-submit, **NO** eFPS API calls

**`src/lib/bir-anomaly-detector.ts`** — pure rule engine (no LLM):
```typescript
detectAnomalies(
  summaries: AnnualTaxSummary[],
  employees: Employee[],
  profiles: EmployeeTaxProfile[],
  payslips: Payslip[]
): AnomalyFlag[]
```

Anomaly rules:

| Rule | Risk |
|---|---|
| Employee salary > 0 but total_tax_withheld = 0 and not MWE | High |
| Duplicate TINs across employee_tax_profiles | High |
| Monthly gross variance > 50% vs prior month with no adjustment note | Medium |
| Resigned employee has payslips after separation_date | High |
| 13th month non-taxable > ₱90,000 with no taxable excess recorded | Medium |
| Previous employer income entered but prev_2316_received = false | Low |
| Employee with is_mwe = true but actual salary > regional MWE ceiling | High |

Output displayed in a "Compliance Review" sub-tab. Label as "Automated Review Flags" (not AI) in the UI. All actions remain manual.

---

## 5. Complete File Map

```
src/
├── lib/
│   ├── ph-deductions.ts              ← EXISTING — reuse + add annual variant
│   ├── payroll-deductions.ts         ← EXISTING — no changes
│   ├── bir-tax-categories.ts         ← NEW Phase 2
│   ├── mwe-rules.ts                  ← NEW Phase 2
│   ├── bir-tax-rules.ts              ← NEW Phase 2
│   ├── annual-tax-engine.ts          ← NEW Phase 3
│   ├── form-2316-generator.ts        ← NEW Phase 4
│   ├── alphalist-generator.ts        ← NEW Phase 5
│   ├── bir-validation.ts             ← NEW Phase 5
│   ├── bir-export.ts                 ← NEW Phase 5
│   └── bir-anomaly-detector.ts       ← NEW Phase 6
├── store/
│   ├── payroll.store.ts              ← EXTEND — add taxCategories to payslip generation
│   └── bir-compliance.store.ts       ← NEW Phase 1
├── services/
│   └── payroll.service.ts            ← EXTEND — populate tax_categories on payslip
├── types/
│   └── index.ts                      ← EXTEND — new BIR types + Payslip/Employee additions
├── components/payroll/
│   ├── government-reports.tsx        ← EXTEND — add alphalist-format CSV
│   ├── printable-payslip.tsx         ← EXISTING — pattern reused for 2316 PDF, no changes
│   ├── form-2316.tsx                 ← NEW Phase 4
│   ├── alphalist-preview.tsx         ← NEW Phase 5
│   ├── bir-validation-dashboard.tsx  ← NEW Phase 5
│   └── efps-assistant.tsx            ← NEW Phase 6
└── app/
    ├── api/payroll/bir/
    │   ├── annual-summary/route.ts   ← NEW Phase 3
    │   ├── year-end-adjustment/route.ts ← NEW Phase 3
    │   ├── previous-employer/route.ts← NEW Phase 3
    │   ├── form-2316/route.ts        ← NEW Phase 4
    │   └── alphalist/route.ts        ← NEW Phase 5
    └── [role]/payroll/
        ├── page.tsx                  ← EXTEND — add BIR Compliance tab/link
        └── bir-compliance/
            └── page.tsx              ← NEW Phase 6

supabase/migrations/
└── 056_bir_compliance_foundation.sql ← NEW Phase 1
```

---

## 6. Engineering Constraints

| Rule | Reason |
|---|---|
| No hardcoded tax tables | All TRAIN brackets stored in `gov_table_versions`. New rates go through existing version review workflow. |
| No auto-filing | eFPS assistant tracks status only. Never auto-login or auto-submit. |
| Historical integrity | `annual_tax_summaries` once `finalized` are immutable. Corrections require a new revision + audit log entry. |
| MWE is always explicit | `is_mwe` must be set manually by payroll admin. System never auto-promotes. |
| TIN must not appear in logs | Reference by employee ID in audit_logs. TIN stored only in `employee_tax_profiles`. |
| No Puppeteer | Form 2316 PDF uses the existing `printWindow.open → print()` path. No new PDF libraries. |
| All BIR actions → audit_logs | Generate, sign, release, export, revoke all write `entity_type = 'bir'` to audit_logs. |
| Reuse existing RBAC | No new role types. `payroll_admin` + `finance` share BIR access. `admin` has full override. |
| RLS on all new tables | Pattern: employee reads own row; payroll_admin/finance/admin read all; only payroll_admin/admin write. |

---

## 7. Implementation Priority Order

| # | Phase | Blocking? |
|---|---|---|
| 1 | Migration 056 + type extensions + store skeleton | Yes — everything depends on schema |
| 2 | Tax categorization engine + MWE rules | Yes — needed before summaries are meaningful |
| 3 | Employee Tax Profile UI (TIN + classification editor) | Yes — data must exist before alphalist works |
| 4 | Annual tax engine + year-end reconciliation API | Yes — needed before 2316 generation |
| 5 | Form 2316 generator + UI + employee download | High — employee-facing deliverable |
| 6 | Alphalist generator + validation engine + export | High — BIR submission deliverable |
| 7 | BIR Compliance Dashboard page | Medium — wraps all above |
| 8 | eFPS Assistant | Medium — workflow tracker |
| 9 | Anomaly detection rules | Low — enhancement, no blocking dependencies |
| 10 | DAT export format implementation | Low — future-proofing stub |

---

## 8. What We Explicitly Do NOT Build

- Auto-login or automated eFPS submission
- BIR API integration (BIR has no public REST API)
- LLM-based tax advice (anomaly detection is rule-based only)
- Separate payroll rewrite — the BIR engine layers on top of the existing payroll computation
- 1601-C / 1604-CF form generation in this phase (alphalist is Phase 1 priority; add these as Phase 7+ extensions)
