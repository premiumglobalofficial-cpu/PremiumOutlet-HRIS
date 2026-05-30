import { buildMonthlySaPayout } from "@/lib/sa-commission";
import { buildSaFullPictureRows } from "@/lib/sa-employee-payout-display";

describe("sa-employee-payout-display", () => {
  it("builds Kim-style full picture rows", () => {
    const b = buildMonthlySaPayout({
      employeeId: "kim",
      month: "2026-06",
      employmentType: "regular",
      salesTotal: 1_250_000,
      approvedOtHoursPerDay: Array(12).fill(2),
      complianceEarned: {
        attendanceWeeks: 4,
        groomingWeeks: 4,
        floorWeeks: 4,
        photoWeeks: 4,
        groupchatWeeks: 4,
        commitmentWeeks: 4,
        trainingSessions: 4,
        proactiveIncidents: 2,
        cashierWeeks: 4,
        highestSalesWins: 4,
      },
      complianceDeducted: {
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
      },
      storeGoalShare: 0,
    });

    const rows = buildSaFullPictureRows(b, {
      branchLabel: "POGRC (Mega Annex)",
      month: "June 2026",
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
  });
});
