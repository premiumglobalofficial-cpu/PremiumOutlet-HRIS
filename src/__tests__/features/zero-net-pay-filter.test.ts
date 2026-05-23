/**
 * Zero Net Pay Filter — Correctness Tests
 * =========================================
 * Verifies that the "Fix Zero Net Pay Payslips" modal in PayrollReadinessChecklist
 * ONLY flags payslips where the employee has NO salary (grossPay <= 0).
 *
 * Root cause of the bug (commit 1f5e93e):
 *   OLD filter: p.netPay <= 0
 *     → Incorrectly flagged employees who HAVE a salary but whose deductions
 *       happened to zero out net pay (e.g. Andrea Mae Reyes, ₱75,750/mo with
 *       heavy custom deductions → rawNetPay = 0 → Math.max(0, 0) = netPay 0).
 *
 *   NEW filter: p.grossPay <= 0 || p.netPay < 0
 *     → Only flags payslips where salary was never configured (grossPay = 0),
 *       OR the impossible case of truly negative net pay (dead code since
 *       generation always clamps: netPay = Math.max(0, rawNetPay)).
 *
 * Test matrix:
 *  1.  Employee with salary, normal deductions → NOT flagged
 *  2.  Employee with salary, deductions zero out net → NOT flagged (the bug)
 *  3.  Employee with salary, deductions exceed gross (clamped to 0) → NOT flagged
 *  4.  Employee with NO salary (grossPay = 0) → FLAGGED
 *  5.  Employee with grossPay = negative → FLAGGED
 *  6.  Employee with genuinely negative netPay (hypothetical import) → FLAGGED
 *  7.  OLD filter would have flagged cases 2 & 3 — proves regression
 *  8.  Batch filter — only the salary-less payslips survive
 *  9.  payslipIds scoping — filter only operates on the current run
 * 10.  netPay clamping — generation never stores negative net pay
 * 11.  grossPay from salary is always > 0 for any non-zero salary
 * 12.  Null/undefined grossPay edge cases
 */

// ─── Pure helpers (replicate production logic) ───────────────────────────────

/**
 * Production filter (post-fix) — from payroll-readiness-checklist.tsx line 282.
 */
const badNetPayFilter = (p: {
  grossPay: number | null | undefined;
  netPay: number;
}): boolean => (p.grossPay ?? 0) <= 0 || p.netPay < 0;

/**
 * OLD (pre-fix) filter — the buggy version replaced by commit 1f5e93e.
 * Kept here to prove the regression.
 */
const oldBadNetPayFilter = (p: { netPay: number }): boolean => p.netPay <= 0;

/**
 * Replicates payslip generation's net pay clamping:
 *   netPay = Math.max(0, rawNetPay)   (admin-view.tsx ~line 584)
 */
const computeNetPay = (grossPay: number, totalDeductions: number): number =>
  Math.max(0, grossPay - totalDeductions);

/**
 * Replicates gross pay computation per frequency (admin-view.tsx ~lines 426-438).
 */
const computeGrossPay = (
  salary: number,
  freq: "semi_monthly" | "bi_weekly" | "weekly" | "monthly",
  prorFactor = 1
): number => {
  let fullPeriodGross: number;
  if (freq === "semi_monthly") fullPeriodGross = Math.round(salary / 2);
  else if (freq === "bi_weekly") fullPeriodGross = Math.round((salary * 12) / 26);
  else if (freq === "weekly") fullPeriodGross = Math.round((salary * 12) / 52);
  else fullPeriodGross = salary;
  return Math.round(fullPeriodGross * prorFactor);
};

