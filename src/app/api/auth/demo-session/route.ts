import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_USERS } from "@/data/seed";
import {
  DEMO_SESSION_COOKIE,
  demoSessionCookieOptions,
  signDemoSession,
} from "@/lib/demo-session";
import { isDemoModeEnabled } from "@/lib/api-auth";

const ALLOWED_ROLES = new Set([
  "admin",
  "hr",
  "finance",
  "employee",
  "supervisor",
  "payroll_admin",
  "auditor",
]);

/**
 * POST /api/auth/demo-session
 * Sets httpOnly cookie after Zustand demo login.
 */
export async function POST(req: Request) {
  if (!isDemoModeEnabled()) {
    return NextResponse.json({ error: "Demo mode disabled" }, { status: 403 });
  }

  const body = (await req.json()) as {
    userId?: unknown;
    role?: unknown;
    email?: unknown;
  };

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!userId || !role || !email) {
    return NextResponse.json({ error: "userId, role, and email are required" }, { status: 400 });
  }

  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const known = DEMO_USERS.some(
    (u) => u.id === userId && u.role === role && u.email.toLowerCase() === email
  );
  if (!known) {
    return NextResponse.json({ error: "Unknown demo user" }, { status: 403 });
  }

  const token = signDemoSession({ userId, role, email });
  const cookieStore = await cookies();
  cookieStore.set(DEMO_SESSION_COOKIE, token, demoSessionCookieOptions());

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/auth/demo-session
 * Clears demo session on logout.
 */
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
