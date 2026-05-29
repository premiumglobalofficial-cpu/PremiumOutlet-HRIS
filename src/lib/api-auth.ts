import { cookies } from "next/headers";
import { readDemoSession } from "@/lib/demo-session";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/services/supabase-server";

const ADMIN_ROLES = new Set(["admin"]);

export function isDemoModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export type ApiAuthContext = {
  userId: string | null;
  role: string;
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  adminDb: Awaited<ReturnType<typeof createAdminSupabaseClient>>;
  /** True when authenticated via demo cookie (Zustand login), not Supabase JWT */
  demoMode: boolean;
};

async function hasSupabaseAuthCookies(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return cookieStore.getAll().some((c) => c.name.startsWith("sb-"));
  } catch {
    return false;
  }
}

/** Resolve Supabase user; only attempts refresh when auth cookies exist. */
export async function resolveSupabaseUser(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  if (!(await hasSupabaseAuthCookies())) return null;
  if (typeof supabase.auth.refreshSession !== "function") return null;

  const { data: { session }, error } = await supabase.auth.refreshSession();
  if (error || !session?.user) return null;
  return session.user;
}

export async function resolveUserRole(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role) return profile.role as string;

  const { data: emp } = await supabase
    .from("employees")
    .select("role")
    .eq("profile_id", userId)
    .maybeSingle();

  return (emp?.role as string | undefined) ?? null;
}

type GetApiAuthOptions = {
  /** When true, only admin role (Supabase or demo cookie) is accepted */
  requireAdmin?: boolean;
};

/**
 * Single server-side auth gate for API routes.
 * 1. Supabase session (cookie JWT + optional refresh)
 * 2. Signed demo session cookie (NEXT_PUBLIC_DEMO_MODE + Zustand login)
 */
export async function getApiAuthContext(
  options: GetApiAuthOptions = {}
): Promise<ApiAuthContext | null> {
  const { requireAdmin = false } = options;
  const supabase = await createServerSupabaseClient();

  const user = await resolveSupabaseUser(supabase);
  if (user) {
    const role = await resolveUserRole(supabase, user.id);
    if (!role) return null;
    if (requireAdmin && !ADMIN_ROLES.has(role)) return null;
    const adminDb = await createAdminSupabaseClient();
    return { userId: user.id, role, supabase, adminDb, demoMode: false };
  }

  if (isDemoModeEnabled()) {
    const demoSession = await readDemoSession();
    if (demoSession) {
      if (requireAdmin && !ADMIN_ROLES.has(demoSession.role)) return null;
      const adminDb = await createAdminSupabaseClient();
      return {
        userId: demoSession.userId,
        role: demoSession.role,
        supabase,
        adminDb,
        demoMode: true,
      };
    }
  }

  return null;
}

/** @deprecated Use getApiAuthContext({ requireAdmin: true }) */
export async function getAdminApiContext(): Promise<ApiAuthContext | null> {
  return getApiAuthContext({ requireAdmin: true });
}
