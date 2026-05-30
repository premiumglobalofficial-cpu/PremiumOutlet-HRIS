import { buildMonthlySaPayout } from "@/lib/sa-commission";
import {
  aggregateAdminSaStats,
  aggregateEmployeeSaStats,
  variableCashFromBreakdown,
} from "@/lib/sa-dashboard-stats";

describe("sa-dashboard-stats", () => {
  it("aggregates employee monthly and YTD stats", () => {
    const payout = {
      id: "p1",
      employeeId: "e1",
      month: "2026-06",
      branchId: "main",
      status: "draft" as const,
      breakdown: buildMonthlySaPayout({
        employeeId: "e1",
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
          highestSalesWins: 1,
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
      }),
    };

    const stats = aggregateEmployeeSaStats(
      "2026-06",
      payout,
      [
        {
          month: "2026-05",
          status: "processed",
          cashTotal: 20000,
          variableCash: 5000,
          complianceScore: 260,
          complianceTier: "GOLD",
          salesLevel: "EXCELLENT",
        },
      ],
      1_250_000,
      24,
    );

    expect(stats.hasData).toBe(true);
    expect(stats.complianceScore).toBe(290);
    expect(stats.ytdVariableCash).toBe(5000);
    expect(stats.monthlyTrend).toHaveLength(1);
    expect(variableCashFromBreakdown(payout.breakdown)).toBeGreaterThan(0);
  });

  it("aggregates admin branch stats", () => {
    const b = buildMonthlySaPayout({
      employeeId: "e1",
      month: "2026-06",
      employmentType: "regular",
      salesTotal: 900_000,
      approvedOtHoursPerDay: [],
      complianceEarned: {
        attendanceWeeks: 0,
        groomingWeeks: 0,
        floorWeeks: 0,
        photoWeeks: 0,
        groupchatWeeks: 0,
        commitmentWeeks: 0,
        trainingSessions: 0,
        proactiveIncidents: 0,
        cashierWeeks: 0,
        highestSalesWins: 0,
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

    const stats = aggregateAdminSaStats(
      "2026-06",
      "main",
      6_000_000,
      [
        { id: "p1", employeeId: "e1", month: "2026-06", branchId: "main", status: "draft", breakdown: b },
        {
          id: "p2",
          employeeId: "e2",
          month: "2026-06",
          branchId: "main",
          status: "approved",
          breakdown: { ...b, employeeId: "e2" },
        },
      ],
      { e1: "Kim", e2: "Alex" },
      2,
    );

    expect(stats.storeGoalHit).toBe(true);
    expect(stats.saCount).toBe(2);
    expect(stats.draftCount).toBe(1);
    expect(stats.approvedCount).toBe(1);
    expect(stats.pendingOtApprovals).toBe(2);
    expect(stats.topPerformers[0]?.name).toBeDefined();
  });
});
