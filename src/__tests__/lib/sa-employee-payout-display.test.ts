import { buildMonthlySaPayout, SA_OT_RATE } from "@/lib/sa-commission";
import {
  buildSaDisplayCashTotal,
  buildSaFullPictureContextLine,
  buildSaFullPictureRows,
  formatSaMonthLabel,
} from "@/lib/sa-employee-payout-display";

describe("sa-employee-payout-display", () => {
  const kimEarned = {
    attendanceWeeks: 4,
    groomingWeeks: 4,
    floorWeeks: 4,
    photoWeeks: 4,
    groupchatWeeks: 4,
    commitmentWeeks: 4,
    trainingSessions: 4,
    proactiveIncidents: 2,
    cashierWeeks: 4,
    highestSalesWins: 1,
  };

  const kimDeducted = {
    lateArrival: 0,
    hairViolation: 0,
    uniformViolation: 0,
    zoneUncovered: 0,
    noGreeting: 0,
    phoneUse: 0,
    photoMissed: 0,
    groupchatMissed: 0,
    missedTraining: 0,
    lateKpiReport: 0,
    repeatedViolation: 0,
    cashShortage: 0,
    counterUnattended: 0,
  };

  it("formats month label for display", () => {
    expect(formatSaMonthLabel("2026-06")).toBe("June 2026");
  });

  it("builds Kim-style full picture rows and spec total", () => {
    const b = buildMonthlySaPayout({
      employeeId: "kim",
      month: "2026-06",
      employmentType: "regular",
      salesTotal: 1_250_000,
      approvedOtHoursPerDay: Array(12).fill(2),
      complianceEarned: kimEarned,
      complianceDeducted: kimDeducted,
      storeGoalShare: 0,
    });

    expect(b.complianceScore).toBe(290);
    expect(b.complianceTier).toBe("GOLD");
    expect(b.otPay).toBeCloseTo(24 * SA_OT_RATE, 2);
    expect(buildSaDisplayCashTotal(b)).toBeCloseTo(20_552.5, 0);

    const rows = buildSaFullPictureRows(b, {
      branchLabel: "POGRC (Mega Annex)",
      month: "2026-06",
      storeGoalHit: true,
      otHoursTotal: 24,
    });

    expect(rows[0].component).toBe("Base Salary");
    expect(rows[1].component).toContain("EXCELLENT");
    expect(rows[1].component).toContain("125%");
    expect(rows[2].component).toContain("24 hrs");
    expect(rows[2].how).toMatch(/92\.19/);
    expect(rows[3].component).toContain("GOLD");
    expect(rows[rows.length - 1].component).toBe("TOTAL CASH + SALARY");
    expect(rows[rows.length - 1].how).toContain("store goal bonus share");
  });

  it("builds Kim-style context line", () => {
    const line = buildSaFullPictureContextLine(
      {
        branchLabel: "POGRC (Mega Annex)",
        month: "2026-06",
        storeGoalHit: true,
        otHoursTotal: 24,
      },
      "Kim Santos",
      1_250_000,
      290,
      "GOLD",
    );
    expect(line).toContain("POGRC (Mega Annex)");
    expect(line).toContain("June 2026");
    expect(line).toContain("Store hit P6M goal");
    expect(line).toContain("Kim's sales");
    expect(line).toContain("290 pts (GOLD)");
    expect(line).toContain("OT worked: 24 hrs");
  });
});
