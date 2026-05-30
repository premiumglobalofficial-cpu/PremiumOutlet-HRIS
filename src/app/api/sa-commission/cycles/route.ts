import { NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/api-auth";
import type { SaMonthlyCycle } from "@/types";

function rowToCycle(row: Record<string, unknown>): SaMonthlyCycle {
  return {
    id: row.id as string,
    month: row.month as string,
    branchId: row.branch_id as string,
    branchTotalSales: Number(row.branch_total_sales) || 0,
    complianceEarned: (row.compliance_earned as SaMonthlyCycle["complianceEarned"]) ?? {},
    complianceDeducted: (row.compliance_deducted as SaMonthlyCycle["complianceDeducted"]) ?? {},
    salesByEmployee: (row.sales_by_employee as SaMonthlyCycle["salesByEmployee"]) ?? {},
    otHoursByEmployee: (row.ot_hours_by_employee as SaMonthlyCycle["otHoursByEmployee"]) ?? {},
    kpiByEmployee: (row.kpi_by_employee as SaMonthlyCycle["kpiByEmployee"]) ?? {},
    payouts: [],
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

function cycleToRow(cycle: SaMonthlyCycle) {
  return {
    id: cycle.id,
    month: cycle.month,
    branch_id: cycle.branchId,
    branch_total_sales: cycle.branchTotalSales,
    compliance_earned: cycle.complianceEarned,
    compliance_deducted: cycle.complianceDeducted,
    sales_by_employee: cycle.salesByEmployee,
    ot_hours_by_employee: cycle.otHoursByEmployee,
    kpi_by_employee: cycle.kpiByEmployee,
    updated_at: new Date().toISOString(),
  };
}

/** GET /api/sa-commission/cycles?month=yyyy-MM&branchId=main */
export async function GET(req: Request) {
  const ctx = await getApiAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const branchId = searchParams.get("branchId") ?? "main";
  if (!month) return NextResponse.json({ error: "month required" }, { status: 400 });

  const db = ctx.demoMode ? ctx.adminDb : ctx.supabase;

  const { data: cycleRow, error: cycleErr } = await db
    .from("sa_monthly_cycles")
    .select("*")
    .eq("month", month)
    .eq("branch_id", branchId)
    .maybeSingle();

  if (cycleErr) return NextResponse.json({ error: cycleErr.message }, { status: 500 });
  if (!cycleRow) return NextResponse.json({ cycle: null, payouts: [] });

  const { data: payoutRows, error: payoutErr } = await db
    .from("sa_payouts")
    .select("*")
    .eq("cycle_id", cycleRow.id);

  if (payoutErr) return NextResponse.json({ error: payoutErr.message }, { status: 500 });

  const cycle = rowToCycle(cycleRow);
  const payouts = (payoutRows ?? []).map((p) => ({
    id: p.id,
    employeeId: p.employee_id,
    month: p.month,
    branchId: p.branch_id,
    status: p.status,
    breakdown: p.breakdown,
    approvedBy: p.approved_by ?? undefined,
    approvedAt: p.approved_at ?? undefined,
    processedAt: p.processed_at ?? undefined,
  }));

  return NextResponse.json({ cycle: { ...cycle, payouts }, payouts });
}

/** PUT /api/sa-commission/cycles — upsert cycle + payouts (admin) */
export async function PUT(req: Request) {
  const ctx = await getApiAuthContext({ requireAdmin: true });
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    cycle?: SaMonthlyCycle;
    profiles?: Array<{
      employeeId: string;
      branchId: string;
      employmentType: string;
      isSalesAssociate: boolean;
    }>;
  };

  if (!body.cycle) {
    return NextResponse.json({ error: "cycle required" }, { status: 400 });
  }

  const db = ctx.adminDb;
  const cycle = body.cycle;

  const { error: cycleErr } = await db
    .from("sa_monthly_cycles")
    .upsert(cycleToRow(cycle), { onConflict: "month,branch_id" });

  if (cycleErr) return NextResponse.json({ error: cycleErr.message }, { status: 500 });

  if (body.profiles?.length) {
    const profileRows = body.profiles.map((p) => ({
      employee_id: p.employeeId,
      branch_id: p.branchId,
      employment_type: p.employmentType,
      is_sales_associate: p.isSalesAssociate,
      updated_at: new Date().toISOString(),
    }));
    await db.from("sa_employee_profiles").upsert(profileRows, { onConflict: "employee_id" });
  }

  if (cycle.payouts?.length) {
    const payoutRows = cycle.payouts.map((p) => ({
      id: p.id,
      cycle_id: cycle.id,
      employee_id: p.employeeId,
      month: p.month,
      branch_id: p.branchId,
      status: p.status,
      breakdown: p.breakdown,
      approved_by: p.approvedBy ?? null,
      approved_at: p.approvedAt ?? null,
      processed_at: p.processedAt ?? (p.status === "processed" ? new Date().toISOString() : null),
      updated_at: new Date().toISOString(),
    }));
    const { error: payoutErr } = await db
      .from("sa_payouts")
      .upsert(payoutRows, { onConflict: "id" });
    if (payoutErr) return NextResponse.json({ error: payoutErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
