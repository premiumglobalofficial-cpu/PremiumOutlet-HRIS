import {
  getApprovedSaIncentiveAllowances,
  resolvePayrollOvertimeForSa,
} from "@/lib/sa-payroll-bridge";
import { isSaIncentiveEligibleCutoff } from "@/lib/sa-eom-policy";
import { toPayrollIncentiveAllowances } from "@/lib/sa-commission";
import type { SaPayoutRecord } from "@/types";

/**
 * Simulates the payroll issue path in admin-view.tsx handleIssue:
 * EOM gate → allowances → OT dedupe → processed status blocks re-pay.
 */
describe("SA payroll issue integration", () => {
  const approvedPayout: SaPayoutRecord = {
    id: "SAP-KIM",
    employeeId: "EMP-KIM",
    month: "2026-05",
    branchId: "main",
    status: "approved",
    breakdown: {
      employeeId: "EMP-KIM",
      month: "2026-05",
      employmentType: "regular",
      baseSalary: 15_340,
      salesTotal: 1_250_000,
      achievementPct: 125,
      salesLevel: "EXCELLENT",
      salesCommission: 1_500,
      otPay: 2_212.5,
      complianceScore: 290,
      complianceTier: "GOLD",
      complianceCash: 1_000,
      complianceGc: 500,
      complianceRice: 400,
      complianceModifier: 1,
      storeGoalShare: 1_000,
      cashTotal: 21_052.5,
      nonCashTotal: 900,
    },
  };

  const formAllowances = 0;
  const cutoff = "second" as const;
  const payFrequency = "semi_monthly";

  function simulateIssueAllowances(
    payout: SaPayoutRecord,
    includeSa: boolean,
    issueCutoff: "first" | "second" = cutoff,
    otHours = 0,
  ) {
    const eomEligible = isSaIncentiveEligibleCutoff(payFrequency, issueCutoff);
    let saIncentive = 0;
    if (includeSa && eomEligible) {
      saIncentive = getApprovedSaIncentiveAllowances(
        [payout],
        "2026-05",
        "EMP-KIM",
        { cutoff: issueCutoff, payFrequency },
      ).amount;
    }
    const allowances = formAllowances + saIncentive;
    const { otPay, skipFormOt } = resolvePayrollOvertimeForSa(
      saIncentive > 0,
      otHours,
      500,
    );
    return {
      saIncentive,
      allowances: allowances + otPay,
      skipFormOt,
      eomEligible,
    };
  }

  it("1st cutoff: base payroll only, SA blocked", () => {
    const result = simulateIssueAllowances(approvedPayout, true, "first");
    expect(result.eomEligible).toBe(false);
    expect(result.saIncentive).toBe(0);
    expect(result.allowances).toBe(0);
    expect(result.skipFormOt).toBe(false);
  });

  it("2nd cutoff EOM: approved SA added to allowances, wizard OT skipped", () => {
    const result = simulateIssueAllowances(approvedPayout, true, "second", 8);
    const expected = toPayrollIncentiveAllowances(approvedPayout.breakdown);
    expect(result.eomEligible).toBe(true);
    expect(result.saIncentive).toBe(expected);
    expect(result.saIncentive).toBe(5_712.5);
    expect(result.allowances).toBe(5_712.5);
    expect(result.skipFormOt).toBe(true);
  });

  it("toggle off: no SA even on EOM", () => {
    const result = simulateIssueAllowances(approvedPayout, false, "second");
    expect(result.saIncentive).toBe(0);
  });

  it("processed payout cannot be paid again", () => {
    const processed: SaPayoutRecord = { ...approvedPayout, status: "processed" };
    const result = simulateIssueAllowances(processed, true, "second");
    expect(result.saIncentive).toBe(0);
  });
});
