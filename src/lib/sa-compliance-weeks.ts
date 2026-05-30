/**
 * Weekly compliance grid — aggregates 4 weeks into monthly SaComplianceEarned totals.
 * Spec: SAincentives.md Part 4 (max 4 weeks per month).
 */

import type { SaComplianceEarned } from "@/lib/sa-commission";

export const SA_WEEKS_PER_MONTH = 4;

export type SaWeekEarnFlags = {
  attendance: boolean;
  grooming: boolean;
  floor: boolean;
  photo: boolean;
  groupchat: boolean;
  commitment: boolean;
  cashier: boolean;
  highestSalesWin: boolean;
};

export type SaWeekEarnGrid = [
  SaWeekEarnFlags,
  SaWeekEarnFlags,
  SaWeekEarnFlags,
  SaWeekEarnFlags,
];

export function emptyWeekFlags(): SaWeekEarnFlags {
  return {
    attendance: false,
    grooming: false,
    floor: false,
    photo: false,
    groupchat: false,
    commitment: false,
    cashier: false,
    highestSalesWin: false,
  };
}

export function emptyWeekGrid(): SaWeekEarnGrid {
  return [emptyWeekFlags(), emptyWeekFlags(), emptyWeekFlags(), emptyWeekFlags()];
}

/** Count checked weeks per criterion across the 4-week grid */
export function aggregateWeekGridToEarned(
  grid: SaWeekEarnGrid,
  trainingSessions: number,
  proactiveIncidents: number,
): SaComplianceEarned {
  const count = (key: keyof SaWeekEarnFlags) =>
    grid.filter((w) => w[key]).length;

  return {
    attendanceWeeks: count("attendance"),
    groomingWeeks: count("grooming"),
    floorWeeks: count("floor"),
    photoWeeks: count("photo"),
    groupchatWeeks: count("groupchat"),
    commitmentWeeks: count("commitment"),
    trainingSessions: Math.max(0, trainingSessions),
    proactiveIncidents: Math.max(0, proactiveIncidents),
    cashierWeeks: count("cashier"),
    highestSalesWins: count("highestSalesWin"),
  };
}

/** Best-effort grid from monthly totals (for legacy / imported data) */
export function weekGridFromMonthlyEarned(earned: SaComplianceEarned): SaWeekEarnGrid {
  const grid = emptyWeekGrid();
  const mappings: Array<{ flag: keyof SaWeekEarnFlags; field: keyof SaComplianceEarned }> = [
    { flag: "attendance", field: "attendanceWeeks" },
    { flag: "grooming", field: "groomingWeeks" },
    { flag: "floor", field: "floorWeeks" },
    { flag: "photo", field: "photoWeeks" },
    { flag: "groupchat", field: "groupchatWeeks" },
    { flag: "commitment", field: "commitmentWeeks" },
    { flag: "cashier", field: "cashierWeeks" },
    { flag: "highestSalesWin", field: "highestSalesWins" },
  ];
  for (const { flag, field } of mappings) {
    const n = Math.min(SA_WEEKS_PER_MONTH, Number(earned[field]) || 0);
    for (let i = 0; i < n; i++) {
      grid[i][flag] = true;
    }
  }
  return grid;
}
