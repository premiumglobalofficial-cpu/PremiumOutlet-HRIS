import type { SaEmployeeProfile, SaMonthlyCycle, SaPayoutRecord } from "@/types";

export async function fetchSaCycle(
  month: string,
  branchId: string,
): Promise<SaMonthlyCycle | null> {
  const res = await fetch(
    `/api/sa-commission/cycles?month=${encodeURIComponent(month)}&branchId=${encodeURIComponent(branchId)}`,
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { cycle?: SaMonthlyCycle | null };
  return data.cycle ?? null;
}

export async function fetchMySaPayout(
  month: string,
): Promise<{ payout: SaPayoutRecord | null; employeeId?: string }> {
  const res = await fetch(
    `/api/sa-commission/my-payout?month=${encodeURIComponent(month)}`,
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) return { payout: null };
  const data = (await res.json()) as {
    payout?: SaPayoutRecord | null;
    employeeId?: string;
  };
  return { payout: data.payout ?? null, employeeId: data.employeeId };
}

export async function persistSaCycle(
  cycle: SaMonthlyCycle,
  profiles: SaEmployeeProfile[],
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/sa-commission/cycles", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cycle, profiles }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: err.error ?? "Failed to save SA cycle" };
  }
  return { ok: true };
}
