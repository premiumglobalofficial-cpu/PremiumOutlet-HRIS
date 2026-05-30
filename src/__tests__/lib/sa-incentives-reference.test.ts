import {
  SA_COMMISSION_TIERS,
  SA_COMPLIANCE_DEDUCT_RULES,
  SA_COMPLIANCE_EARN_RULES,
  SA_COMPLIANCE_REWARD_TIERS,
} from "@/lib/sa-incentives-reference";

describe("SA incentives reference (SAincentives.md)", () => {
  it("defines 5 commission tiers", () => {
    expect(SA_COMMISSION_TIERS).toHaveLength(5);
    expect(SA_COMMISSION_TIERS[0].level).toBe("NOT HIT");
    expect(SA_COMMISSION_TIERS[4].level).toBe("STAR");
  });

  it("defines 10 earn rules word-for-word keys", () => {
    expect(SA_COMPLIANCE_EARN_RULES).toHaveLength(10);
    expect(SA_COMPLIANCE_EARN_RULES[0].description).toBe(
      "Come to work on time, every shift, all week",
    );
    expect(SA_COMPLIANCE_EARN_RULES[9].description).toContain("Highest total sales");
  });

  it("defines 13 violation rules", () => {
    expect(SA_COMPLIANCE_DEDUCT_RULES).toHaveLength(13);
    expect(SA_COMPLIANCE_DEDUCT_RULES[0].violation).toContain("8:30 AM");
    expect(SA_COMPLIANCE_DEDUCT_RULES[10].violation).toContain("Same rule broken again");
  });

  it("defines compliance reward tiers including NEEDS IMPROVEMENT", () => {
    expect(SA_COMPLIANCE_REWARD_TIERS).toHaveLength(4);
    expect(SA_COMPLIANCE_REWARD_TIERS[0].tier).toBe("GOLD");
    expect(SA_COMPLIANCE_REWARD_TIERS[3].totalReward).toContain("Coaching");
  });
});
