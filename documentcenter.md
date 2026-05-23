# Document Center / 201 File / Disciplinary (NTE & NOD)
**Principal Full-Stack Implementation Plan — Tailored to NexHRMS**

> Original brief preserved at `documentcenter.md.bak`. This file = the actual build plan.

---

## 1. Where it lives in NexHRMS

### Sidebar — HR group (after this sprint)
```
HR
├── Employees           /employees/manage     (existing)
├── 201 Files           /employees/201-files  ← NEW
├── Disciplinary        /disciplinary         ← NEW
├── Projects            (existing)
└── Tasks               (existing)
```

### Inside each Employee Profile
The existing detail page `src/app/[role]/employees/[id]/_views/admin-view.tsx` already has tabs:
`Overview · Employment · Attendance · Leave · Payslips · Loans · Documents`

We **replace** the lightweight `Documents` tab with a rich **`201 File`** tab and **add** a new **`Disciplinary`** tab:

```
Profile Tabs
├── Overview
├── Employment
├── Attendance
├── Leave
├── Payslips
├── Loans
├── 201 File          ← upgraded from "Documents"
└── Disciplinary      ← NEW (case list + create)
```

> Following the brief's rule: NTE and NOD are **never** standalone pages. They live inside a disciplinary case, which itself appears in the employee's 201 file.

---

## 2. Existing primitives we reuse

| Concern | Existing artefact | Action |
|---|---|---|
| Lightweight employee documents | `EmployeeDocument` in `src/types/index.ts`, `addDocument`/`removeDocument` in `useEmployeesStore` | Mark legacy. Keep for back-compat; new code uses `useDocumentsStore`. |
| Audit logging | `useAuditStore.log({entityType, entityId, action, performedBy})` | Reuse — log every doc upload, NTE issue, NOD issue, status change. |
| Notifications | `useNotificationsStore.dispatch(trigger, vars, employeeId)` | Add 4 new triggers (see §6). |
| Auth gating | `RoleViewDispatcher` + `requireBIRRole` pattern | Reuse `RoleViewDispatcher` for views; new helper `requireHRRole` for any future API. |
| Persisted offline-first stores | `safePersistStorage` + Zustand `persist` middleware | Mirror exactly — same file shape as `loans.store.ts`. |
| File storage | `avatars` Supabase Storage bucket (migration 050) | Add `employee-documents` bucket in migration 057 (see §3). |

---

## 3. Database — Migration `057_employee_201_files_disciplinary.sql`

Style: 100% additive, idempotent (`IF NOT EXISTS`), `BEGIN`/`COMMIT`. Mirrors migration 056.

### 3.1 Tables

