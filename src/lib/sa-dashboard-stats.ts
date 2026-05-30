/**
 * SA incentives dashboard aggregations — pure helpers for employee & admin cards.
 */

import { toPayrollIncentiveAllowances, SA_STORE_GOAL_THRESHOLD } from "@/lib/sa-commission";
import { buildSaDisplayCashTotal } from "@/lib/sa-employee-payout-display";
import type { SaPayoutRecord } from "@/types";
import type { MySaIncentivesHistoryRow } from "@/services/sa-commission.service";

export type SaEmployeeDashboardStats = {
  month: string;
  hasData: boolean;
  status: "none" | "draft" | "approved" | "processed";
  variableCash: number;
  displayCashTotal: number;
  complianceScore: number;
  complianceTier: string;
  salesLevel: string;
  salesTotal: number;
  otHoursTotal: number;
  ytdVariableCash: number;
  ytdMonthsPaid: number;
  monthlyTrend: Array<{ month: string; label: string; variableCash: number }>;
};

export type SaAdminDashboardStats = {
  month: string;
  branchId: string;
  hasCycle: boolean;
  storeGoalHit: boolean;
  branchTotalSales: number;
  saCount: number;
  draftCount: number;
  approvedCount: number;
  processedCount: number;
  totalVariableCash: number;
  totalPayrollAddon: number;
  pendingOtApprovals: number;
  topPerformers: Array<{
    employeeId: string;
    name: string;
    variableCash: number;
    complianceTier: string;
    salesLevel: string;
    status: string;
  }>;
};

export function variableCashFromBreakdown(b: SaPayoutRecord["breakdown"]): number {
  return toPayrollIncentiveAllowances(b);
}

export function aggregateEmployeeSaStats(
  month: string,
  payout: SaPayoutRecord | null,
  history: MySaIncentivesHistoryRow[],
  salesTotal: number,
  otHoursTotal: number,
): SaEmployeeDashboardStats {
  const year = month.slice(0, 4);
  const ytdRows = history.filter(
    (h) => h.month.startsWith(year) && (h.status === "approved" || h.status === "processed"),
  );
  const ytdVariableCash = ytdRows.reduce((s, h) => s + h.variableCash, 0);

  const monthlyTrend = [...history]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map((h) => ({
      month: h.month,
      label: h.month.slice(5),
      variableCash: h.variableCash,
    }));

  if (!payout?.breakdown) {
    return {
      month,
      hasData: false,
      status: "none",
      variableCash: 0,
      displayCashTotal: 0,
      complianceScore: 0,
      complianceTier: "—",
      salesLevel: "—",
      salesTotal,
      otHoursTotal,
      ytdVariableCash,
      ytdMonthsPaid: ytdRows.length,
      monthlyTrend,
    };
  }

  const b = payout.breakdown;
  return {
    month,
    hasData: true,
    status: payout.status,
    variableCash: variableCashFromBreakdown(b),
    displayCashTotal: buildSaDisplayCashTotal(b),
    complianceScore: b.complianceScore,
    complianceTier: b.complianceTier,
    salesLevel: b.salesLevel.replace("_", " "),
    salesTotal,
    otHoursTotal,
    ytdVariableCash,
    ytdMonthsPaid: ytdRows.length,
    monthlyTrend,
  };
}

export function aggregateAdminSaStats(
  month: string,
  branchId: string,
  branchTotalSales: number,
  payouts: SaPayoutRecord[],
  employeeNames: Record<string, string>,
  pendingOtCount = 0,
): SaAdminDashboardStats {
  const withBreakdown = payouts.filter((p) => p.breakdown);
  const draftCount = withBreakdown.filter((p) => p.status === "draft").length;
  const approvedCount = withBreakdown.filter((p) => p.status === "approved").length;
  const processedCount = withBreakdown.filter((p) => p.status === "processed").length;

  const topPerformers = [...withBreakdown]
    .sort(
      (a, b) =>
        variableCashFromBreakdown(b.breakdown) - variableCashFromBreakdown(a.breakdown),
    )
    .slice(0, 5)
    .map((p) => ({
      employeeId: p.employeeId,
      name: employeeNames[p.employeeId] ?? p.employeeId,
      variableCash: variableCashFromBreakdown(p.breakdown),
      complianceTier: p.breakdown.complianceTier,
      salesLevel: p.breakdown.salesLevel.replace("_", " "),
      status: p.status,
    }));

  return {
    month,
    branchId,
    hasCycle: withBreakdown.length > 0 || branchTotalSales > 0,
    storeGoalHit: branchTotalSales >= SA_STORE_GOAL_THRESHOLD,
    branchTotalSales,
    saCount: withBreakdown.length,
    draftCount,
    approvedCount,
    processedCount,
    totalVariableCash: withBreakdown.reduce(
      (s, p) => s + variableCashFromBreakdown(p.breakdown),
      0,
    ),
    totalPayrollAddon: withBreakdown
      .filter((p) => p.status === "approved" || p.status === "processed")
      .reduce((s, p) => s + variableCashFromBreakdown(p.breakdown), 0),
    pendingOtApprovals: pendingOtCount,
    topPerformers,
  };
}
