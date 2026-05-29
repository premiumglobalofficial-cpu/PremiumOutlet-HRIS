import {
  getApprovedSaIncentiveAllowances,
  resolvePayrollOvertimeForSa,
} from "@/lib/sa-payroll-bridge";
import type { SaPayoutRecord } from "@/types";

describe("getApprovedSaIncentiveAllowances", () => {
  const payout: SaPayoutRecord = {
    id: "SAP-1",
    employeeId: "EMP001",
    month: "2026-05",
    branchId: "main",
    status: "approved",
    breakdown: {
      employeeId: "EMP001",
      month: "2026-05",
      employmentType: "regular",
      baseSalary: 15340,
      salesTotal: 1_000_000,
      achievementPct: 100,
      salesLevel: "GREAT",
      salesCommission: 1000,
      otPay: 184.38,
      complianceScore: 260,
      complianceTier: "GOLD",
      complianceCash: 1000,
      complianceGc: 500,
      complianceRice: 400,
      complianceModifier: 1,
      storeGoalShare: 2500,
      cashTotal: 17024.38,
      nonCashTotal: 900,
    },
  };

  it("returns 0 for draft payouts", () => {
    const draft = { ...payout, status: "draft" as const };
    expect(getApprovedSaIncentiveAllowances([draft], "2026-05", "EMP001").amount).toBe(0);
  });

  it("sums approved cash components excluding base", () => {
    const result = getApprovedSaIncentiveAllowances([payout], "2026-05", "EMP001");
    expect(result.amount).toBe(4684.38);
    expect(result.note).toContain("SA incentives");
  });

  it("does not double-count OT when SA incentives apply", () => {
    const { otPay, skipFormOt } = resolvePayrollOvertimeForSa(true, 8, 500);
    expect(otPay).toBe(0);
    expect(skipFormOt).toBe(true);
  });

  it("uses form OT when no SA incentives", () => {
    const { otPay, skipFormOt } = resolvePayrollOvertimeForSa(false, 2, 500);
    expect(otPay).toBe(1250);
    expect(skipFormOt).toBe(false);
  });
});
