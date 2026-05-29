# POGRC HRMS — SA Commission & Payroll Integration Plan

**Source:** `POGRC-HRMS-DevBrief.pdf` (Premium Outlets Global Retail Corp., COO Office, June 2026)  
**Scope:** Sales Associate (SA) commission engine integrated with existing NexHRIS / Premium Outlets payroll  
**Approach:** Karpathy-style — pure calculation module first, then store + UI, then payroll export wiring

---

## Assumption

- **SA** = floor sales staff on the Premium Outlets retail payroll track (fixed base ₱15,340/month per brief).
- **OIC** = branch officer-in-charge; separate bonus structure, excluded from store-goal KPI pool.
- **COO / Owner** map to existing `admin` (full access) until dedicated roles are added.
- **Phase 1 (this delivery):** calculation engine, demo-ready store, payroll tab, unit tests. Supabase tables follow in Phase 2.

---

## 1. Business Flow (from Dev Brief)

| Step | Actor | Action |
|------|--------|--------|
| 1 | OIC | Weekly compliance input per SA (criteria + violations) |
| 2 | COO | Validate OIC input (Fridays); cross-check POS + payroll |
| 3 | OIC / COO | Approve OT; SA declares **cash** or **offset** at approval |
| 4 | COO | Month-end: enter each SA **total POS sales** |
| 5 | System | Run 4 computations → **draft** payout per SA |
| 6 | COO | Review and **approve** payout |
| 7 | HR | View **approved** only; export to payroll |
| 8 | SA | Read-only own score and payout |

**Payout status:** `draft` → `approved` → `processed` (HR export)

---

## 2. The Four Computations

### 2A. Sales Commission

```
achievement_pct = (sales_total / 1_000_000) * 100
```

| Level | Achievement | Commission |
|-------|-------------|------------|
| NOT HIT | &lt; 90% | ₱0 |
| GOOD | 90–99% | ₱500 |
| GREAT | 100–119% | ₱1,000 |
| EXCELLENT | 120–149% | ₱1,500 |
| STAR | ≥ 150% | ₱2,000 |

**Code:** `src/lib/sa-commission.ts` → `computeSalesCommission()`

### 2B. Overtime Pay (SA track)

```
daily_rate  = 590
hourly_rate = 73.75
ot_rate     = 92.19  (125% DOLE)
monthly_ot  = SUM(approved_ot_hours_per_day) * 92.19
```

- Max **2 hours/day** (enforce at input).
- Only **approved** OT counts; `ot_type` required: `cash` | `offset`.
- Aligns with existing `payroll-deductions.ts` OT multipliers for general staff; SA brief uses fixed rates.

**Code:** `computeSaOtPay()`, `validateSaOtDay()`

### 2C. Compliance Score

**Earn (weekly caps ≤ 4 where noted):**

| Field | Points/week |
|-------|-------------|
| attendance | 10 |
| grooming | 10 |
| floor | 10 |
| photo | 5 |
| groupchat | 5 |
| commitment | 10 |
| training_sessions | 5 each (no cap) |
| proactive_incidents | 5 each (no cap) |
| cashier | 10 |
| highest_sales_wins | 20 (max 1 SA per branch per week) |

**Deduct (counts):** late_arrival (5), hair (5), uniform (5), zone_uncovered (10), no_greeting (5), phone (5), photo_missed (5), groupchat_missed (5), missed_training (10), late_kpi_report (5), repeated_violation (10), cash_shortage (10), counter_unattended (10)

```
score = clamp(earned - deducted, 0, 360)
```

| Tier | Score | Cash | GC | Rice | Modifier |
|------|-------|------|-----|------|------------|
| GOLD | ≥260 | 1000 | 500 | 400 | 1.0 |
| SILVER | ≥200 | 0 | 500 | 0 | 1.0 |
| BRONZE | ≥140 | 0 | 0 | 0 | 0.8 |
| NI | &lt;140 | 0 | 0 | 0 | 0.5 |

**Code:** `computeComplianceScore()`, `assignComplianceTier()`

### 2D. Store Goal Bonus

Only if `branch_total_sales >= 6_000_000`:

```
kpi_raw = units*1 + floor(revenue/5000)*3 + upsells*2 + commendations*5 - complaints*5
kpi_per_shift = kpi_raw / shifts_worked
median = median(kpi_per_shift) for eligible SAs in branch
ratio = kpi_per_shift / median
kpi_mult from ratio tiers (1.8 / 1.4 / 1.0 / 0.65 / 0.35)
effective_weight = kpi_mult * compliance_modifier
sa_goal_share = (effective_weight / sum(weights)) * 10_000
```

- Median computed at payout time — **never stored**.
- OIC excluded from pool; trainees excluded from all incentives.

