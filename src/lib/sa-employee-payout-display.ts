/**
 * Employee-facing SA incentive breakdown — "Full Picture" rows (Component / Amount / How).
 */

import {
  SA_OT_RATE,
  SA_SALES_TARGET,
  SA_STORE_GOAL_POOL,
  SA_STORE_GOAL_THRESHOLD,
  type SaMonthlyPayoutBreakdown,
  type SaSalesLevel,
} from "@/lib/sa-commission";
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

function formatSalesAmount(n: number): string {
  return formatCurrency(n);
}

/** Build Kim-style full picture table rows from an approved or draft breakdown. */
export function buildSaFullPictureRows(
  b: SaMonthlyPayoutBreakdown,
  ctx: SaFullPictureContext,
): SaFullPictureRow[] {
  const level = salesLevelLabel(b.salesLevel);
  const pct = Math.round(b.achievementPct);

  const rows: SaFullPictureRow[] = [
    {
      component: "Base Salary",
      amount: formatCurrency(b.baseSalary),
      how: "Minimum wage. Fixed every month.",
    },
    {
      component: `Sales Target Commission ${level} (${pct}%)`,
      amount: formatCurrency(b.salesCommission),
      how: `${formatCurrency(b.salesTotal)} ÷ ${formatCurrency(SA_SALES_TARGET)} = ${pct}%. ${level} tier.`,
      tone: b.salesCommission > 0 ? "incentive" : "default",
    },
    {
      component: `Overtime Pay — ${ctx.otHoursTotal} hrs total`,
      amount: formatCurrency(b.otPay),
      how: `${ctx.otHoursTotal} hrs × ₱${SA_OT_RATE.toFixed(2)}. Taken as cash.`,
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
      amount: formatCurrency(b.cashTotal),
      how: ctx.storeGoalHit && b.storeGoalShare === 0
        ? "Plus store goal bonus share on top."
        : "Base salary plus all cash incentive components above.",
      tone: "total",
    },
  ];

  return rows;
}

export function buildSaFullPictureContextLine(ctx: SaFullPictureContext, employeeName: string): string {
  const goal = ctx.storeGoalHit ? "Store hit ₱6M goal" : "Store goal pending";
  return `Branch: ${ctx.branchLabel} · Month: ${ctx.month} · ${goal} · SA: ${employeeName}`;
}