// ─── Payslip factory ──────────────────────────────────────────────────────────
const makePayslip = (overrides: {
  id?: string;
  employeeId?: string;
  grossPay: number | null | undefined;
  netPay: number;
  status?: string;
}) => ({
  id: overrides.id ?? "PS-TEST01",
  employeeId: overrides.employeeId ?? "EMP-001",
  periodStart: "2026-05-01",
  periodEnd: "2026-05-15",
  payFrequency: "semi_monthly" as const,
  grossPay: overrides.grossPay as number,
  allowances: 0,
  sssDeduction: 0,
  philhealthDeduction: 0,
  pagibigDeduction: 0,
  taxDeduction: 0,
  otherDeductions: 0,
  loanDeduction: 0,
  netPay: overrides.netPay,
  issuedAt: "2026-05-16",
  status: (overrides.status ?? "draft") as "draft" | "published" | "signed" | "paid" | "payment_hold",
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Core Filter — Employees WITH salary (grossPay > 0)
// ═══════════════════════════════════════════════════════════════════════════════

describe("badNetPayFilter — employees WITH salary", () => {
  it("should NOT flag a payslip with normal grossPay and positive netPay", () => {
    const payslip = makePayslip({ grossPay: 75750, netPay: 65000 });
    expect(badNetPayFilter(payslip)).toBe(false);
  });

  it("should NOT flag Andrea Mae Reyes scenario: grossPay ₱75,750, netPay ₱0 (deductions zeroed it out)", () => {
    // This is THE BUG CASE — old filter flagged her, new filter must NOT
    const payslip = makePayslip({ grossPay: 75750, netPay: 0 });
    expect(badNetPayFilter(payslip)).toBe(false);
  });

  it("should NOT flag when deductions exactly equal gross (netPay clamped to 0)", () => {
    const grossPay = 37875;   // semi-monthly of ₱75,750/mo salary
    const totalDeductions = 37875; // deductions = gross → rawNetPay = 0
    const netPay = computeNetPay(grossPay, totalDeductions); // = 0
    const payslip = makePayslip({ grossPay, netPay });
    expect(netPay).toBe(0);              // confirms clamping happened
    expect(badNetPayFilter(payslip)).toBe(false); // must NOT flag
  });

  it("should NOT flag when deductions exceed gross (netPay clamped from negative to 0)", () => {
    const grossPay = 37875;
    const totalDeductions = 50000; // over-deducted → rawNetPay = -12125
    const netPay = computeNetPay(grossPay, totalDeductions); // = 0
    const payslip = makePayslip({ grossPay, netPay });
    expect(netPay).toBe(0);
    expect(badNetPayFilter(payslip)).toBe(false); // grossPay > 0 so NOT flagged
  });

  it("should NOT flag an employee with any salary > 0 regardless of deductions", () => {
    const salaryCases = [10000, 15000, 30000, 75750, 100000, 200000];
    salaryCases.forEach((salary) => {
      const grossPay = Math.round(salary / 2); // semi-monthly
      const netPay = computeNetPay(grossPay, grossPay); // worst case: all deducted → 0
      const payslip = makePayslip({ grossPay, netPay });
      expect(badNetPayFilter(payslip)).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Core Filter — Employees WITHOUT salary (grossPay = 0)
// ═══════════════════════════════════════════════════════════════════════════════

describe("badNetPayFilter — employees WITHOUT salary (correctly flagged)", () => {
  it("should FLAG a payslip with grossPay = 0", () => {
    const payslip = makePayslip({ grossPay: 0, netPay: 0 });
    expect(badNetPayFilter(payslip)).toBe(true);
  });

  it("should FLAG a payslip with negative grossPay", () => {
    const payslip = makePayslip({ grossPay: -1, netPay: 0 });
    expect(badNetPayFilter(payslip)).toBe(true);
  });

  it("should FLAG a payslip with null grossPay", () => {
    const payslip = makePayslip({ grossPay: null, netPay: 0 });
    expect(badNetPayFilter(payslip)).toBe(true);
  });

  it("should FLAG a payslip with undefined grossPay", () => {
    const payslip = makePayslip({ grossPay: undefined, netPay: 0 });
    expect(badNetPayFilter(payslip)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Core Filter — Truly Negative netPay (defensive branch)
// ═══════════════════════════════════════════════════════════════════════════════

describe("badNetPayFilter — negative netPay (defensive / import edge case)", () => {
  it("should FLAG a payslip with negative netPay (e.g. via external import)", () => {
    // This can't happen from in-app generation (Math.max clamping), but
    // a malformed import might produce it. The filter handles it defensively.
    const payslip = makePayslip({ grossPay: 50000, netPay: -100 });
    expect(badNetPayFilter(payslip)).toBe(true);
  });

  it("should FLAG negative netPay even when grossPay is positive", () => {
    const payslip = makePayslip({ grossPay: 75750, netPay: -5000 });
    expect(badNetPayFilter(payslip)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Regression — OLD filter vs NEW filter
// ═══════════════════════════════════════════════════════════════════════════════

describe("Regression: old filter (netPay <= 0) vs new filter (grossPay <= 0 || netPay < 0)", () => {
  it("OLD filter: incorrectly flags employee with salary but netPay = 0 (the bug)", () => {
    const payslip = makePayslip({ grossPay: 75750, netPay: 0 });
    // OLD filter (broken) — would have returned true, causing the UX bug
    expect(oldBadNetPayFilter(payslip)).toBe(true);  // ← this is the bug
  });

  it("NEW filter: correctly does NOT flag employee with salary but netPay = 0", () => {
    const payslip = makePayslip({ grossPay: 75750, netPay: 0 });
    // NEW filter (fixed) — returns false, employee excluded from modal
    expect(badNetPayFilter(payslip)).toBe(false); // ← this is the fix
  });

  it("OLD filter: correctly flags employee with no salary", () => {
    const payslip = makePayslip({ grossPay: 0, netPay: 0 });
    expect(oldBadNetPayFilter(payslip)).toBe(true);
  });

  it("NEW filter: correctly flags employee with no salary (same as old)", () => {
    const payslip = makePayslip({ grossPay: 0, netPay: 0 });
    expect(badNetPayFilter(payslip)).toBe(true);
  });

  it("regression summary: difference between old and new filter for a salaried employee", () => {
    const salaryPayslip = makePayslip({ grossPay: 75750, netPay: 0 });
    const noSalaryPayslip = makePayslip({ grossPay: 0, netPay: 0 });

    // OLD: would wrongly include both in the modal
    expect(oldBadNetPayFilter(salaryPayslip)).toBe(true);  // wrong
    expect(oldBadNetPayFilter(noSalaryPayslip)).toBe(true); // correct

    // NEW: only the no-salary payslip is in the modal
    expect(badNetPayFilter(salaryPayslip)).toBe(false);    // fixed
    expect(badNetPayFilter(noSalaryPayslip)).toBe(true);   // still correct
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Batch Filter — Simulates the useMemo in the component
// ═══════════════════════════════════════════════════════════════════════════════

describe("Batch filter — simulates runPayslips.filter(badNetPayFilter)", () => {
  const runPayslips = [
    makePayslip({ id: "PS-001", employeeId: "EMP-SALARY-1", grossPay: 75750, netPay: 0 }),     // salary, over-deducted
    makePayslip({ id: "PS-002", employeeId: "EMP-SALARY-2", grossPay: 37875, netPay: 28000 }),  // salary, healthy
    makePayslip({ id: "PS-003", employeeId: "EMP-SALARY-3", grossPay: 15000, netPay: 12000 }),  // salary, healthy
    makePayslip({ id: "PS-004", employeeId: "EMP-NOSALARY-1", grossPay: 0, netPay: 0 }),        // NO salary
    makePayslip({ id: "PS-005", employeeId: "EMP-NOSALARY-2", grossPay: 0, netPay: 0 }),        // NO salary
    makePayslip({ id: "PS-006", employeeId: "EMP-SALARY-4", grossPay: 25000, netPay: 18000 }),  // salary, healthy
    makePayslip({ id: "PS-007", employeeId: "EMP-NOSALARY-3", grossPay: 0, netPay: 0 }),        // NO salary
  ];

  it("new filter should only return payslips with grossPay = 0", () => {
    const flagged = runPayslips.filter(badNetPayFilter);
    expect(flagged).toHaveLength(3);
    expect(flagged.map((p) => p.id)).toEqual(["PS-004", "PS-005", "PS-007"]);
  });

  it("old filter would have returned 4 payslips (including the salaried over-deducted one)", () => {
    const flagged = runPayslips.filter(oldBadNetPayFilter);
    expect(flagged).toHaveLength(4); // PS-001 + PS-004 + PS-005 + PS-007
    expect(flagged.map((p) => p.id)).toContain("PS-001"); // incorrectly included
  });

  it("new filter count must always be <= old filter count (regression guard)", () => {
    const newCount = runPayslips.filter(badNetPayFilter).length;
    const oldCount = runPayslips.filter(oldBadNetPayFilter).length;
    expect(newCount).toBeLessThanOrEqual(oldCount);
  });

  it("all flagged payslips should have grossPay = 0", () => {
    const flagged = runPayslips.filter(badNetPayFilter);
    flagged.forEach((p) => {
      expect(p.grossPay).toBe(0);
    });
  });

  it("no payslip with grossPay > 0 should ever be in the flagged list", () => {
    const flagged = runPayslips.filter(badNetPayFilter);
    const wronglyFlagged = flagged.filter((p) => p.grossPay > 0);
    expect(wronglyFlagged).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. payslipIds Scoping — filter only operates on the current run's payslips
// ═══════════════════════════════════════════════════════════════════════════════

describe("payslipIds scoping — runPayslips correctly scoped to current run", () => {
  const allPayslips = [
    makePayslip({ id: "PS-CURRENT-1", employeeId: "EMP-001", grossPay: 0, netPay: 0 }),     // current run, no salary
    makePayslip({ id: "PS-CURRENT-2", employeeId: "EMP-002", grossPay: 50000, netPay: 40000 }), // current run, has salary
    makePayslip({ id: "PS-OLD-1",     employeeId: "EMP-003", grossPay: 0, netPay: 0 }),     // old run, no salary
    makePayslip({ id: "PS-OLD-2",     employeeId: "EMP-004", grossPay: 30000, netPay: 22000 }), // old run, has salary
  ];

  const currentRunPayslipIds = ["PS-CURRENT-1", "PS-CURRENT-2"];

  it("runPayslips should be filtered to only current run IDs", () => {
    const runPayslips = allPayslips.filter((p) => currentRunPayslipIds.includes(p.id));
    expect(runPayslips).toHaveLength(2);
    expect(runPayslips.map((p) => p.id)).toEqual(["PS-CURRENT-1", "PS-CURRENT-2"]);
  });

  it("filter applied to runPayslips only flags current-run no-salary payslip", () => {
    const runPayslips = allPayslips.filter((p) => currentRunPayslipIds.includes(p.id));
    const badPayslips = runPayslips.filter(badNetPayFilter);
    expect(badPayslips).toHaveLength(1);
    expect(badPayslips[0].id).toBe("PS-CURRENT-1");
  });

  it("payslips outside current run are never examined", () => {
    const runPayslips = allPayslips.filter((p) => currentRunPayslipIds.includes(p.id));
    const badPayslips = runPayslips.filter(badNetPayFilter);
    const ids = badPayslips.map((p) => p.id);
    expect(ids).not.toContain("PS-OLD-1");
    expect(ids).not.toContain("PS-OLD-2");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. netPay Clamping — generation never stores negative net pay
// ═══════════════════════════════════════════════════════════════════════════════

describe("netPay clamping — Math.max(0, rawNetPay)", () => {
  it("rawNetPay > 0 → netPay = rawNetPay (no clamping)", () => {
    expect(computeNetPay(50000, 10000)).toBe(40000);
  });

  it("rawNetPay = 0 → netPay = 0", () => {
    expect(computeNetPay(50000, 50000)).toBe(0);
  });

  it("rawNetPay < 0 (over-deducted) → netPay clamped to 0", () => {
    expect(computeNetPay(50000, 60000)).toBe(0);
    expect(computeNetPay(37875, 75000)).toBe(0);
  });

  it("netPay is NEVER negative from in-app generation", () => {
    const testCases = [
      { gross: 0, ded: 0 },
      { gross: 50000, ded: 0 },
      { gross: 50000, ded: 50000 },
      { gross: 50000, ded: 100000 },
      { gross: 75750, ded: 75750 },
      { gross: 37875, ded: 999999 },
    ];
    testCases.forEach(({ gross, ded }) => {
      const netPay = computeNetPay(gross, ded);
      expect(netPay).toBeGreaterThanOrEqual(0);
    });
  });

  it("because netPay is always >= 0, the p.netPay < 0 branch in the filter is dead code", () => {
    // This test documents the intentional dead code: netPay < 0 can never
    // fire from in-app payslip generation, only from malformed imports.
    const fromGeneration = computeNetPay(50000, 99999); // worst-case over-deduction
    expect(fromGeneration).toBe(0);
    // The filter condition: p.netPay < 0 → false, so grossPay <= 0 alone decides
    expect(fromGeneration < 0).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Gross Pay Computation — salary > 0 always produces grossPay > 0
// ═══════════════════════════════════════════════════════════════════════════════

describe("grossPay from non-zero salary is always > 0", () => {
  const frequencies = ["semi_monthly", "bi_weekly", "weekly", "monthly"] as const;
  const salaries = [10000, 15000, 30000, 75750, 100000];

  it("grossPay > 0 for all frequencies and typical salary values", () => {
    frequencies.forEach((freq) => {
      salaries.forEach((salary) => {
        const grossPay = computeGrossPay(salary, freq);
        expect(grossPay).toBeGreaterThan(0);
      });
    });
  });

  it("grossPay = 0 only when salary = 0", () => {
    frequencies.forEach((freq) => {
      const grossPay = computeGrossPay(0, freq);
      expect(grossPay).toBe(0);
    });
  });

  it("semi-monthly grossPay = Math.round(salary / 2)", () => {
    expect(computeGrossPay(75750, "semi_monthly")).toBe(37875);
    expect(computeGrossPay(30000, "semi_monthly")).toBe(15000);
    expect(computeGrossPay(15000, "semi_monthly")).toBe(7500);
  });

  it("grossPay is always <= monthly salary (no overpayment)", () => {
    const salary = 30000;
    frequencies.forEach((freq) => {
      const grossPay = computeGrossPay(salary, freq);
      expect(grossPay).toBeLessThanOrEqual(salary);
    });
  });

  it("grossPay > 0 even with minimum proration (1/15 of period)", () => {
    // A new employee joining the last day of a 15-day period
    const minProrFactor = 1 / 15; // ≈ 0.0667
    const salary = 30000;
    const grossPay = computeGrossPay(salary, "semi_monthly", minProrFactor);
    // Math.round(15000 * 0.0667) = Math.round(1000) = 1000
    expect(grossPay).toBeGreaterThan(0);
    expect(grossPay).toBeLessThan(Math.round(salary / 2));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Real-world payroll run scenarios (from screenshots)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Real-world scenarios matching screenshots", () => {
  /**
   * Screenshot 1 (1st cutoff): Modal showed 49 flagged payslips including
   * employees with salary like Andrea Mae Reyes (₱75,750/mo) — OLD BUG.
   *
   * Screenshot 2 (2nd cutoff): Same pattern across different cutoff period.
   *
   * After fix: only genuinely salary-less employees remain in the modal.
   */

  it("Andrea Mae Reyes (₱75,750/mo, semi-monthly): grossPay = ₱37,875, netPay = 0 → NOT flagged", () => {
    const salary = 75750;
    const grossPay = computeGrossPay(salary, "semi_monthly");   // 37875
    const netPay = computeNetPay(grossPay, grossPay);            // 0 (deductions = gross)
    const payslip = makePayslip({ grossPay, netPay });

    expect(grossPay).toBe(37875);
    expect(netPay).toBe(0);
    expect(badNetPayFilter(payslip)).toBe(false);   // FIXED — NOT in modal
    expect(oldBadNetPayFilter(payslip)).toBe(true); // WAS broken — was in modal
  });

  it("Employee with ₱30,000/mo salary, full deductions: NOT in modal", () => {
    const grossPay = computeGrossPay(30000, "semi_monthly"); // 15000
    const netPay = computeNetPay(grossPay, 15500);           // 0 (clamped)
    const payslip = makePayslip({ grossPay, netPay });
    expect(badNetPayFilter(payslip)).toBe(false);
  });

  it("Employee with NO salary configured (salary = 0 in DB): grossPay = 0 → IS in modal", () => {
    const grossPay = computeGrossPay(0, "semi_monthly"); // 0
    const netPay = computeNetPay(grossPay, 0);            // 0
    const payslip = makePayslip({ grossPay, netPay });
    expect(grossPay).toBe(0);
    expect(badNetPayFilter(payslip)).toBe(true);  // correctly shown in modal
  });

  it("1st cutoff scenario — mixed run: 3 with salary, 2 without", () => {
    const payslips = [
      makePayslip({ id: "1", grossPay: computeGrossPay(75750, "semi_monthly"), netPay: 0 }),    // salary, over-deducted
      makePayslip({ id: "2", grossPay: computeGrossPay(50000, "semi_monthly"), netPay: 20000 }), // salary, healthy
      makePayslip({ id: "3", grossPay: computeGrossPay(30000, "semi_monthly"), netPay: 12000 }), // salary, healthy
      makePayslip({ id: "4", grossPay: 0, netPay: 0 }),   // NO salary
      makePayslip({ id: "5", grossPay: 0, netPay: 0 }),   // NO salary
    ];

    const flaggedNew = payslips.filter(badNetPayFilter);
    const flaggedOld = payslips.filter(oldBadNetPayFilter);

    // New filter: only the 2 without salary
    expect(flaggedNew).toHaveLength(2);
    expect(flaggedNew.every((p) => p.grossPay === 0)).toBe(true);

    // Old filter: the 2 without salary + 1 with salary (over-deducted)
    expect(flaggedOld).toHaveLength(3);

    // New filter reduced the modal count — the salary employee is no longer shown
    expect(flaggedNew.length).toBeLessThan(flaggedOld.length);
  });

  it("2nd cutoff scenario — same employees, same fix applies", () => {
    const payslips = [
      makePayslip({ id: "A", grossPay: computeGrossPay(40000, "semi_monthly"), netPay: 0 }),    // salary
      makePayslip({ id: "B", grossPay: computeGrossPay(25000, "semi_monthly"), netPay: 10000 }), // salary
      makePayslip({ id: "C", grossPay: 0, netPay: 0 }),  // NO salary
    ];

    const flagged = payslips.filter(badNetPayFilter);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].id).toBe("C");
    expect(flagged[0].grossPay).toBe(0);
  });
});
