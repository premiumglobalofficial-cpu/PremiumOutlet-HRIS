import { NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/services/supabase-server";
import { DEFAULT_MODULE_FLAGS, type ModuleFlags } from "@/store/appearance.store";

function normalizeModuleFlags(value: unknown): ModuleFlags {
  const next: ModuleFlags = { ...DEFAULT_MODULE_FLAGS };
  if (!value || typeof value !== "object") return next;

  const incoming = value as Partial<Record<keyof ModuleFlags, unknown>>;
  for (const key of Object.keys(DEFAULT_MODULE_FLAGS) as (keyof ModuleFlags)[]) {
    if (typeof incoming[key] === "boolean") {
      next[key] = incoming[key] as boolean;
    }
  }

  return next;
}

async function requireAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false as const, response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  return { ok: true as const, user };
}

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser();
    if (!auth.ok) return auth.response;

    const admin = await createAdminSupabaseClient();
    const { data, error } = await admin
      .from("appearance_config")
      .select("module_flags")
      .eq("id", "default")
      .single();

    if (error) {
      if (error.message?.includes("module_flags")) {
        return NextResponse.json({ modules: DEFAULT_MODULE_FLAGS, note: "Module flags column not yet migrated" });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ modules: normalizeModuleFlags(data?.module_flags) });
  } catch (err) {
    console.error("[API] settings/appearance GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if (!auth.ok) return auth.response;

    const admin = await createAdminSupabaseClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const modules = normalizeModuleFlags(body?.modules);

    const { error } = await admin
      .from("appearance_config")
      .upsert({ id: "default", company_name: "Premium Outlets", module_flags: modules }, { onConflict: "id" });

    if (error) {
      if (error.message?.includes("module_flags")) {
        return NextResponse.json({ ok: true, note: "Column not yet migrated" });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, modules });
  } catch (err) {
    console.error("[API] settings/appearance PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}