/**
 * SA Commission & Points Engine — Premium Outlets (POGRC Dev Brief, June 2026)
 *
 * Pure functions only (no I/O). Used by store, payroll UI, and tests.
 */

import { round2 } from "@/lib/payroll-deductions";

// ─── Constants (from Dev Brief) ───────────────────────────────────────────

export const SA_SALES_TARGET = 1_000_000;
export const SA_STORE_GOAL_THRESHOLD = 6_000_000;
export const SA_STORE_GOAL_POOL = 10_000;
export const SA_BASE_SALARY = 15_340;
export const SA_DAILY_RATE = 590;
export const SA_STANDARD_HOURS_PER_DAY = 8;
export const SA_HOURLY_RATE = round2(SA_DAILY_RATE / SA_STANDARD_HOURS_PER_DAY);
export const SA_OT_RATE = round2(SA_HOURLY_RATE * 1.25);
export const SA_MAX_OT_HOURS_PER_DAY = 2;
export const SA_MAX_COMPLIANCE_SCORE = 360;
export const SA_MAX_WEEKS_PER_MONTH = 4;
export const SA_BREAK_MINUTES_PER_SHIFT = 60;

export type SaEmploymentType = "trainee" | "probationary" | "regular" | "oic";
export type SaOtType = "cash" | "offset";
export type SaComplianceTier = "GOLD" | "SILVER" | "BRONZE" | "NI";
export type SaSalesLevel = "NOT_HIT" | "GOOD" | "GREAT" | "EXCELLENT" | "STAR";
export type SaPayoutStatus = "draft" | "approved" | "processed";

export interface SaComplianceEarned {
  attendanceWeeks: number;
  groomingWeeks: number;
  floorWeeks: number;
  photoWeeks: number;
  groupchatWeeks: number;
  commitmentWeeks: number;
  trainingSessions: number;
  proactiveIncidents: number;
  cashierWeeks: number;
  highestSalesWins: number;
}

export interface SaComplianceDeducted {
  lateArrival: number;
  hairViolation: number;
  uniformViolation: number;
  zoneUncovered: number;
  noGreeting: number;
  phoneUse: number;
  photoMissed: number;
  groupchatMissed: number;
  missedTraining: number;
  lateKpiReport: number;
  repeatedViolation: number;
  cashShortage: number;
  counterUnattended: number;
}

export interface SaKpiInput {
  employeeId: string;
  unitsSold: number;
  revenue: number;
  upsells: number;
  commendations: number;
  complaints: number;
  shiftsWorked: number;
  complianceModifier: number;
  employmentType: SaEmploymentType;
}

export interface SaMonthlyPayoutBreakdown {
  employeeId: string;
  month: string;
  employmentType: SaEmploymentType;
  baseSalary: number;
  salesTotal: number;
  achievementPct: number;
  salesLevel: SaSalesLevel;
  salesCommission: number;
  otPay: number;
  complianceScore: number;
  complianceTier: SaComplianceTier;
  complianceCash: number;
  complianceGc: number;
  complianceRice: number;
  complianceModifier: number;
  storeGoalShare: number;
  cashTotal: number;
  nonCashTotal: number;
}

// ─── Eligibility ────────────────────────────────────────────────────────────

export interface SaComponentEligibility {
  salesCommission: boolean;
  otPay: boolean;
  complianceCash: boolean;
  storeGoalShare: boolean;
}

export function getSaComponentEligibility(
  employmentType: SaEmploymentType,
): SaComponentEligibility {
  switch (employmentType) {
    case "trainee":
      return {
        salesCommission: false,
        otPay: false,
        complianceCash: false,
        storeGoalShare: false,
      };
    case "probationary":
      return {
        salesCommission: true,
        otPay: true,
        complianceCash: false,
        storeGoalShare: false,
      };
    case "oic":
      return {
        salesCommission: false,
        otPay: false,
        complianceCash: false,
        storeGoalShare: false,
      };
    case "regular":
    default:
      return {
        salesCommission: true,
        otPay: true,
        complianceCash: true,
        storeGoalShare: true,
      };
  }
}

// ─── 2A Sales Commission ──────────────────────────────────────────────────

