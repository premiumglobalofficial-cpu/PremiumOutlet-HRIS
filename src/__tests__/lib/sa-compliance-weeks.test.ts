import {
  aggregateWeekGridToEarned,
  emptyWeekGrid,
  weekGridFromMonthlyEarned,
} from "@/lib/sa-compliance-weeks";
import { getSaVariableCapWarning } from "@/lib/sa-eom-policy";
import type { SaMonthlyPayoutBreakdown } from "@/lib/sa-commission";

describe("sa-compliance-weeks", () => {
  it("aggregates 4-week checkboxes into monthly earned totals", () => {
    const grid = emptyWeekGrid();
    grid[0].attendance = true;
    grid[1].attendance = true;
    grid[0].grooming = true;
    const earned = aggregateWeekGridToEarned(grid, 2, 1);
    expect(earned.attendanceWeeks).toBe(2);
    expect(earned.groomingWeeks).toBe(1);
    expect(earned.trainingSessions).toBe(2);
    expect(earned.proactiveIncidents).toBe(1);
  });

  it("round-trips monthly totals to grid", () => {
    const earned = aggregateWeekGridToEarned(emptyWeekGrid(), 0, 0);
    earned.attendanceWeeks = 3;
    const grid = weekGridFromMonthlyEarned(earned);
    expect(grid.filter((w) => w.attendance).length).toBe(3);
  });
});

describe("getSaVariableCapWarning", () => {
  const base: SaMonthlyPayoutBreakdown = {
    employeeId: "e1",
    month: "2026-06",
    employmentType: "regular",
    baseSalary: 15_340,
    salesTotal: 0,
    achievementPct: 0,
    salesLevel: "NOT_HIT",
    salesCommission: 0,
    otPay: 0,
    complianceScore: 0,
    complianceTier: "NI",
    complianceCash: 0,
    complianceGc: 0,
    complianceRice: 0,
    complianceModifier: 0.5,
    storeGoalShare: 0,
    cashTotal: 15_340,
    nonCashTotal: 0,
  };

  it("returns null under cap", () => {
    expect(getSaVariableCapWarning({ ...base, salesCommission: 2000 })).toBeNull();
  });

  it("warns when variable cash exceeds cap", () => {
    const w = getSaVariableCapWarning({
      ...base,
      salesCommission: 2000,
      otPay: 2212.5,
      complianceCash: 2000,
    });
    expect(w).toContain("exceeds cap");
  });
});
