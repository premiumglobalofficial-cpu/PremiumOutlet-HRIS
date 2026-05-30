import {
  SA_BREAK_REMINDER,
  SA_DINNER_BREAK_MINUTES,
  SA_LUNCH_BREAK_MINUTES,
  SA_TOTAL_BREAK_MINUTES_PER_SHIFT,
  breakDurationMinutes,
} from "@/lib/break-policy";

describe("break-policy", () => {
  it("defines DOLE 45+15 unpaid break split", () => {
    expect(SA_LUNCH_BREAK_MINUTES).toBe(45);
    expect(SA_DINNER_BREAK_MINUTES).toBe(15);
    expect(SA_TOTAL_BREAK_MINUTES_PER_SHIFT).toBe(60);
  });

  it("returns per-type break durations", () => {
    expect(breakDurationMinutes("lunch")).toBe(45);
    expect(breakDurationMinutes("dinner")).toBe(15);
  });

  it("includes COO scheduling reminder", () => {
    expect(SA_BREAK_REMINDER).toContain("45 min lunch");
    expect(SA_BREAK_REMINDER).toContain("COO");
    expect(SA_BREAK_REMINDER).toContain("coverage");
  });
});