**Code:** `computeStoreGoalPool()`, `computeMedian()`

---

## 3. Grand Total & Payroll Bridge

```
cash_payroll =
  base_salary (15_340 for regular SA track)
  + sales_commission
  + ot_pay
  + compliance_cash
  + store_goal_share

non_cash =
  compliance_gc + compliance_rice  (tracked separately, not in payslip net)
```

**Payroll integration:**

| Component | Payslip field |
|-----------|----------------|
| sales_commission + ot_pay + compliance_cash + store_goal_share | `allowances` or `lineItemsJson` earning lines |
| compliance_gc / rice | Notes / separate non-cash export (HR COO handoff) |

**Employment rules:**

| Type | Commission | OT | Compliance cash | Store goal |
|------|------------|-----|-----------------|------------|
| trainee | ✗ | ✗ | ✗ | ✗ |
| probationary | ✓ | ✓ | ✗ | ✗ |
| regular | ✓ | ✓ | ✓ | ✓ |
| oic | separate | separate | separate | ✗ (not in KPI pool) |

---

## 4. Break Policy (DOLE)

- Lunch 30 min + dinner 30 min = 60 min unpaid per 8h shift.
- `paid_hours = shift_hours - break_minutes_taken` (if break taken).
- Work through break → minutes become compensable.

**Integration:** extend timesheet / attendance hour calc when SA shift type is enabled (Phase 2).

---

## 5. Roles & Access (target)

| Brief role | App role (Phase 1) | Access |
|------------|-------------------|--------|
| COO | admin | All branches, draft/approve, sales entry |
| OIC | supervisor | Own branch compliance + OT approve |
| HR | finance / payroll_admin | Approved export only |
| Owner | admin (read-only flag later) | Dashboard summary |
| SA | employee | Own approved payout read-only |

---

## 6. Build Phases

### Phase 1 — Delivered in this PR ✅

- [x] `src/lib/sa-commission.ts` — all formulas, constants, eligibility
- [x] `src/__tests__/lib/sa-commission.test.ts` — unit tests
- [x] Types in `src/types/index.ts`
- [x] `src/store/sa-commission.store.ts` — monthly cycles (Zustand persist)
- [x] `src/components/payroll/sa-commission-panel.tsx` — COO/Finance UI
- [x] Payroll tab **SA Incentives** in admin payroll view
- [x] `buildMonthlySaPayout()` — aggregates 4 computations
- [x] `toPayrollAllowances()` — map approved cash components for payslip issue

### Phase 2 — Database & API (in progress)

- [x] Migration `062_sa_commission.sql` — `sa_employee_profiles`, `sa_monthly_cycles`, `sa_payouts`, `sa_compliance_weeks`, `sa_ot_approvals` + RLS
- [x] API `GET/PUT /api/sa-commission/cycles` — sync cycles to Supabase
- [x] Compliance & KPI entry UI on SA Incentives panel
- [x] Wire `issuePayslip` → approved SA incentives via `getApprovedSaIncentiveAllowances()`
- [ ] Dedicated OT approval UI (`sa_ot_approvals` table)
- [ ] Weekly compliance per-week UI (`sa_compliance_weeks`)
- [ ] SA employee self-service view

### Phase 3 — Reports (6 outputs from brief)

1. Monthly Payout Report  
2. Compliance Score Card  
3. KPI Ranking Board  
4. OT Summary  
5. Store Goal Dashboard  
6. SA Self-Service (employee view)

### Phase 4 — POS / validation

- POS sales import or manual COO entry validation flags
- `highest_sales_wins` unique constraint per branch/week at DB level

---

## 7. Verification Checklist

| Test | Expected |
|------|----------|
| Sales ₱899,999 | commission ₱0 |
| Sales ₱1,000,000 | commission ₱1,000 (GREAT) |
| Sales ₱1,500,000 | commission ₱2,000 (STAR) |
| OT 3h one day | only 2h × 92.19 counted |
| Compliance 260+ | GOLD, modifier 1.0 |
| Branch sales &lt; 6M | all store_goal_share = 0 |
| Trainee | all incentive components 0 |
| Single SA in branch + goal hit | 100% of ₱10k pool |

Run: `npm test -- sa-commission`

---

## 8. File Map

| File | Purpose |
|------|---------|
| `src/lib/sa-commission.ts` | Pure math (single source of truth) |
| `src/store/sa-commission.store.ts` | Monthly data + draft/approve |
| `src/components/payroll/sa-commission-panel.tsx` | UI |
| `src/app/[role]/payroll/_views/admin-view.tsx` | Tab entry |
| `src/__tests__/lib/sa-commission.test.ts` | Tests |

---

© Premium Outlets Global Retail Corp. — internal implementation plan derived from COO Dev Brief.
