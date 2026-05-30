import { NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/api-auth";
import {
  buildMonthlySaPayout,
  computeSaOtPay,
  SA_STORE_GOAL_THRESHOLD,
} from "@/lib/sa-commission";
import { resolveOtHoursForPayout } from "@/lib/sa-ot-approvals";
import type { SaPayoutRecord } from "@/types";
import type { SaComplianceDeducted, SaComplianceEarned } from "@/lib/sa-commission";

async function resolveEmployeeIdForUser(
  db: Awaited<ReturnType<typeof import("@/services/supabase-server").createAdminSupabaseClient>>,
  userId: string | null,
): Promise<string | null> {
  if (!userId) return null;
  const { data } = await db.from("employees").select("id").eq("profile_id", userId).maybeSingle();
  return data?.id ?? null;
}

function mapPayoutRow(row: Record<string, unknown>): SaPayoutRecord {
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    month: row.month as string,
    branchId: row.branch_id as string,
    status: row.status as SaPayoutRecord["status"],
    breakdown: row.breakdown as SaPayoutRecord["breakdown"],
    approvedAt: (row.approved_at as string) ?? undefined,
    processedAt: (row.processed_at as string) ?? undefined,
  };
}

/** GET /api/sa-commission/my-incentives?month=yyyy-MM */
export async function GET(req: Request) {
  const ctx = await getApiAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  if (!month) return NextResponse.json({ error: "month required" }, { status: 400 });

  const db = ctx.demoMode ? ctx.adminDb : ctx.supabase;
  const employeeId = await resolveEmployeeIdForUser(db, ctx.userId);
  if (!employeeId) {
    return NextResponse.json({ employeeId: null, month, payout: null, history: [] });
  }

  const { data: profile } = await db
    .from("sa_employee_profiles")
    .select("branch_id, employment_type")
    .eq("employee_id", employeeId)
    .maybeSingle();

  const branchId = (profile?.branch_id as string) ?? "main";
  const employmentType =
    (profile?.employment_type as SaPayoutRecord["breakdown"]["employmentType"]) ?? "regular";

  const { data: historyRows } = await db
    .from("sa_payouts")
    .select("*")
    .eq("employee_id", employeeId)
    .in("status", ["approved", "processed"])
    .order("month", { ascending: false })
    .limit(24);

  const history = (historyRows ?? []).map((row) => {
    const p = mapPayoutRow(row);
    const b = p.breakdown;
    return {
      month: p.month,
      status: p.status,
      cashTotal: b.cashTotal,
      variableCash: b.cashTotal - b.baseSalary,
      complianceScore: b.complianceScore,
      complianceTier: b.complianceTier,
      salesLevel: b.salesLevel,
      approvedAt: p.approvedAt,
      processedAt: p.processedAt,
    };
  });

  const { data: monthPayoutRows } = await db
    .from("sa_payouts")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("month", month)
    .order("updated_at", { ascending: false })
    .limit(1);

  const { data: cycleRow } = await db
    .from("sa_monthly_cycles")
    .select("*")
    .eq("month", month)
    .eq("branch_id", branchId)
    .maybeSingle();

  const earned =
    (cycleRow?.compliance_earned as Record<string, SaComplianceEarned>)?.[employeeId] ?? null;
  const deducted =
    (cycleRow?.compliance_deducted as Record<string, SaComplianceDeducted>)?.[employeeId] ?? null;
  const weekGrid =
    (cycleRow?.compliance_weeks_by_employee as Record<string, unknown>)?.[employeeId] ?? null;
  const salesTotal = Number(
    (cycleRow?.sales_by_employee as Record<string, number>)?.[employeeId] ?? 0,
  );
  const otHoursManual =
    (cycleRow?.ot_hours_by_employee as Record<string, number[]>)?.[employeeId] ?? [];
  const otApprovals =
    (cycleRow?.ot_approvals_by_employee as Record<string, import("@/types").SaOtApproval[]>)?.[
      employeeId
    ] ?? [];
  const branchTotalSales = Number(cycleRow?.branch_total_sales ?? 0);
  const storeGoalHit = branchTotalSales >= SA_STORE_GOAL_THRESHOLD;

  const otHoursPerDay = resolveOtHoursForPayout(otApprovals, month, otHoursManual);
  const otHoursTotal = otHoursPerDay.reduce((s, h) => s + h, 0);

  let payout: SaPayoutRecord | null = monthPayoutRows?.[0]
    ? mapPayoutRow(monthPayoutRows[0])
    : null;

  if (!payout && cycleRow && earned && deducted) {
    const preview = buildMonthlySaPayout({
      employeeId,
      month,
      employmentType,
      salesTotal,
      approvedOtHoursPerDay: otHoursPerDay,
      complianceEarned: earned,
      complianceDeducted: deducted,
      storeGoalShare: 0,
    });
    payout = {
      id: `preview-${employeeId}-${month}`,
      employeeId,
      month,
      branchId,
      status: "draft",
      breakdown: preview,
    };
  }

  return NextResponse.json({
    employeeId,
    month,
    branchId,
    branchLabel: branchId === "main" ? "POGRC (Mega Annex)" : branchId,
    storeGoalHit,
    branchTotalSales,
    salesTotal,
    otHoursTotal,
    otPayPreview: computeSaOtPay(otHoursPerDay),
    compliance: earned && deducted
      ? { earned, deducted, weekGrid }
      : null,
    payout,
    history,
  });
}
