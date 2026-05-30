/**
 * DOLE-compliant break policy for Sales Associates (8-hour shift).
 * Spec: SAincentives.md / POGRC break policy — 45 min lunch + 15 min dinner, unpaid.
 */

export const SA_LUNCH_BREAK_MINUTES = 45;
export const SA_DINNER_BREAK_MINUTES = 15;
export const SA_TOTAL_BREAK_MINUTES_PER_SHIFT =
  SA_LUNCH_BREAK_MINUTES + SA_DINNER_BREAK_MINUTES;

export const SA_BREAK_REMINDER =
  "Break = 1 hour per shift (45 min lunch + 15 min dinner). Unpaid. Scheduled by assigned person by COO. Floor must always have coverage.";

export const SA_BREAK_RULES = [
  "45 min lunch (mid-opening shift) + 15 min dinner (mid-closing shift) — both unpaid.",
  "Breaks are scheduled by your assigned supervisor (COO). Do not self-decide timing.",
  "The floor must never be empty — coverage is required at all times.",
  "If you work through a scheduled break, that time becomes paid work time.",
  "Do not stack breaks — take lunch and dinner separately as scheduled.",
] as const;

export type SaBreakType = "lunch" | "dinner" | "other";

export function breakDurationMinutes(
  breakType: SaBreakType,
  lunchDuration = SA_LUNCH_BREAK_MINUTES,
): number {
  if (breakType === "dinner") return SA_DINNER_BREAK_MINUTES;
  if (breakType === "lunch") return lunchDuration;
  return lunchDuration;
}
