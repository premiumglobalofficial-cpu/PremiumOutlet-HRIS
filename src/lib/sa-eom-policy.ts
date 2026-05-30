/**
 * SA Incentives EOM (2nd cutoff) policy — SAincentives.md v2.0
 *
 * Variable pay (commission, OT, compliance cash, store goal) is paid only on
 * end-of-month / 2nd semi-monthly cutoff. Mid-month runs pay base + statutory only.
 */

import { SA_BASE_SALARY, SA_MAX_OT_HOURS_PER_MONTH, SA_OT_RATE, type SaMonthlyPayoutBreakdown } from "@/lib/sa-commission";
import { round2 } from "@/lib/payroll-deductions";

/** Max OT pay per month: 24h × ₱92.19 */
export const SA_MAX_OT_PAY_MONTHLY = round2(SA_MAX_OT_HOURS_PER_MONTH * SA_OT_RATE);

/** Max base + variable cash (excludes store goal bonus per spec) */
export const SA_MAX_CASH_WITH_BASE = 21_452.5;

/** Max variable cash components excluding base and store goal */
export const SA_MAX_VARIABLE_CASH = round2(SA_MAX_CASH_WITH_BASE - SA_BASE_SALARY);

export type PayrollCutoff = "first" | "second";

/**
 * Whether this payroll run may include SA variable incentives.
 * - semi_monthly: 2nd cutoff only (EOM)
 * - monthly: always (single run = month end)
 * - weekly/bi_weekly: not via SA bridge in MVP
 */
export function isSaIncentiveEligibleCutoff(
  payFrequency: string,
  cutoff: PayrollCutoff,
): boolean {
  if (payFrequency === "monthly") return true;
  if (payFrequency === "semi_monthly") return cutoff === "second";
  return false;
}

export const SA_EOM_BLOCKED_REASON =
  "SA variable incentives apply on 2nd cutoff (EOM) only. Use 1st cutoff for base pay; approve SA payouts then run 2nd cutoff.";

/** Variable cash excluding store goal — warn if over ₱6,112.50 cap */
export function getSaVariableCashExclStoreGoal(b: SaMonthlyPayoutBreakdown): number {
  return round2(b.salesCommission + b.otPay + b.complianceCash);
}

export function getSaVariableCapWarning(b: SaMonthlyPayoutBreakdown): string | null {
  const variable = getSaVariableCashExclStoreGoal(b);
  if (variable > SA_MAX_VARIABLE_CASH) {
    return `Variable cash ₱${variable.toLocaleString()} exceeds cap ₱${SA_MAX_VARIABLE_CASH.toLocaleString()} (excludes store goal). Board review required.`;
  }
  return null;
}
