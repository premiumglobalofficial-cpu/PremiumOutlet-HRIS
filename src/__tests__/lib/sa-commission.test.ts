import {
  SA_OT_RATE,
  SA_STORE_GOAL_POOL,
  assignSalesLevel,
  buildMonthlySaPayout,
  commissionForLevel,
  computeAchievementPct,
  computeComplianceScore,
  computeMedian,
  computePaidHours,
  computeSaOtPay,
  computeSalesCommission,
  computeStoreGoalPool,
  getSaComponentEligibility,
  kpiMultiplierFromRatio,
  toPayrollIncentiveAllowances,
  validateHighestSalesWinners,
  validateSaOtDay,
  type SaComplianceDeducted,
  type SaComplianceEarned,
  type SaKpiInput,
} from "@/lib/sa-commission";

const emptyEarned = (): SaComplianceEarned => ({
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
});

const emptyDeducted = (): SaComplianceDeducted => ({
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
});

describe("SA sales commission", () => {
  it("returns 0 commission below 90% achievement", () => {
    const r = computeSalesCommission(899_999);
    expect(r.commission).toBe(0);
    expect(r.level).toBe("NOT_HIT");
  });

  it("returns 1000 at exactly 1M sales (GREAT)", () => {
    const r = computeSalesCommission(1_000_000);
    expect(r.achievementPct).toBe(100);
    expect(r.level).toBe("GREAT");
    expect(r.commission).toBe(1000);
  });

  it("returns 2000 at 1.5M+ sales (STAR)", () => {
    expect(computeSalesCommission(1_500_000).commission).toBe(2000);
    expect(assignSalesLevel(150)).toBe("STAR");
    expect(commissionForLevel("STAR")).toBe(2000);
  });
});

describe("SA OT pay", () => {
  it("caps OT at 2 hours per day", () => {
    expect(computeSaOtPay([3, 1])).toBeCloseTo(3 * SA_OT_RATE, 2);
    expect(validateSaOtDay(3).ok).toBe(false);
    expect(validateSaOtDay(2).ok).toBe(true);
  });
});

describe("SA compliance", () => {
  it("assigns GOLD tier at 260+", () => {
    const earned: SaComplianceEarned = {
      ...emptyEarned(),
      attendanceWeeks: 4,
      groomingWeeks: 4,
      floorWeeks: 4,
      photoWeeks: 4,
      groupchatWeeks: 4,
      commitmentWeeks: 4,
      cashierWeeks: 4,
      highestSalesWins: 1,
    };
    const r = computeComplianceScore(earned, emptyDeducted());
    expect(r.score).toBeGreaterThanOrEqual(260);
    expect(r.tier).toBe("GOLD");
    expect(r.cash).toBe(1000);
    expect(r.modifier).toBe(1.0);
  });

  it("clamps score between 0 and 360", () => {
    const r = computeComplianceScore(emptyEarned(), {
      ...emptyDeducted(),
      lateArrival: 100,
    });
    expect(r.score).toBe(0);
  });

  it("enforces one highest_sales_wins per branch per week", () => {
    const v = validateHighestSalesWinners([
      { branchId: "b1", weekKey: "2026-06-W1", employeeId: "e1" },
      { branchId: "b1", weekKey: "2026-06-W1", employeeId: "e2" },
    ]);
    expect(v.ok).toBe(false);
  });
});

describe("SA store goal pool", () => {
  const baseKpi = (id: string, perShift: number): SaKpiInput => ({
    employeeId: id,
    unitsSold: 10,
    revenue: perShift * 5000 * 5,
    upsells: 0,
    commendations: 0,
    complaints: 0,
    shiftsWorked: 5,
    complianceModifier: 1,
    employmentType: "regular",
  });

  it("returns 0 when branch misses 6M goal", () => {
    const shares = computeStoreGoalPool(5_999_999, [
      baseKpi("e1", 10),
    ]);
    expect(shares.get("e1")).toBe(0);
  });

  it("gives 100% pool to sole eligible SA", () => {
    const shares = computeStoreGoalPool(6_000_000, [baseKpi("e1", 10)]);
    expect(shares.get("e1")).toBe(SA_STORE_GOAL_POOL);
  });

  it("distributes pool across multiple SAs", () => {
    const shares = computeStoreGoalPool(6_000_000, [
      baseKpi("e1", 20),
      baseKpi("e2", 5),
    ]);
    const total = [...shares.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(SA_STORE_GOAL_POOL, 0);
  });
});

describe("SA employment eligibility", () => {
  it("trainee gets no incentives", () => {
    const e = getSaComponentEligibility("trainee");
    expect(e.salesCommission).toBe(false);
    expect(e.otPay).toBe(false);
  });

  it("probationary gets commission and OT only", () => {
    const e = getSaComponentEligibility("probationary");
    expect(e.salesCommission).toBe(true);
    expect(e.complianceCash).toBe(false);
  });
});

describe("SA grand total & payroll bridge", () => {
  it("builds full payout for regular SA", () => {
    const payout = buildMonthlySaPayout({
      employeeId: "e1",
      month: "2026-06",
      employmentType: "regular",
      salesTotal: 1_000_000,
      approvedOtHoursPerDay: [2],
      complianceEarned: {
        ...emptyEarned(),
        attendanceWeeks: 4,
        groomingWeeks: 4,
        floorWeeks: 4,
        commitmentWeeks: 4,
        cashierWeeks: 4,
      },
      complianceDeducted: emptyDeducted(),
      storeGoalShare: 500,
    });
    expect(payout.salesCommission).toBe(1000);
    expect(payout.otPay).toBeCloseTo(2 * SA_OT_RATE, 2);
    expect(payout.cashTotal).toBeGreaterThan(15_340);
    const allowances = toPayrollIncentiveAllowances(payout);
    expect(allowances).toBe(
      payout.salesCommission +
        payout.otPay +
        payout.complianceCash +
        payout.storeGoalShare,
    );
  });

  it("trainee payout has zero incentives", () => {
    const payout = buildMonthlySaPayout({
      employeeId: "e1",
      month: "2026-06",
      employmentType: "trainee",
      salesTotal: 2_000_000,
      approvedOtHoursPerDay: [2],
      complianceEarned: emptyEarned(),
      complianceDeducted: emptyDeducted(),
      storeGoalShare: 10_000,
    });
    expect(payout.salesCommission).toBe(0);
    expect(payout.otPay).toBe(0);
    expect(payout.storeGoalShare).toBe(0);
    expect(toPayrollIncentiveAllowances(payout)).toBe(0);
  });
});

describe("helpers", () => {
  it("computes median for even count", () => {
    expect(computeMedian([1, 2, 3, 4])).toBe(2.5);
  });

  it("kpi multiplier tiers", () => {
    expect(kpiMultiplierFromRatio(1.3)).toBe(1.8);
    expect(kpiMultiplierFromRatio(0.5)).toBe(0.35);
  });

  it("paid hours subtract break when taken", () => {
    expect(computePaidHours(8, 60, false)).toBe(7);
    expect(computePaidHours(8, 60, true)).toBe(8);
  });

  it("achievement pct", () => {
    expect(computeAchievementPct(500_000)).toBe(50);
  });
});