```sql
-- 201-file documents (richer than existing employee_documents)
CREATE TABLE IF NOT EXISTS public.employee_201_documents (
  id              text PRIMARY KEY,
  employee_id     text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_type   text NOT NULL CHECK (document_type IN (
                    'personal_info','employment_contract','government_id',
                    'resume','application_form','job_offer','medical',
                    'training_certificate','performance_evaluation',
                    'payslip','leave_record','warning','nte','nod',
                    'clearance','resignation_letter','coe',
                    'final_pay_document','other')),
  document_title  text NOT NULL,
  file_path       text,                  -- Supabase Storage path or external URL
  file_type       text,                  -- mime
  file_size       bigint,
  status          text NOT NULL DEFAULT 'uploaded' CHECK (status IN (
                    'pending_upload','uploaded','for_review','approved',
                    'rejected','expired','archived')),
  visibility      text NOT NULL DEFAULT 'hr_only' CHECK (visibility IN (
                    'hr_only','manager','employee','payroll','admin_only')),
  expiry_date     date,
  remarks         text,
  uploaded_by     text,
  reviewed_by     text,
  reviewed_at     timestamptz,
  case_id         text,                  -- back-link if generated from disciplinary case
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Disciplinary cases (NTE + NOD share one case)
CREATE TABLE IF NOT EXISTS public.disciplinary_cases (
  id                 text PRIMARY KEY,
  case_number        text NOT NULL UNIQUE,
  employee_id        text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  violation_type     text NOT NULL,
  policy_reference   text,
  incident_date      timestamptz NOT NULL,
  incident_location  text,
  description        text NOT NULL,
  evidence_urls      jsonb NOT NULL DEFAULT '[]',
  status             text NOT NULL DEFAULT 'open' CHECK (status IN (
                       'open','nte_issued','nte_acknowledged','explanation_submitted',
                       'no_response','under_review','nod_issued','nod_acknowledged',
                       'sanction_active','closed')),
  assigned_hr        text,                       -- HR officer id
  created_by         text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- NTE record (one per case)
CREATE TABLE IF NOT EXISTS public.nte_records (
  id                       text PRIMARY KEY,
  case_id                  text NOT NULL UNIQUE
                             REFERENCES public.disciplinary_cases(id) ON DELETE CASCADE,
  employee_id              text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  response_deadline        date NOT NULL,
  document_id              text,                  -- pdf saved into employee_201_documents
  issued_by                text NOT NULL,
  issued_at                timestamptz NOT NULL DEFAULT now(),
  acknowledged_at          timestamptz,
  employee_explanation     text,
  explanation_submitted_at timestamptz,
  status                   text NOT NULL DEFAULT 'issued' CHECK (status IN (
                             'draft','issued','acknowledged','explanation_submitted',
                             'no_response','under_review','closed','moved_to_nod')),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- NOD record (one per case, only if HR escalates)
CREATE TABLE IF NOT EXISTS public.nod_records (
  id                  text PRIMARY KEY,
  case_id             text NOT NULL UNIQUE
                        REFERENCES public.disciplinary_cases(id) ON DELETE CASCADE,
  employee_id         text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  decision            text NOT NULL CHECK (decision IN (
                        'no_violation','verbal_warning','written_warning',
                        'final_warning','suspension','termination',
                        'salary_deduction','training_required','pip')),
  sanction_start_date date,
  sanction_end_date   date,
  return_to_work_date date,
  decision_details    text NOT NULL,
  document_id         text,                       -- pdf saved into employee_201_documents
  issued_by           text NOT NULL,
  issued_at           timestamptz NOT NULL DEFAULT now(),
  acknowledged_at     timestamptz,
  status              text NOT NULL DEFAULT 'issued' CHECK (status IN (
                        'draft','issued','acknowledged','sanction_active','completed','closed')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
```

### 3.2 Indexes & triggers
- `(employee_id)` btree on all four tables
- `(status)` btree on cases/nte/nod
- `(employee_id, document_type)` on `employee_201_documents`
- `updated_at` trigger reusing existing `set_updated_at()` function

### 3.3 RLS
- HR / admin: full CRUD on all four tables
- Finance / payroll_admin: SELECT on `employee_201_documents` (visibility ∈ payroll/admin_only blocked unless admin)
- Supervisor: SELECT only for direct reports
- Employee: SELECT own records where `visibility IN ('employee')` ; can also `UPDATE` `employee_explanation` and `acknowledged_at` on their own NTE/NOD

