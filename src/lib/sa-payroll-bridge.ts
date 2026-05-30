import { toPayrollIncentiveAllowances } from "@/lib/sa-commission";
import {
  isSaIncentiveEligibleCutoff,
  SA_EOM_BLOCKED_REASON,
  type PayrollCutoff,
} from "@/lib/sa-eom-policy";
import type { SaPayoutRecord } from "@/types";

export type SaPayrollBridgeOptions = {
  /** Semi-monthly cutoff for this payslip run */
  cutoff?: PayrollCutoff;
  /** Employee pay frequency (default semi_monthly) */
  payFrequency?: string;
};

export type SaIncentiveAllowanceResult = {
  amount: number;
  payout: SaPayoutRecord | null;
  note: string;
  /** Set when payout exists but cutoff blocks variable pay (EOM rule) */
  blockedReason?: string;
};

/**
 * Approved SA cash incentives for a payslip period (yyyy-MM).
 * Returns 0 if no approved payout, or if cutoff is not EOM-eligible.
 */
export function getApprovedSaIncentiveAllowances(
  payouts: SaPayoutRecord[],
  month: string,
  employeeId: string,
  options: SaPayrollBridgeOptions = {},
): SaIncentiveAllowanceResult {
  const payFrequency = options.payFrequency ?? "semi_monthly";
  const cutoff = options.cutoff ?? "second";
  const eomEligible = isSaIncentiveEligibleCutoff(payFrequency, cutoff);

  const approved = payouts.find(
    (p) =>
      p.employeeId === employeeId &&
      p.month === month &&
      p.status === "approved",
  );

  if (!approved) {
    return { amount: 0, payout: null, note: "" };
  }

  if (!eomEligible) {
    return {
      amount: 0,
      payout: approved,
      note: "",
      blockedReason: SA_EOM_BLOCKED_REASON,
    };
  }

  const amount = toPayrollIncentiveAllowances(approved.breakdown);
  const b = approved.breakdown;
  const note = [
    `SA incentives ₱${amount.toLocaleString()} (EOM)`,
    b.salesCommission ? `sales ₱${b.salesCommission}` : "",
    b.otPay ? `OT ₱${b.otPay}` : "",
    b.complianceCash ? `compliance ₱${b.complianceCash}` : "",
    b.storeGoalShare ? `store goal ₱${b.storeGoalShare}` : "",
    b.nonCashTotal > 0 ? `(non-cash GC/rice ₱${b.nonCashTotal} — HR handoff)` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return { amount, payout: approved, note };
}

/**
 * SA track already includes OT in incentive allowances — do not also add wizard OT hours.
 */
export function resolvePayrollOvertimeForSa(
  saIncentiveApplied: boolean,
  formOtHours: number,
  hourlyRate: number,
): { otPay: number; skipFormOt: boolean } {
  if (saIncentiveApplied) {
    return { otPay: 0, skipFormOt: true };
  }
  return {
    otPay: Math.round(formOtHours * hourlyRate * 1.25),
    skipFormOt: false,
  };
}
