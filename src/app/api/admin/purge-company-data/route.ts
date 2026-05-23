import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/services/supabase-server";

/**
 * POST /api/admin/purge-company-data
 *
 * Deletes ALL operational data while preserving the calling admin's
 * auth user, profile, and employee record.
 *
 * Config tables are intentionally PRESERVED:
 *   departments, job_titles, shift_templates, attendance_rule_sets,
 *   appearance_config, kiosk_devices, kiosk_pins, location_config,
 *   pay_schedule_config, deduction_global_defaults, gov_table_versions
 *
 * Security: authenticated admin only.
 */

// Operational tables cleared in FK-safe order (children before parents).
const OPERATIONAL_TABLES = [
  // Payroll
  "loan_deductions",
  "loan_repayment_schedule",
  "loan_balance_history",
  "salary_change_requests",
  "salary_history",
  "deduction_overrides",
  "payroll_run_payslips",
  "payslips",
  "payroll_adjustments",
  "final_pay_computations",
  "payroll_runs",
  // Tasks
  "task_comments",
  "task_completion_reports",
  "tasks",
  "task_tags",
  "task_groups",
  // Messaging
  "channel_messages",
  "text_channels",
  // Attendance & Time
  "attendance_evidence",
  "attendance_exceptions",
  "attendance_events",
  "attendance_logs",
  "break_records",
  "overtime_requests",
  "timesheets",
  "manual_checkins",
  "penalty_records",
  // Leave & Loans
  "leave_balances",
  "leave_requests",
  "loans",
  // Employee extras
  "employee_documents",
  "face_enrollments",
  "employee_shifts",
  // Notifications & Audit
  "notification_logs",
  "announcements",
  "audit_logs",
  // Calendar & Projects
  "calendar_events",
  "project_assignments",
  "project_verification_methods",
  "projects",
  // Jobs
  "job_applications",
  "jobs",
  // Location & Survey
  "site_survey_photos",
  "location_pings",
  // QR & Push
  "qr_tokens",
  "push_subscriptions",
  // Dashboard layouts
  "dashboard_layouts",
] as const;

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = await createAdminSupabaseClient();

    // Verify the caller holds the admin role
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const warnings: string[] = [];

    // Truncate each operational table
    for (const table of OPERATIONAL_TABLES) {
      const { error } = await admin
        .from(table)
        .delete()
        // NOT (id IS NULL) matches every row — service-role client bypasses RLS
        .not("id", "is", null);

      if (error) {
        const msg = error.message ?? "";
        // Swallow "relation does not exist" — schema varies across environments
        if (!msg.includes("does not exist") && !msg.includes("relation")) {
          warnings.push(`${table}: ${msg}`);
        }
      }
    }

    // Delete all employees except the admin's own record (identified by profile_id)
    await admin.from("employees").delete().neq("profile_id", user.id);

    // Delete all profiles except the admin's
    // (auth.users FK will cascade delete on the Supabase side for the deleted profiles)
    await admin.from("profiles").delete().neq("id", user.id);

    // Delete all non-admin Supabase auth users
    const {
      data: { users: allAuthUsers },
    } = await admin.auth.admin.listUsers({ perPage: 1000 });

    const nonAdminUsers = (allAuthUsers ?? []).filter((u) => u.id !== user.id);
    await Promise.allSettled(
      nonAdminUsers.map((u) => admin.auth.admin.deleteUser(u.id)),
    );

    return NextResponse.json({
      ok: true,
      message: "All company data has been purged. Admin account preserved.",
      ...(warnings.length > 0 && { warnings }),
    });
  } catch (err) {
    console.error("[API] purge-company-data error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
