import { NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/api-auth";
import { employeeToDb } from "@/lib/employee-db";
import { hasPermissionServer } from "@/lib/permissions-server";
import { adminDbErrorHint } from "@/lib/supabase-admin";
import type { Employee } from "@/types";

export const runtime = "nodejs";

function canManageEmployees(role: string): boolean {
  return (
    hasPermissionServer(role, "employees:create") ||
    hasPermissionServer(role, "employees:edit")
  );
}

/**
 * POST /api/employees — upsert employee (admin/hr, service role).
 * Authoritative write so records exist for biometrics, payroll, and hydration.
 */
export async function POST(request: Request) {
  try {
    const ctx = await getApiAuthContext();
    if (!ctx) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageEmployees(ctx.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as Partial<Employee>;
    if (!body?.id || !body.name?.trim() || !body.email?.trim()) {
      return NextResponse.json(
        { ok: false, error: "id, name, and email are required" },
        { status: 400 },
      );
    }

    const row = employeeToDb({
      ...body,
      id: body.id,
      name: body.name.trim(),
      email: body.email.trim(),
      status: body.status ?? "active",
      joinDate: body.joinDate ?? new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString(),
      createdAt: body.createdAt ?? new Date().toISOString(),
    } as Employee);

    const { error } = await ctx.adminDb.from("employees").upsert(row, { onConflict: "id" });
    if (error) {
      console.error("[employees] upsert:", error.message);
      const hint = adminDbErrorHint(error.message);
      return NextResponse.json(
        { ok: false, error: hint ?? error.message, ...(hint ? { details: error.message } : {}) },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, id: body.id });
  } catch (err) {
    console.error("[employees] POST error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
