import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/services/supabase-server";

/**
 * PATCH /api/notifications/mark-read
 *
 * Body (one of):
 *   { notificationId: string }       — mark a single notification as read
 *   { employeeId: string }           — mark ALL notifications for an employee as read
 *
 * Auth: requires valid session. Employees can only mark their own notifications.
 */
export async function PATCH(req: Request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Resolve the caller's employee record
  const { data: callerEmp } = await supabase
    .from("employees")
    .select("id, role")
    .eq("profile_id", user.id)
    .maybeSingle();

  const body = await req.json();
  const { notificationId, employeeId } = body as { notificationId?: string; employeeId?: string };

  if (!notificationId && !employeeId) {
    return NextResponse.json({ error: "Provide notificationId or employeeId" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const isAdmin = callerEmp?.role === "admin" || callerEmp?.role === "hr";

  if (notificationId) {
    // Mark single — verify ownership unless admin
    const { data: log } = await supabase
      .from("notification_logs")
      .select("employee_id")
      .eq("id", notificationId)
      .maybeSingle();

    if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isAdmin && log.employee_id !== callerEmp?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("notification_logs")
      .update({ read: true, read_at: now })
      .eq("id", notificationId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Mark all for employee
  if (!isAdmin && employeeId !== callerEmp?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("notification_logs")
    .update({ read: true, read_at: now })
    .eq("employee_id", employeeId)
    .eq("read", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
