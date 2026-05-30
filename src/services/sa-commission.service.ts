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

export type MySaIncentivesHistoryRow = {
  month: string;
  status: "approved" | "processed";
  cashTotal: number;
  variableCash: number;
  complianceScore: number;
  complianceTier: string;
  salesLevel: string;
  approvedAt?: string;
  processedAt?: string;
};

export type MySaIncentivesResponse = {
  employeeId: string | null;
  month: string;
  branchId: string;
  branchLabel: string;
  storeGoalHit: boolean;
  branchTotalSales: number;
  salesTotal: number;
  otHoursTotal: number;
  compliance: {
    earned: import("@/lib/sa-commission").SaComplianceEarned;
    deducted: import("@/lib/sa-commission").SaComplianceDeducted;
    weekGrid: unknown;
  } | null;
  payout: SaPayoutRecord | null;
  history: MySaIncentivesHistoryRow[];
};

export async function fetchMySaIncentives(month: string): Promise<MySaIncentivesResponse | null> {
  const res = await fetch(
    `/api/sa-commission/my-incentives?month=${encodeURIComponent(month)}`,
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) return null;
  return (await res.json()) as MySaIncentivesResponse;
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
