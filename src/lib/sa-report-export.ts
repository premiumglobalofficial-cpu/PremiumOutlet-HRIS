/**
 * SA month report CSV builders — HR export (Phase 3 lightweight).
 */

import { monthlyOtApprovalSummary } from "@/lib/sa-ot-approvals";
import type { SaMonthlyCycle, SaPayoutRecord } from "@/types";

function downloadCsv(filename: string, lines: string[]) {
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSaComplianceReport(
  cycle: SaMonthlyCycle,
  getName: (id: string) => string,
) {
  const lines = [
    "employee_id,name,compliance_score,tier,cash,gc,rice,sales_commission,ot_pay,store_goal",
    ...Object.keys(cycle.complianceEarned).map((empId) => {
      const p = cycle.payouts.find((x) => x.employeeId === empId);
      const b = p?.breakdown;
      return [
        empId,
        getName(empId),
        b?.complianceScore ?? 0,
        b?.complianceTier ?? "",
        b?.complianceCash ?? 0,
        b?.complianceGc ?? 0,
        b?.complianceRice ?? 0,
        b?.salesCommission ?? 0,
        b?.otPay ?? 0,
        b?.storeGoalShare ?? 0,
      ].join(",");
    }),
  ];
  downloadCsv(`sa-compliance-${cycle.month}-${cycle.branchId}.csv`, lines);
}

export function exportSaOtReport(cycle: SaMonthlyCycle, getName: (id: string) => string) {
  const lines = [
    "employee_id,name,date,hours,type,status,approved_by",
    ...Object.entries(cycle.otApprovalsByEmployee ?? {}).flatMap(([empId, list]) =>
      list
        .filter((a) => a.date.startsWith(cycle.month))
        .map((a) =>
          [empId, getName(empId), a.date, a.hours, a.otType, a.status, a.approvedBy ?? ""].join(
            ",",
          ),
        ),
    ),
  ];
  downloadCsv(`sa-ot-${cycle.month}-${cycle.branchId}.csv`, lines);
}

export function exportSaKpiRanking(cycle: SaMonthlyCycle, getName: (id: string) => string) {
  const rows = Object.entries(cycle.kpiByEmployee)
    .map(([empId, k]) => ({
      empId,
      name: getName(empId),
      revenue: k.revenue,
      units: k.unitsSold,
      shifts: k.shiftsWorked,
    }))
    .sort((a, b) => b.revenue - a.revenue);
  const lines = [
    "rank,employee_id,name,revenue,units_sold,shifts_worked",
    ...rows.map((r, i) =>
      [i + 1, r.empId, r.name, r.revenue, r.units, r.shifts].join(","),
    ),
  ];
  downloadCsv(`sa-kpi-ranking-${cycle.month}-${cycle.branchId}.csv`, lines);
}

export function exportSaStoreGoalDashboard(cycle: SaMonthlyCycle) {
  const lines = [
    "branch,month,branch_total_sales,goal_threshold,goal_hit,pool,sa_count",
    [
      cycle.branchId,
      cycle.month,
      cycle.branchTotalSales,
      6_000_000,
      cycle.branchTotalSales >= 6_000_000 ? "yes" : "no",
      cycle.branchTotalSales >= 6_000_000 ? 10_000 : 0,
      cycle.payouts.length,
    ].join(","),
  ];
  downloadCsv(`sa-store-goal-${cycle.month}-${cycle.branchId}.csv`, lines);
}

export function exportSaOtSummaryByEmployee(cycle: SaMonthlyCycle, getName: (id: string) => string) {
  const lines = [
    "employee_id,name,approved_cash_entries,total_cash_hours,ot_pay,pending_count",
    ...Object.entries(cycle.otApprovalsByEmployee ?? {}).map(([empId, list]) => {
      const s = monthlyOtApprovalSummary(list, cycle.month);
      return [
        empId,
        getName(empId),
        s.approvedCashCount,
        s.totalCashHours,
        s.otPay,
        s.pendingCount,
      ].join(",");
    }),
  ];
  downloadCsv(`sa-ot-summary-${cycle.month}-${cycle.branchId}.csv`, lines);
}

export function exportSaPayoutReport(payouts: SaPayoutRecord[], month: string, branchId: string) {
  const lines = [
    "employee_id,month,branch,status,sales_commission,ot_pay,compliance_cash,store_goal,cash_total,non_cash,tier",
    ...payouts.map((p) => {
      const b = p.breakdown;
      return [
        p.employeeId,
        p.month,
        p.branchId,
        p.status,
        b.salesCommission,
        b.otPay,
        b.complianceCash,
        b.storeGoalShare,
        b.cashTotal,
        b.nonCashTotal,
        b.complianceTier,
      ].join(",");
    }),
  ];
  downloadCsv(`sa-payout-report-${month}-${branchId}.csv`, lines);
}
