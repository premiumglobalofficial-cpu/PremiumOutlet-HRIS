import {
  approvedCashHoursForMonth,
  computeOtPayFromApprovals,
  resolveOtHoursForPayout,
} from "@/lib/sa-ot-approvals";
import type { SaOtApproval } from "@/types";

describe("sa-ot-approvals", () => {
  const month = "2026-06";

  const approvals: SaOtApproval[] = [
    {
      id: "1",
      employeeId: "e1",
      date: "2026-06-05",
      hours: 2,
      otType: "cash",
      status: "approved",
    },
    {
      id: "2",
      employeeId: "e1",
      date: "2026-06-10",
      hours: 2,
      otType: "offset",
      status: "approved",
    },
    {
      id: "3",
      employeeId: "e1",
      date: "2026-06-12",
      hours: 2,
      otType: "cash",
      status: "pending",
    },
  ];

  it("counts only approved cash hours", () => {
    expect(approvedCashHoursForMonth(approvals, month)).toEqual([2]);
  });

  it("computes OT pay from approved cash only", () => {
    expect(computeOtPayFromApprovals(approvals, month)).toBeCloseTo(184.38, 1);
  });

  it("prefers approval log over manual hours", () => {
    expect(resolveOtHoursForPayout(approvals, month, [1, 1, 1])).toEqual([2]);
  });

  it("falls back to manual when no approved cash", () => {
    expect(resolveOtHoursForPayout([], month, [2, 1])).toEqual([2, 1]);
  });
});
