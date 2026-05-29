import { toPayrollIncentiveAllowances } from "@/lib/sa-commission";
import type { SaPayoutRecord } from "@/types";

/**
 * Approved SA cash incentives for a payslip period (yyyy-MM).
 * Returns 0 if no approved payout exists for that month.
 */
export function getApprovedSaIncentiveAllowances(
  payouts: SaPayoutRecord[],
  month: string,
  employeeId: string,
): { amount: number; payout: SaPayoutRecord | null; note: string } {
  const approved = payouts.find(
    (p) =>
      p.employeeId === employeeId &&
      p.month === month &&
      p.status === "approved",
  );
  if (!approved) {
    return { amount: 0, payout: null, note: "" };
  }
  const amount = toPayrollIncentiveAllowances(approved.breakdown);
  const b = approved.breakdown;
  const note = [
    `SA incentives ₱${amount.toLocaleString()}`,
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
