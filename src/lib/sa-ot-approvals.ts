/**
 * SA OT approvals — derive payable hours from pre-approved logs (SAincentives.md).
 * Only approved + cash OT counts toward payroll. Offset OT is tracked but not paid in cash.
 */

import { computeSaOtPay, validateSaOtDay } from "@/lib/sa-commission";
import type { SaOtApproval } from "@/types";

/** Approved cash OT hours per day (sorted by date) for a yyyy-MM month */
export function approvedCashHoursForMonth(
  approvals: SaOtApproval[],
  month: string,
): number[] {
  return approvals
    .filter(
      (a) =>
        a.status === "approved" &&
        a.otType === "cash" &&
        a.date.startsWith(month),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => Math.min(2, Math.max(0, a.hours)));
}

/** OT pay from approval log; returns 0 if no approved cash entries */
export function computeOtPayFromApprovals(
  approvals: SaOtApproval[],
  month: string,
): number {
  const hours = approvedCashHoursForMonth(approvals, month);
  return hours.length > 0 ? computeSaOtPay(hours) : 0;
}

/**
 * Resolve hours for payout: prefer approved cash log when present, else manual entry.
 */
export function resolveOtHoursForPayout(
  approvals: SaOtApproval[],
  month: string,
  manualHoursPerDay: number[],
): number[] {
  const fromApprovals = approvedCashHoursForMonth(approvals, month);
  if (fromApprovals.length > 0) return fromApprovals;
  return manualHoursPerDay;
}

export function validateOtApprovalInput(
  date: string,
  hours: number,
  month: string,
): { ok: boolean; error?: string } {
  if (!date.startsWith(month)) {
    return { ok: false, error: "Date must be in selected month" };
  }
  return validateSaOtDay(hours);
}

export function monthlyOtApprovalSummary(approvals: SaOtApproval[], month: string) {
  const inMonth = approvals.filter((a) => a.date.startsWith(month));
  const approvedCash = inMonth.filter((a) => a.status === "approved" && a.otType === "cash");
  const approvedOffset = inMonth.filter((a) => a.status === "approved" && a.otType === "offset");
  const pending = inMonth.filter((a) => a.status === "pending");
  const totalCashHours = approvedCash.reduce((s, a) => s + Math.min(2, a.hours), 0);
  return {
    totalEntries: inMonth.length,
    pendingCount: pending.length,
    approvedCashCount: approvedCash.length,
    approvedOffsetCount: approvedOffset.length,
    totalCashHours,
    otPay: computeOtPayFromApprovals(approvals, month),
  };
}
