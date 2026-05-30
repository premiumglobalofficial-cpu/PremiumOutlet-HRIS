"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { safePersistStorage } from "@/lib/storage";
import {
  buildMonthlySaPayout,
  computeComplianceScore,
  computeStoreGoalPool,
  type SaComplianceDeducted,
  type SaComplianceEarned,
  type SaEmploymentType,
} from "@/lib/sa-commission";
import type { SaWeekEarnGrid } from "@/lib/sa-compliance-weeks";
import type {
  SaEmployeeProfile,
  SaMonthlyCycle,
  SaPayoutRecord,
  SaPayoutStatus,
} from "@/types";

interface SaCommissionState {
  profiles: SaEmployeeProfile[];
  cycles: SaMonthlyCycle[];

  upsertProfile: (profile: SaEmployeeProfile) => void;
  getOrCreateCycle: (month: string, branchId: string) => SaMonthlyCycle;
  setBranchSales: (month: string, branchId: string, branchTotalSales: number) => void;
  setEmployeeSales: (month: string, branchId: string, employeeId: string, salesTotal: number) => void;
  setCompliance: (
    month: string,
    branchId: string,
    employeeId: string,
    earned: SaComplianceEarned,
    deducted: SaComplianceDeducted,
    weekGrid?: SaWeekEarnGrid,
  ) => void;
  setEmployeeKpi: (
    month: string,
    branchId: string,
    employeeId: string,
    kpi: SaMonthlyCycle["kpiByEmployee"][string],
  ) => void;
  setEmployeeOtDays: (
    month: string,
    branchId: string,
    employeeId: string,
    hoursPerDay: number[],
  ) => void;
  recomputePayouts: (month: string, branchId: string) => void;
  approvePayout: (payoutId: string, approvedBy: string) => void;
  getApprovedPayouts: (month: string) => SaPayoutRecord[];
  getPayoutForEmployee: (month: string, employeeId: string) => SaPayoutRecord | undefined;
  replaceCycle: (cycle: SaMonthlyCycle) => void;
  markPayoutsProcessed: (month: string, employeeIds: string[]) => void;
  revertPayoutToDraft: (payoutId: string) => void;
}

function cycleKey(month: string, branchId: string) {
  return `${month}:${branchId}`;
}

function emptyEarned(): SaComplianceEarned {
  return {
    attendanceWeeks: 0,
    groomingWeeks: 0,
    floorWeeks: 0,
    photoWeeks: 0,
    groupchatWeeks: 0,
    commitmentWeeks: 0,
    trainingSessions: 0,
    proactiveIncidents: 0,
    cashierWeeks: 0,
    highestSalesWins: 0,
  };
}

function emptyDeducted(): SaComplianceDeducted {
  return {
    lateArrival: 0,
    hairViolation: 0,
    uniformViolation: 0,
    zoneUncovered: 0,
    noGreeting: 0,
    phoneUse: 0,
    photoMissed: 0,
    groupchatMissed: 0,
    missedTraining: 0,
    lateKpiReport: 0,
    repeatedViolation: 0,
    cashShortage: 0,
    counterUnattended: 0,
  };
}