export function computeAchievementPct(salesTotal: number): number {
  if (!Number.isFinite(salesTotal) || salesTotal <= 0) return 0;
  return round2((salesTotal / SA_SALES_TARGET) * 100);
}

export function assignSalesLevel(achievementPct: number): SaSalesLevel {
  // Use raw ratio for tier boundaries (avoid round2 pushing 89.999% → 90%)
  if (achievementPct < 90) return "NOT_HIT";
  if (achievementPct < 100) return "GOOD";
  if (achievementPct < 120) return "GREAT";
  if (achievementPct < 150) return "EXCELLENT";
  return "STAR";
}

function rawAchievementPct(salesTotal: number): number {
  if (!Number.isFinite(salesTotal) || salesTotal <= 0) return 0;
  return (salesTotal / SA_SALES_TARGET) * 100;
}

export function commissionForLevel(level: SaSalesLevel): number {
  switch (level) {
    case "NOT_HIT":
      return 0;
    case "GOOD":
      return 500;
    case "GREAT":
      return 1000;
    case "EXCELLENT":
      return 1500;
    case "STAR":
      return 2000;
    default:
      return 0;
  }
}

export function computeSalesCommission(salesTotal: number): {
  achievementPct: number;
  level: SaSalesLevel;
  commission: number;
} {
  const achievementPct = computeAchievementPct(salesTotal);
  const level = assignSalesLevel(rawAchievementPct(salesTotal));
  return {
    achievementPct,
    level,
    commission: commissionForLevel(level),
  };
}

// ─── 2B OT Pay ────────────────────────────────────────────────────────────

export function capOtHoursForDay(hours: number): number {
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Math.min(hours, SA_MAX_OT_HOURS_PER_DAY);
}

export function validateSaOtDay(hours: number): { ok: boolean; error?: string } {
  if (!Number.isFinite(hours) || hours < 0) {
    return { ok: false, error: "Invalid OT hours" };
  }
  if (hours > SA_MAX_OT_HOURS_PER_DAY) {
    return {
      ok: false,
      error: `Max ${SA_MAX_OT_HOURS_PER_DAY} OT hours per day`,
    };
  }
  return { ok: true };
}

/** Sum approved OT hours per day (each day capped at 2h) × ot_rate */
export function computeSaOtPay(approvedHoursPerDay: number[]): number {
  if (!approvedHoursPerDay.length) return 0;
  const totalHours = approvedHoursPerDay.reduce(
    (sum, h) => sum + capOtHoursForDay(h),
    0,
  );
  return round2(totalHours * SA_OT_RATE);
}

// ─── 2C Compliance ──────────────────────────────────────────────────────────

function capWeeks(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, SA_MAX_WEEKS_PER_MONTH);
}

export function computeComplianceEarned(e: SaComplianceEarned): number {
  return (
    capWeeks(e.attendanceWeeks) * 10 +
    capWeeks(e.groomingWeeks) * 10 +
    capWeeks(e.floorWeeks) * 10 +
    capWeeks(e.photoWeeks) * 5 +
    capWeeks(e.groupchatWeeks) * 5 +
    capWeeks(e.commitmentWeeks) * 10 +
    Math.max(0, e.trainingSessions) * 5 +
    Math.max(0, e.proactiveIncidents) * 5 +
    capWeeks(e.cashierWeeks) * 10 +
    capWeeks(e.highestSalesWins) * 20
  );
}

export function computeComplianceDeducted(d: SaComplianceDeducted): number {
  return (
    Math.max(0, d.lateArrival) * 5 +
    Math.max(0, d.hairViolation) * 5 +
    Math.max(0, d.uniformViolation) * 5 +
    Math.max(0, d.zoneUncovered) * 10 +
    Math.max(0, d.noGreeting) * 5 +
    Math.max(0, d.phoneUse) * 5 +
    Math.max(0, d.photoMissed) * 5 +
    Math.max(0, d.groupchatMissed) * 5 +
    Math.max(0, d.missedTraining) * 10 +
    Math.max(0, d.lateKpiReport) * 5 +
    Math.max(0, d.repeatedViolation) * 10 +
    Math.max(0, d.cashShortage) * 10 +
    Math.max(0, d.counterUnattended) * 10
  );
}

