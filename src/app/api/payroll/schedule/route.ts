import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/services/supabase-server";
import { keysToCamel, keysToSnake } from "@/lib/db-utils";
import type { PayScheduleConfig } from "@/types";

/**
 * GET /api/payroll/schedule
 * Retrieve the company pay schedule configuration (singleton row, id='default').
 * Returns null data if not yet configured — callers should fall back to DEFAULT_PAY_SCHEDULE.
 */
export async function GET() {
  try {
    const serverClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("pay_schedule_config")
      .select("*")
      .single();

    if (error) {
      // PGRST116 = no rows returned (table exists but no row yet) — not an error
      if (error.code === "PGRST116") {
        return NextResponse.json({ ok: true, data: null });
      }
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: keysToCamel(data as Record<string, unknown>) as unknown as PayScheduleConfig,
    });
  } catch (err) {
    console.error("GET /api/payroll/schedule error:", err);
    return NextResponse.json({ ok: false, message: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/payroll/schedule
 * Upsert the company pay schedule configuration.
 * Body: Partial<PayScheduleConfig> — only supplied fields are updated.
 * Auth: admin / hr / finance / payroll_admin only.
 */
export async function PUT(request: NextRequest) {
  try {
    const serverClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createAdminSupabaseClient();

    const { data: emp } = await supabase
      .from("employees")
      .select("id, role")
      .or(`profile_id.eq.${user.id},email.eq.${user.email}`)
      .single();

    if (!emp || !["admin", "hr", "finance", "payroll_admin"].includes(emp.role)) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json() as Partial<PayScheduleConfig>;

    // Strip client-side-only fields that have no DB column
    const { ...persistable } = body;

    const row = keysToSnake(persistable as Record<string, unknown>);

    // Upsert — the pay_schedule_config table has a singleton row with id='default'
    const { data, error } = await supabase
      .from("pay_schedule_config")
      .upsert({ id: "default", ...row }, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: keysToCamel(data as Record<string, unknown>) as unknown as PayScheduleConfig,
    });
  } catch (err) {
    console.error("PUT /api/payroll/schedule error:", err);
    return NextResponse.json({ ok: false, message: "Internal server error" }, { status: 500 });
  }
}