export const useSaCommissionStore = create<SaCommissionState>()(
  persist(
    (set, get) => ({
      profiles: [],
      cycles: [],

      upsertProfile: (profile) => {
        set((s) => {
          const rest = s.profiles.filter((p) => p.employeeId !== profile.employeeId);
          return { profiles: [...rest, profile] };
        });
      },

      getOrCreateCycle: (month, branchId) => {
        const existing = get().cycles.find(
          (c) => c.month === month && c.branchId === branchId,
        );
        if (existing) return existing;

        const cycle: SaMonthlyCycle = {
          id: `SAC-${nanoid(8)}`,
          month,
          branchId,
          branchTotalSales: 0,
          complianceEarned: {},
          complianceDeducted: {},
          complianceWeeksByEmployee: {},
          salesByEmployee: {},
          otHoursByEmployee: {},
          kpiByEmployee: {},
          payouts: [],
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ cycles: [...s.cycles, cycle] }));
        return cycle;
      },

      setBranchSales: (month, branchId, branchTotalSales) => {
        get().getOrCreateCycle(month, branchId);
        set((s) => ({
          cycles: s.cycles.map((c) =>
            c.month === month && c.branchId === branchId
              ? { ...c, branchTotalSales, updatedAt: new Date().toISOString() }
              : c,
          ),
        }));
        get().recomputePayouts(month, branchId);
      },

      setEmployeeSales: (month, branchId, employeeId, salesTotal) => {
        get().getOrCreateCycle(month, branchId);
        set((s) => ({
          cycles: s.cycles.map((c) =>
            c.month === month && c.branchId === branchId
              ? {
                  ...c,
                  salesByEmployee: { ...c.salesByEmployee, [employeeId]: salesTotal },
                  updatedAt: new Date().toISOString(),
                }
              : c,
          ),
        }));
        get().recomputePayouts(month, branchId);
      },

      setCompliance: (month, branchId, employeeId, earned, deducted, weekGrid) => {
        get().getOrCreateCycle(month, branchId);
        set((s) => ({
          cycles: s.cycles.map((c) =>
            c.month === month && c.branchId === branchId
              ? {
                  ...c,
                  complianceEarned: { ...c.complianceEarned, [employeeId]: earned },
                  complianceDeducted: { ...c.complianceDeducted, [employeeId]: deducted },
                  complianceWeeksByEmployee: weekGrid
                    ? { ...(c.complianceWeeksByEmployee ?? {}), [employeeId]: weekGrid }
                    : c.complianceWeeksByEmployee,
                  updatedAt: new Date().toISOString(),
                }
              : c,
          ),
        }));
        get().recomputePayouts(month, branchId);
      },

      setEmployeeKpi: (month, branchId, employeeId, kpi) => {
        get().getOrCreateCycle(month, branchId);
        set((s) => ({
          cycles: s.cycles.map((c) =>
            c.month === month && c.branchId === branchId
              ? {
                  ...c,
                  kpiByEmployee: { ...c.kpiByEmployee, [employeeId]: kpi },
                  updatedAt: new Date().toISOString(),
                }
              : c,
          ),
        }));
        get().recomputePayouts(month, branchId);
      },

      setEmployeeOtDays: (month, branchId, employeeId, hoursPerDay) => {
        get().getOrCreateCycle(month, branchId);
        set((s) => ({
          cycles: s.cycles.map((c) =>
            c.month === month && c.branchId === branchId
              ? {
                  ...c,
                  otHoursByEmployee: { ...c.otHoursByEmployee, [employeeId]: hoursPerDay },
                  updatedAt: new Date().toISOString(),
                }
              : c,
          ),
        }));
        get().recomputePayouts(month, branchId);
      },

      recomputePayouts: (month, branchId) => {
        const { profiles, cycles } = get();
        const cycle = cycles.find((c) => c.month === month && c.branchId === branchId);
        if (!cycle) return;

        const branchProfiles = profiles.filter(
          (p) => p.branchId === branchId && p.isSalesAssociate,
        );

        const complianceModifiers = new Map<string, number>();
        for (const p of branchProfiles) {
          const earned = cycle.complianceEarned[p.employeeId] ?? emptyEarned();
          const deducted = cycle.complianceDeducted[p.employeeId] ?? emptyDeducted();
          const { modifier } = computeComplianceScore(earned, deducted);
          complianceModifiers.set(p.employeeId, modifier);
        }

        const kpiInputs = branchProfiles
          .filter((p) => p.employmentType === "regular")
          .map((p) => {
            const k = cycle.kpiByEmployee[p.employeeId] ?? {
              unitsSold: 0,
              revenue: 0,
              upsells: 0,
              commendations: 0,
              complaints: 0,
              shiftsWorked: 0,
            };
            return {
              employeeId: p.employeeId,
              ...k,
              complianceModifier: complianceModifiers.get(p.employeeId) ?? 0.5,
              employmentType: p.employmentType as SaEmploymentType,
            };
          });

        const goalShares = computeStoreGoalPool(cycle.branchTotalSales, kpiInputs);

        const payouts: SaPayoutRecord[] = branchProfiles.map((p) => {
          const prev = cycle.payouts.find((x) => x.employeeId === p.employeeId);
          const status: SaPayoutStatus =
            prev?.status === "approved" || prev?.status === "processed"
              ? prev.status
              : "draft";

          const breakdown =
            (prev?.status === "approved" || prev?.status === "processed") && prev?.breakdown
              ? prev.breakdown
              : buildMonthlySaPayout({
                  employeeId: p.employeeId,
                  month,
                  employmentType: p.employmentType,
                  salesTotal: cycle.salesByEmployee[p.employeeId] ?? 0,
                  approvedOtHoursPerDay: cycle.otHoursByEmployee[p.employeeId] ?? [],
                  complianceEarned: cycle.complianceEarned[p.employeeId] ?? emptyEarned(),
                  complianceDeducted: cycle.complianceDeducted[p.employeeId] ?? emptyDeducted(),
                  storeGoalShare: goalShares.get(p.employeeId) ?? 0,
                });

          return {
            id: prev?.id ?? `SAP-${nanoid(8)}`,
            employeeId: p.employeeId,
            month,
            branchId,
            status,
            breakdown,
            approvedBy: prev?.approvedBy,
            approvedAt: prev?.approvedAt,
            processedAt: prev?.processedAt,
          };
        });

        set((s) => ({
          cycles: s.cycles.map((c) =>
            c.month === month && c.branchId === branchId
              ? { ...c, payouts, updatedAt: new Date().toISOString() }
              : c,
          ),
        }));
      },

      approvePayout: (payoutId, approvedBy) => {
        set((s) => ({
          cycles: s.cycles.map((c) => ({
            ...c,
            payouts: c.payouts.map((p) =>
              p.id === payoutId
                ? {
                    ...p,
                    status: "approved" as const,
                    approvedBy,
                    approvedAt: new Date().toISOString(),
                  }
                : p,
            ),
            updatedAt: new Date().toISOString(),
          })),
        }));
      },

      getApprovedPayouts: (month) => {
        return get()
          .cycles.filter((c) => c.month === month)
          .flatMap((c) => c.payouts.filter((p) => p.status === "approved"));
      },

      getPayoutForEmployee: (month, employeeId) => {
        for (const c of get().cycles) {
          if (c.month !== month) continue;
          const p = c.payouts.find((x) => x.employeeId === employeeId);
          if (p) return p;
        }
        return undefined;
      },

      replaceCycle: (cycle) => {
        set((s) => {
          const rest = s.cycles.filter(
            (c) => !(c.month === cycle.month && c.branchId === cycle.branchId),
          );
          return { cycles: [...rest, cycle] };
        });
      },

      markPayoutsProcessed: (month, employeeIds) => {
        const idSet = new Set(employeeIds);
        const now = new Date().toISOString();
        set((s) => ({
          cycles: s.cycles.map((c) =>
            c.month !== month
              ? c
              : {
                  ...c,
                  payouts: c.payouts.map((p) =>
                    idSet.has(p.employeeId) && p.status === "approved"
                      ? { ...p, status: "processed" as const, processedAt: now }
                      : p,
                  ),
                  updatedAt: now,
                },
          ),
        }));
      },

      revertPayoutToDraft: (payoutId) => {
        set((s) => ({
          cycles: s.cycles.map((c) => ({
            ...c,
            payouts: c.payouts.map((p) =>
              p.id === payoutId && p.status !== "processed"
                ? {
                    ...p,
                    status: "draft" as const,
                    approvedBy: undefined,
                    approvedAt: undefined,
                  }
                : p,
            ),
            updatedAt: new Date().toISOString(),
          })),
        }));
      },
    }),
    {
      name: "po-hris-sa-commission",
      storage: safePersistStorage,
    },
  ),
);

export { cycleKey };
