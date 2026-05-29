import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getServiceRoleKey } from "@/lib/env";

/** Detect wrong key (anon JWT pasted into SUPABASE_SERVICE_ROLE_KEY). */
export function assertServiceRoleKey(key: string): void {
  const segment = key.split(".")[1];
  if (!segment) return;

  try {
    const payload = JSON.parse(
      Buffer.from(segment.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as { role?: string };

    if (payload.role && payload.role !== "service_role") {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY must be the service_role secret from Supabase Dashboard → Project Settings → API (not the anon or publishable key).",
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("service_role")) throw err;
    // Non-JWT keys (legacy) — skip validation
  }
}

export function isDbPermissionDenied(message?: string | null): boolean {
  return !!message?.toLowerCase().includes("permission denied");
}

export function adminDbErrorHint(message?: string | null): string | undefined {
  if (!isDbPermissionDenied(message)) return undefined;
  return (
    "Database grants missing for service_role. Run supabase/migrations/063_service_role_grants.sql in the Supabase SQL Editor, " +
    "and confirm Vercel env SUPABASE_SERVICE_ROLE_KEY is the service_role secret (not anon)."
  );
}

/**
 * Admin client using service_role — server API routes only.
 * Uses createClient (not createServerClient) so the service role bypasses session JWT.
 */
export async function createAdminSupabaseClient(): Promise<SupabaseClient> {
  const serviceKey = getServiceRoleKey();
  assertServiceRoleKey(serviceKey);

  return createClient(getSupabaseUrl(), serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
