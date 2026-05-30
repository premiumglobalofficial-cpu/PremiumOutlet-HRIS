import { NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/api-auth";

async function resolveEmployeeIdForUser(
  db: Awaited<ReturnType<typeof import("@/services/supabase-server").createAdminSupabaseClient>>,
  userId: string | null,
  userEmail?: string | null,
): Promise<string | null> {
  if (!userId) return null;

  const { data: byProfile } = await db
    .from("employees")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (byProfile?.id) return byProfile.id;

  if (userEmail) {
    const { data: byEmail } = await db
      .from("employees")
      .select("id")
      .ilike("email", userEmail.trim())
      .maybeSingle();
    if (byEmail?.id) return byEmail.id;
  }

  return null;
}

/** GET /api/sa-commission/my-payout?month=yyyy-MM — employee read own approved/processed payout */
export async function GET(req: Request) {
  const ctx = await getApiAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  if (!month) return NextResponse.json({ error: "month required" }, { status: 400 });

  const db = ctx.demoMode ? ctx.adminDb : ctx.supabase;

  const employeeId = await resolveEmployeeIdForUser(db, ctx.userId, null);

  if (!employeeId) {
    return NextResponse.json({ payout: null, message: "No employee profile linked" });
  }

  const { data: rows, error } = await db
    .from("sa_payouts")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("month", month)
    .in("status", ["approved", "processed"])
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = rows?.[0];
  if (!row) {
    return NextResponse.json({ payout: null, employeeId });
  }

  return NextResponse.json({
    employeeId,
    payout: {
      id: row.id,
      employeeId: row.employee_id,
      month: row.month,
      branchId: row.branch_id,
      status: row.status,
      breakdown: row.breakdown,
      approvedAt: row.approved_at ?? undefined,
      processedAt: row.processed_at ?? undefined,
    },
  });
}