export function clampComplianceScore(raw: number): number {
  return Math.max(0, Math.min(SA_MAX_COMPLIANCE_SCORE, Math.round(raw)));
}

export interface ComplianceTierResult {
  tier: SaComplianceTier;
  cash: number;
  gc: number;
  rice: number;
  modifier: number;
}

export function assignComplianceTier(score: number): ComplianceTierResult {
  if (score >= 260) {
    return { tier: "GOLD", cash: 1000, gc: 500, rice: 400, modifier: 1.0 };
  }
  if (score >= 200) {
    return { tier: "SILVER", cash: 0, gc: 500, rice: 0, modifier: 1.0 };
  }
  if (score >= 140) {
    return { tier: "BRONZE", cash: 0, gc: 0, rice: 0, modifier: 0.8 };
  }
  return { tier: "NI", cash: 0, gc: 0, rice: 0, modifier: 0.5 };
}

export function computeComplianceScore(
  earned: SaComplianceEarned,
  deducted: SaComplianceDeducted,
): { score: number; earnedPoints: number; deductedPoints: number } & ComplianceTierResult {
  const earnedPoints = computeComplianceEarned(earned);
  const deductedPoints = computeComplianceDeducted(deducted);
  const score = clampComplianceScore(earnedPoints - deductedPoints);
  const tier = assignComplianceTier(score);
  return { score, earnedPoints, deductedPoints, ...tier };
}

/** One winner per branch per week for highest_sales_wins */
export function validateHighestSalesWinners(
  winners: Array<{ branchId: string; weekKey: string; employeeId: string }>,
): { ok: boolean; error?: string } {
  const seen = new Set<string>();
  for (const w of winners) {
    const key = `${w.branchId}:${w.weekKey}`;
    if (seen.has(key)) {
      return {
        ok: false,
        error: `Only one highest_sales_wins per branch per week (${key})`,
      };
    }
    seen.add(key);
  }
  return { ok: true };
}

// ─── 2D Store Goal ──────────────────────────────────────────────────────────

export function computeKpiRaw(input: Omit<SaKpiInput, "employeeId" | "complianceModifier" | "employmentType">): number {
  const units = Math.max(0, input.unitsSold);
  const revenueBlocks = Math.floor(Math.max(0, input.revenue) / 5000);
  const upsells = Math.max(0, input.upsells);
  const commendations = Math.max(0, input.commendations);
  const complaints = Math.max(0, input.complaints);
  return units * 1 + revenueBlocks * 3 + upsells * 2 + commendations * 5 - complaints * 5;
}

export function computeKpiPerShift(kpiRaw: number, shiftsWorked: number): number {
  if (!Number.isFinite(shiftsWorked) || shiftsWorked <= 0) return 0;
  return kpiRaw / shiftsWorked;
}

export function computeMedian(values: number[]): number {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function kpiMultiplierFromRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0.35;
  if (ratio >= 1.3) return 1.8;
  if (ratio >= 1.1) return 1.4;
  if (ratio >= 0.85) return 1.0;
  if (ratio >= 0.65) return 0.65;
  return 0.35;
}

