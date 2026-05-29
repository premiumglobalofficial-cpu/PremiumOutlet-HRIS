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

export async function fetchModuleFlags(): Promise<ModuleFlags | null> {
  try {
    const response = await fetch("/api/settings/appearance", {
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { modules?: unknown; module_flags?: unknown };
    return normalizeModuleFlags(payload.modules ?? payload.module_flags);
  } catch {
    return null;
  }
}

export async function saveModuleFlags(modules: ModuleFlags): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch("/api/settings/appearance", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: payload?.error ?? "Failed to save appearance settings" };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save appearance settings",
    };
  }
}