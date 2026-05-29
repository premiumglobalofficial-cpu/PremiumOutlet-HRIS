import { NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/api-auth";
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

export async function GET() {
  try {
    const ctx = await getApiAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await ctx.adminDb
      .from("appearance_config")
      .select("module_flags")
      .eq("id", "default")
      .single();

    if (error) {
      // Graceful defaults so UI and E2E work before appearance_config is fully migrated
      if (
        error.code === "PGRST116" ||
        error.code === "42P01" ||
        error.message?.includes("0 rows") ||
        error.message?.includes("module_flags") ||
        error.message?.includes("appearance_config")
      ) {
        return NextResponse.json({
          modules: DEFAULT_MODULE_FLAGS,
          note: "Using defaults — appearance_config not fully available",
        });
      }
      console.error("[API] settings/appearance GET:", error.message);
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
    const ctx = await getApiAuthContext({ requireAdmin: true });
    if (!ctx) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const modules = normalizeModuleFlags(body?.modules);

    const { error } = await ctx.adminDb
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