### 3.4 Storage bucket
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('employee-documents','employee-documents', false, 26214400,  -- 25 MB
        ARRAY['application/pdf','image/jpeg','image/png',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/msword'])
ON CONFLICT (id) DO NOTHING;
```
RLS: HR/admin write; employees read own files only.

---

## 4. TypeScript types — `src/types/index.ts` additions

```ts
export type Employee201DocType =
  | "personal_info" | "employment_contract" | "government_id"
  | "resume" | "application_form" | "job_offer" | "medical"
  | "training_certificate" | "performance_evaluation"
  | "payslip" | "leave_record" | "warning" | "nte" | "nod"
  | "clearance" | "resignation_letter" | "coe"
  | "final_pay_document" | "other";

export type Document201Status =
  | "pending_upload" | "uploaded" | "for_review" | "approved"
  | "rejected" | "expired" | "archived";

export type Document201Visibility =
  | "hr_only" | "manager" | "employee" | "payroll" | "admin_only";

export interface Employee201Document {
  id: string;
  employeeId: string;
  documentType: Employee201DocType;
  documentTitle: string;
  filePath?: string;
  fileType?: string;
  fileSize?: number;
  status: Document201Status;
  visibility: Document201Visibility;
  expiryDate?: string;            // YYYY-MM-DD
  remarks?: string;
  uploadedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  caseId?: string;                // back-link
  createdAt: string;
  updatedAt: string;
}

export type DisciplinaryCaseStatus =
  | "open" | "nte_issued" | "nte_acknowledged" | "explanation_submitted"
  | "no_response" | "under_review" | "nod_issued" | "nod_acknowledged"
  | "sanction_active" | "closed";

export interface DisciplinaryCase {
  id: string;
  caseNumber: string;             // CASE-YYYY-NNNN
  employeeId: string;
  violationType: string;
  policyReference?: string;
  incidentDate: string;
  incidentLocation?: string;
  description: string;
  evidenceUrls: string[];
  status: DisciplinaryCaseStatus;
  assignedHr?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type NTEStatus =
  | "draft" | "issued" | "acknowledged" | "explanation_submitted"
  | "no_response" | "under_review" | "closed" | "moved_to_nod";

export interface NTERecord {
  id: string;
  caseId: string;
  employeeId: string;
  responseDeadline: string;
  documentId?: string;
  issuedBy: string;
  issuedAt: string;
  acknowledgedAt?: string;
  employeeExplanation?: string;
  explanationSubmittedAt?: string;
  status: NTEStatus;
  createdAt: string;
  updatedAt: string;
}

export type NODDecision =
  | "no_violation" | "verbal_warning" | "written_warning"
  | "final_warning" | "suspension" | "termination"
  | "salary_deduction" | "training_required" | "pip";

export type NODStatus =
  | "draft" | "issued" | "acknowledged" | "sanction_active" | "completed" | "closed";

export interface NODRecord {
  id: string;
  caseId: string;
  employeeId: string;
  decision: NODDecision;
  sanctionStartDate?: string;
  sanctionEndDate?: string;
  returnToWorkDate?: string;
  decisionDetails: string;
  documentId?: string;
  issuedBy: string;
  issuedAt: string;
  acknowledgedAt?: string;
  status: NODStatus;
  createdAt: string;
  updatedAt: string;
}
```

Also extend `AuditAction` union:
```
| "doc_uploaded" | "doc_approved" | "doc_rejected" | "doc_archived"
| "case_created" | "nte_issued" | "nte_acknowledged" | "nte_explained"
| "nod_issued" | "nod_acknowledged" | "case_closed"
```

---

## 5. Stores

### 5.1 `src/store/documents.store.ts`

```ts
interface DocumentsState {
  documents: Employee201Document[];
  upload: (data: Omit<Employee201Document,"id"|"createdAt"|"updatedAt"|"status"> & { status?: Document201Status }) => Employee201Document;
  approve: (id: string, reviewerId: string, remarks?: string) => void;
  reject: (id: string, reviewerId: string, remarks: string) => void;
  archive: (id: string, by: string) => void;
  remove: (id: string) => void;
  setVisibility: (id: string, visibility: Document201Visibility) => void;
  setExpiry: (id: string, date: string) => void;
  getByEmployee: (employeeId: string) => Employee201Document[];
  getByType: (type: Employee201DocType) => Employee201Document[];
  getMissingForEmployee: (employeeId: string) => Employee201DocType[];   // gap analysis
  getExpiring: (daysAhead?: number) => Employee201Document[];
  attachToCase: (docId: string, caseId: string) => void;
  resetToSeed: () => void;
}
```
Required core 201 doc types (used by `getMissingForEmployee`):
`employment_contract, government_id, resume, application_form, medical`.

### 5.2 `src/store/disciplinary.store.ts`

```ts
interface DisciplinaryState {
  cases: DisciplinaryCase[];
  ntes:  NTERecord[];
  nods:  NODRecord[];

  createCase: (data: Omit<DisciplinaryCase,"id"|"caseNumber"|"createdAt"|"updatedAt"|"status">) => DisciplinaryCase;
  issueNTE:   (caseId: string, data: { responseDeadline: string; issuedBy: string }) => NTERecord;
  acknowledgeNTE: (nteId: string) => void;
  submitExplanation: (nteId: string, explanation: string) => void;
  markNoResponse: (nteId: string) => void;
  moveToReview:  (caseId: string) => void;
  issueNOD:      (caseId: string, data: Omit<NODRecord,"id"|"caseId"|"employeeId"|"issuedAt"|"createdAt"|"updatedAt"|"status">) => NODRecord;
  acknowledgeNOD: (nodId: string) => void;
  closeCase:     (caseId: string, by: string) => void;

  getByEmployee: (employeeId: string) => DisciplinaryCase[];
  getNTE: (caseId: string) => NTERecord | undefined;
  getNOD: (caseId: string) => NODRecord | undefined;
  getOpenCases: () => DisciplinaryCase[];
  getDashboardStats: () => { open: number; awaitingExplanation: number; forReview: number; nodPending: number; suspensionsActive: number; closed: number; };

  resetToSeed: () => void;
}
```

Every state-changing action emits an audit log entry **and** dispatches a notification (employee for NTE/NOD; HR for explanations submitted).

---

## 6. Notification triggers (additions to `notifications.store.ts`)

| Trigger | Recipient | Channel |
|---|---|---|
| `nte_issued` | employee | both |
| `nte_explanation_submitted` | admin, hr | email |
| `nod_issued` | employee | both |
| `doc_expiring` | employee, hr | email (scheduled, 30/7 days) |

Templates wired in `DEFAULT_RULES`.

---

## 7. Pages

### 7.1 `/[role]/employees/201-files`
- Table: every employee with completeness % (5 required docs), expiring docs, last activity
- Click row → drilldown panel = same 201 panel rendered in profile tab

### 7.2 `/[role]/disciplinary`
- KPI cards (Open · Awaiting Explanation · For Review · NOD Pending · Suspensions Active · Closed)
- Cases table (Case No · Employee · Violation · Incident Date · Status · Deadline · HR · Action)
- "New Case" button → modal

### 7.3 `/[role]/disciplinary/[caseId]`
- Full case timeline (incident → NTE → explanation → NOD → close)
- Action panel switches by current status:
  - `open` → Issue NTE
  - `nte_issued` → Mark Acknowledged · Mark No Response
  - `nte_acknowledged` / `explanation_submitted` → Move to Review
  - `under_review` → Issue NOD · Close (no violation)
  - `nod_issued` → Mark Acknowledged
  - `nod_acknowledged` / `sanction_active` → Close Case

### 7.4 Profile tabs
Replace existing `Documents` tab; add `Disciplinary` tab.

---

## 8. Sidebar — `src/lib/constants.ts`

Two new nav items in the **HR** group:
```ts
{ label: "201 Files",    href: "/employees/201-files", icon: "FolderArchive", group: "hr",
  roles: ["admin","hr","auditor"], permission: "page:employees" },
{ label: "Disciplinary", href: "/disciplinary",         icon: "Gavel",        group: "hr",
  roles: ["admin","hr"],            permission: "page:employees" },
```

---

## 9. Tests

- `src/__tests__/store/disciplinary.test.ts`:
  - case → NTE → ack → explanation → review → NOD → ack → close (full happy path)
  - case → NTE → no response → NOD path
  - case → NTE → review → NOD `no_violation` → close
- `src/__tests__/store/documents.test.ts`:
  - upload → for_review → approve flow + audit emission
  - `getMissingForEmployee` returns the right gap set

---

## 10. Out-of-scope for this sprint (explicit deferrals)

- PDF template engine (NTE/NOD/COE/Clearance) — stubbed: status flow works, document upload accepts pre-rendered PDF for now
- Supabase Storage signed-URL upload UI — uses URL/base64 fallback (same as current `addDocument`)
- Manager-view filtering (RLS in DB is in place; UI-side supervisor view comes next)
- Employee-side 201 viewer (next sprint — only HR & admin see 201 files this sprint)