export function computeStoreGoalPool(
  branchTotalSales: number,
  eligibleSas: SaKpiInput[],
): Map<string, number> {
  const shares = new Map<string, number>();
  if (branchTotalSales < SA_STORE_GOAL_THRESHOLD) {
    for (const sa of eligibleSas) shares.set(sa.employeeId, 0);
    return shares;
  }

  const poolEligible = eligibleSas.filter(
    (sa) => sa.employmentType === "regular" && sa.shiftsWorked > 0,
  );

  if (poolEligible.length === 0) {
    for (const sa of eligibleSas) shares.set(sa.employeeId, 0);
    return shares;
  }

  if (poolEligible.length === 1) {
    for (const sa of eligibleSas) {
      shares.set(
        sa.employeeId,
        sa.employeeId === poolEligible[0].employeeId ? SA_STORE_GOAL_POOL : 0,
      );
    }
    return shares;
  }

  const perShiftScores = poolEligible.map((sa) => {
    const raw = computeKpiRaw(sa);
    return computeKpiPerShift(raw, sa.shiftsWorked);
  });
  const median = computeMedian(perShiftScores);

  const weights = poolEligible.map((sa, i) => {
    const perShift = perShiftScores[i];
    const ratio = median > 0 ? perShift / median : 0;
    const kpiMult = kpiMultiplierFromRatio(ratio);
    return kpiMult * sa.complianceModifier;
  });

  const totalWeight = weights.reduce((s, w) => s + w, 0);

  for (const sa of eligibleSas) {
    if (sa.employmentType !== "regular" || sa.shiftsWorked <= 0) {
      shares.set(sa.employeeId, 0);
      continue;
    }
    const idx = poolEligible.findIndex((p) => p.employeeId === sa.employeeId);
    if (idx < 0 || totalWeight <= 0) {
      shares.set(sa.employeeId, 0);
      continue;
    }
    shares.set(
      sa.employeeId,
      round2((weights[idx] / totalWeight) * SA_STORE_GOAL_POOL),
    );
  }

  return shares;
}

// ─── Break / paid hours ─────────────────────────────────────────────────────

export function computePaidHours(
  totalShiftHours: number,
  breakMinutesTaken: number,
  workedThroughBreak: boolean,
): number {
  if (!Number.isFinite(totalShiftHours) || totalShiftHours <= 0) return 0;
  if (workedThroughBreak) return round2(totalShiftHours);
  const breakHours = Math.min(
    Math.max(0, breakMinutesTaken),
    SA_BREAK_MINUTES_PER_SHIFT,
  ) / 60;
  return round2(Math.max(0, totalShiftHours - breakHours));
}

// ─── Grand total ────────────────────────────────────────────────────────────

export interface BuildSaPayoutInput {
  employeeId: string;
  month: string;
  employmentType: SaEmploymentType;
  salesTotal: number;
  approvedOtHoursPerDay: number[];
  complianceEarned: SaComplianceEarned;
  complianceDeducted: SaComplianceDeducted;
  storeGoalShare: number;
  baseSalary?: number;
}

export function buildMonthlySaPayout(input: BuildSaPayoutInput): SaMonthlyPayoutBreakdown {
  const eligibility = getSaComponentEligibility(input.employmentType);
  const baseSalary =
    input.baseSalary ??
    (input.employmentType === "regular" || input.employmentType === "probationary"
      ? SA_BASE_SALARY
      : 0);

  const sales = computeSalesCommission(input.salesTotal);
  const salesCommission = eligibility.salesCommission ? sales.commission : 0;

  const otPay = eligibility.otPay
    ? computeSaOtPay(input.approvedOtHoursPerDay)
    : 0;

  const compliance = computeComplianceScore(
    input.complianceEarned,
    input.complianceDeducted,
  );
  const complianceCash = eligibility.complianceCash ? compliance.cash : 0;
  const complianceGc = eligibility.complianceCash ? compliance.gc : 0;
  const complianceRice = eligibility.complianceCash ? compliance.rice : 0;

  const storeGoalShare = eligibility.storeGoalShare ? input.storeGoalShare : 0;

  const cashTotal = round2(
    baseSalary + salesCommission + otPay + complianceCash + storeGoalShare,
  );
  const nonCashTotal = round2(complianceGc + complianceRice);

  return {
    employeeId: input.employeeId,
    month: input.month,
    employmentType: input.employmentType,
    baseSalary,
    salesTotal: input.salesTotal,
    achievementPct: sales.achievementPct,
    salesLevel: sales.level,
    salesCommission,
    otPay,
    complianceScore: compliance.score,
    complianceTier: compliance.tier,
    complianceCash,
    complianceGc,
    complianceRice,
    complianceModifier: compliance.modifier,
    storeGoalShare,
    cashTotal,
    nonCashTotal,
  };
}

/** Cash incentives only — for payslip allowances (excludes base salary) */
export function toPayrollIncentiveAllowances(
  breakdown: SaMonthlyPayoutBreakdown,
): number {
  return round2(
    breakdown.salesCommission +
      breakdown.otPay +
      breakdown.complianceCash +
      breakdown.storeGoalShare,
  );
}
