/**
 * Employee-facing SA incentive breakdown — "Full Picture" rows (Component / Amount / How).
 */

import { format, parse } from "date-fns";
import {
  SA_OT_RATE,
  SA_SALES_TARGET,
  SA_STORE_GOAL_POOL,
  SA_STORE_GOAL_THRESHOLD,
  type SaMonthlyPayoutBreakdown,
  type SaSalesLevel,
} from "@/lib/sa-commission";
import { round2 } from "@/lib/payroll-deductions";
import { formatCurrency } from "@/lib/format";

export type SaFullPictureRow = {
  component: string;
  amount: string;
  how: string;
  tone?: "default" | "incentive" | "storeGoal" | "total" | "nonCash";
};

export type SaFullPictureContext = {
  branchLabel: string;
  month: string;
  storeGoalHit: boolean;
  otHoursTotal: number;
};

function salesLevelLabel(level: SaSalesLevel): string {
  return level === "NOT_HIT" ? "NOT HIT" : level;
}

export function formatSaMonthLabel(month: string): string {
  try {
    return format(parse(`${month}-01`, "yyyy-MM-dd", new Date()), "MMMM yyyy");
  } catch {
    return month;
  }
}

/** Spec-aligned total: base + commission + OT + compliance cash + grocery GC (excludes rice & store goal). */
export function buildSaDisplayCashTotal(b: SaMonthlyPayoutBreakdown): number {
  return round2(
    b.baseSalary + b.salesCommission + b.otPay + b.complianceCash + b.complianceGc,
  );
}

/** Build Kim-style full picture table rows from an approved or draft breakdown. */
export function buildSaFullPictureRows(
  b: SaMonthlyPayoutBreakdown,
  ctx: SaFullPictureContext,
): SaFullPictureRow[] {
  const level = salesLevelLabel(b.salesLevel);
  const pct = Math.round(b.achievementPct);
  const displayTotal = buildSaDisplayCashTotal(b);

  const rows: SaFullPictureRow[] = [
    {
      component: "Base Salary",
      amount: formatCurrency(b.baseSalary),
      how: "Minimum wage. Fixed every month.",
    },
    {
      component: `Sales Target Commission  ${level} (${pct}%)`,
      amount: formatCurrency(b.salesCommission),
      how: `${formatCurrency(b.salesTotal)} ÷ ${formatCurrency(SA_SALES_TARGET)} = ${pct}%. ${level} tier.`,
      tone: b.salesCommission > 0 ? "incentive" : "default",
    },
    {
      component: `Overtime Pay — ${ctx.otHoursTotal} hrs total`,
      amount: formatCurrency(b.otPay),
      how: `${ctx.otHoursTotal} hrs x ₱${SA_OT_RATE.toFixed(2)}. Taken as cash.`,
      tone: b.otPay > 0 ? "incentive" : "default",
    },
    {
      component: `Compliance Cash Bonus — ${b.complianceTier} (${b.complianceScore} pts)`,
      amount: formatCurrency(b.complianceCash),
      how: `Scored ${b.complianceScore} pts. ${b.complianceTier} tier.`,
      tone: b.complianceCash > 0 ? "incentive" : "default",
    },
    {
      component: `Compliance Grocery GC — ${b.complianceTier}`,
      amount: b.complianceGc > 0 ? `${formatCurrency(b.complianceGc)} GC` : "—",
      how: "Non-cash. Grocery gift card.",
      tone: "nonCash",
    },
    {
      component: `Compliance 5kg Rice — ${b.complianceTier}`,
      amount: b.complianceRice > 0 ? "5kg Rice" : "—",
      how: b.complianceRice > 0 ? `Non-cash. Estimated value ${formatCurrency(b.complianceRice)}.` : "Non-cash reward.",
      tone: "nonCash",
    },
    {
      component: ctx.storeGoalHit
        ? `Store Goal Bonus Share — branch hit ${formatCurrency(SA_STORE_GOAL_THRESHOLD)}`
        : "Store Goal Bonus Share",
      amount:
        b.storeGoalShare > 0
          ? formatCurrency(b.storeGoalShare)
          : ctx.storeGoalHit
            ? `Share of ${formatCurrency(SA_STORE_GOAL_POOL)}`
            : "—",
      how: ctx.storeGoalHit
        ? "Exact amount varies by individual rank vs team. Calculated separately."
        : `Branch must hit ${formatCurrency(SA_STORE_GOAL_THRESHOLD)} goal to unlock ${formatCurrency(SA_STORE_GOAL_POOL)} pool.`,
      tone: "storeGoal",
    },
    {
      component: "TOTAL CASH + SALARY",
      amount: formatCurrency(displayTotal),
      how: ctx.storeGoalHit
        ? "Plus store goal bonus share on top."
        : "Base salary plus commission, OT, and compliance cash rewards.",
      tone: "total",
    },
  ];

  return rows;
}

export function buildSaFullPictureContextLine(
  ctx: SaFullPictureContext,
  employeeName: string,
  salesTotal: number,
  complianceScore: number,
  complianceTier: string,
): string {
  const firstName = employeeName.trim().split(/\s+/)[0] || employeeName;
  const goal = ctx.storeGoalHit ? "Store hit P6M goal" : "Store goal pending";
  return (
    `Branch: ${ctx.branchLabel}. Month: ${formatSaMonthLabel(ctx.month)}. ${goal}. ` +
    `${firstName}'s sales: ${formatCurrency(salesTotal)}. ` +
    `Compliance score: ${complianceScore} pts (${complianceTier}). OT worked: ${ctx.otHoursTotal} hrs.`
  );
}
