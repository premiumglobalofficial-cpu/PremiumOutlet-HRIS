import {
  isSaIncentiveEligibleCutoff,
  SA_MAX_OT_PAY_MONTHLY,
  SA_MAX_VARIABLE_CASH,
  SA_EOM_BLOCKED_REASON,
} from "@/lib/sa-eom-policy";
import { SA_MAX_OT_HOURS_PER_MONTH, SA_OT_RATE } from "@/lib/sa-commission";

describe("isSaIncentiveEligibleCutoff", () => {
  it("allows semi_monthly only on 2nd cutoff (EOM)", () => {
    expect(isSaIncentiveEligibleCutoff("semi_monthly", "first")).toBe(false);
    expect(isSaIncentiveEligibleCutoff("semi_monthly", "second")).toBe(true);
  });

  it("allows monthly on any cutoff (single run = EOM)", () => {
    expect(isSaIncentiveEligibleCutoff("monthly", "first")).toBe(true);
    expect(isSaIncentiveEligibleCutoff("monthly", "second")).toBe(true);
  });

  it("blocks weekly and bi_weekly in MVP", () => {
    expect(isSaIncentiveEligibleCutoff("weekly", "second")).toBe(false);
    expect(isSaIncentiveEligibleCutoff("bi_weekly", "second")).toBe(false);
  });
});

describe("SA EOM policy constants", () => {
  it("defines max OT pay from 24h cap", () => {
    expect(SA_MAX_OT_PAY_MONTHLY).toBeCloseTo(
      SA_MAX_OT_HOURS_PER_MONTH * SA_OT_RATE,
      2,
    );
  });

  it("exposes blocked reason message for UI", () => {
    expect(SA_EOM_BLOCKED_REASON).toContain("2nd cutoff");
  });

  it("defines max variable cash excluding base and store goal", () => {
    expect(SA_MAX_VARIABLE_CASH).toBe(6112.5);
  });
});
