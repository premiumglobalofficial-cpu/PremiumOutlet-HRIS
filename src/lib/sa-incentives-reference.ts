/**
 * SA Incentives reference — word-for-word from SAincentives.md v2.0 (June 2026).
 * Single source for admin guide labels and employee-facing copy.
 */

import type { SaComplianceDeducted, SaComplianceEarned } from "@/lib/sa-commission";

export const SA_SPEC_VERSION = "2.0";
export const SA_SPEC_EFFECTIVE = "June 2026";

export const SA_CRITICAL_EOM_RULE =
  "All incentive calculations (Sales Commission, Overtime, Compliance Rewards, Store Goal Bonus) MUST BE COMPUTED ONLY ON THE 2ND CUTOFF (END OF MONTH / EOM). Mid-month runs pay base salary + statutory only.";

export const SA_COMPLIANCE_HEADER =
  "Maximum = 360 points per month. OIC/COO tracks daily. COO validates every Friday. No self-reporting.";

export type SaCommissionTierRow = {
  level: string;
  targetHit: string;
  salesRange: string;
  commission: string;
  example: string;
  tone: "red" | "neutral" | "blue" | "gold" | "green";
};

export const SA_COMMISSION_TIERS: SaCommissionTierRow[] = [
  {
    level: "NOT HIT",
    targetHit: "Below 90%",
    salesRange: "Below ₱900,000",
    commission: "₱ 0",
    example: "₱850K = ₱0",
    tone: "red",
  },
  {
    level: "GOOD",
    targetHit: "90% to 99%",
    salesRange: "₱900,000 to ₱999,999",
    commission: "₱ 500",
    example: "₱950K = ₱500",
    tone: "neutral",
  },
  {
    level: "GREAT",
    targetHit: "100% to 119%",
    salesRange: "₱1,000,000 to ₱1,189,999",
    commission: "₱ 1,000",
    example: "₱1.1M = ₱1,000",
    tone: "blue",
  },
  {
    level: "EXCELLENT",
    targetHit: "120% to 149%",
    salesRange: "₱1,200,000 to ₱1,499,999",
    commission: "₱ 1,500",
    example: "₱1.3M = ₱1,500",
    tone: "gold",
  },
  {
    level: "STAR",
    targetHit: "150% and above",
    salesRange: "₱1,500,000 and above",
    commission: "₱ 2,000",
    example: "₱1.6M = ₱2,000",
    tone: "green",
  },
];

export type SaEarnRule = {
  key: keyof SaComplianceEarned;
  description: string;
  points: number;
  per: string;
  maxPerMonth: string;
  maxWeeks?: number;
};

/** EARN Points — 10 ways (SAincentives.md Part 4) */
export const SA_COMPLIANCE_EARN_RULES: SaEarnRule[] = [
  {
    key: "attendanceWeeks",
    description: "Come to work on time, every shift, all week",
    points: 10,
    per: "Week",
    maxPerMonth: "+40",
    maxWeeks: 4,
  },
  {
    key: "groomingWeeks",
    description: "Hair, uniform, shoes correct all week",
    points: 10,
    per: "Week",
    maxPerMonth: "+40",
    maxWeeks: 4,
  },
  {
    key: "floorWeeks",
    description: "No rule breaks on the floor all week",
    points: 10,
    per: "Week",
    maxPerMonth: "+40",
    maxWeeks: 4,
  },
  {
    key: "photoWeeks",
    description: "Submit photos correctly all week",
    points: 5,
    per: "Week",
    maxPerMonth: "+20",
    maxWeeks: 4,
  },
  {
    key: "groupchatWeeks",
    description: "Reply to group chat messages same day all week",
    points: 5,
    per: "Week",
    maxPerMonth: "+20",
    maxWeeks: 4,
  },
  {
    key: "commitmentWeeks",
    description: "Kept weekly commitment, confirmed by OIC or COO",
    points: 10,
    per: "Week",
    maxPerMonth: "+40",
    maxWeeks: 4,
  },
  {
    key: "trainingSessions",
    description: "Attended Monday training session",
    points: 5,
    per: "Session",
    maxPerMonth: "+20",
  },
  {
    key: "proactiveIncidents",
    description: "Did something extra, flagged by OIC or COO",
    points: 5,
    per: "Incident",
    maxPerMonth: "No limit",
  },
  {
    key: "cashierWeeks",
    description: "Helped at cashier and performed well",
    points: 10,
    per: "Week",
    maxPerMonth: "+40",
    maxWeeks: 4,
  },
  {
    key: "highestSalesWins",
    description: "Highest total sales in team that week (1 winner only)",
    points: 20,
    per: "Week",
    maxPerMonth: "+80",
    maxWeeks: 4,
  },
];

export type SaDeductRule = {
  key: keyof SaComplianceDeducted;
  violation: string;
  rule: string;
  deduction: string;
};

/** LOSE Points — 13 violations (SAincentives.md Part 4) */
export const SA_COMPLIANCE_DEDUCT_RULES: SaDeductRule[] = [
  {
    key: "lateArrival",
    violation: "Late arrival, opening past 8:30 AM or closing past 12:00 PM",
    rule: "Rule 1",
    deduction: "-5 pts per time",
  },
  {
    key: "hairViolation",
    violation: "Hair not tied on the floor",
    rule: "Rule 26",
    deduction: "-5 pts per time",
  },
  {
    key: "uniformViolation",
    violation: "Uniform not clean or wrong color",
    rule: "Rule 25",
    deduction: "-5 pts per time",
  },
  {
    key: "zoneUncovered",
    violation: "Left zone without telling OIC/COO",
    rule: "Rule 12",
    deduction: "-10 pts per time",
  },
  {
    key: "noGreeting",
    violation: "Did not greet customer within 60 seconds",
    rule: "Rule 19",
    deduction: "-5 pts per time",
  },
  {
    key: "phoneUse",
    violation: "Used personal phone on floor or cashier area",
    rule: "Rule 24",
    deduction: "-5 pts per time",
  },
  {
    key: "photoMissed",
    violation: "Photo not sent or sent incorrectly",
    rule: "Rule 30",
    deduction: "-5 pts per day",
  },
  {
    key: "groupchatMissed",
    violation: "Did not reply to group chat same day",
    rule: "Rule 49",
    deduction: "-5 pts per message",
  },
  {
    key: "missedTraining",
    violation: "Missed Monday training without notice",
    rule: "Rule 63",
    deduction: "-10 pts per session",
  },
  {
    key: "lateKpiReport",
    violation: "KPI report submitted late or next day",
    rule: "Rule 30",
    deduction: "-5 pts per time",
  },
  {
    key: "repeatedViolation",
    violation: "Same rule broken again in same week",
    rule: "Any",
    deduction: "-10 pts EXTRA on top of original",
  },
  {
    key: "cashShortage",
    violation: "Cash shortage or overage, unresolved",
    rule: "Rule C1",
    deduction: "-10 pts per incident",
  },
  {
    key: "counterUnattended",
    violation: "Left cashier counter alone without telling OIC/COO",
    rule: "Rule C3",
    deduction: "-10 pts per incident",
  },
];

export type SaComplianceRewardTier = {
  score: string;
  tier: string;
  cash: string;
  gc: string;
  rice: string;
  totalReward: string;
};

export const SA_COMPLIANCE_REWARD_TIERS: SaComplianceRewardTier[] = [
  {
    score: "260 to 360",
    tier: "GOLD",
    cash: "₱ 1,000",
    gc: "₱ 500",
    rice: "₱ 400",
    totalReward: "₱ 1,900 total",
  },
  {
    score: "200 to 259",
    tier: "SILVER",
    cash: "—",
    gc: "₱ 500",
    rice: "—",
    totalReward: "₱ 500 GC",
  },
  {
    score: "140 to 199",
    tier: "BRONZE",
    cash: "—",
    gc: "—",
    rice: "—",
    totalReward: "Token of Appreciation",
  },
  {
    score: "Below 140",
    tier: "NEEDS IMPROVEMENT",
    cash: "—",
    gc: "—",
    rice: "—",
    totalReward: "No reward. Coaching with COO.",
  },
];

export const SA_OT_REFERENCE = {
  hourlyRate: "₱ 92.19",
  dailyLimit: "Max 2 hours/day",
  monthlyLimit: "Max 24 hours/month",
  maxPayout: "₱ 2,212.50 (24 hrs × ₱92.19)",
  rules: [
    "Must have pre-approved written log from HR/COO",
    "SA must declare BEFORE rendering: Cash or Offset (Rest Day)",
    "Valid only for: inventory counting, stock delivery outside shift, high traffic/events, emergency coverage, store reset",
    "Unapproved OT = ₱ 0. Self-decided stay = ₱ 0. Cannot be changed post-render.",
  ],
};

export const SA_STORE_GOAL_REFERENCE = {
  branchTarget: "₱ 6,000,000",
  bonusPool: "₱ 10,000 (Unlocked ONLY if branch hits target)",
  note: "Split among SAs based on weighted performance (Personal Sales + Compliance Score). Additional to the ₱21,452.50 cap. Calculated separately at EOM.",
};

export const SA_LEGENDS = [
  { metric: "Monthly Compliance Points", minimum: "0 (Hard Floor)", maximum: "360", notes: "Deductions cannot push below 0. Cap at 360." },
  { metric: "OT Hours / Day", minimum: "0", maximum: "2", notes: "Auto-truncate any daily entry > 2 hrs." },
  { metric: "OT Hours / Month", minimum: "0", maximum: "24", notes: "Auto-truncate monthly total > 24 hrs." },
  { metric: "Sales Commission Payout", minimum: "₱ 0", maximum: "₱ 2,000", notes: "Flat tier lookup. No prorating." },
  { metric: "Store Bonus Share", minimum: "₱ 0", maximum: "Variable", notes: "Pool = ₱10,000 max. Split by rank/performance." },
  { metric: "Compliance Cash Reward", minimum: "₱ 0", maximum: "₱ 1,000", notes: "Tied to GOLD tier (260-360 pts)." },
  { metric: "Compliance Non-Cash Value", minimum: "₱ 0", maximum: "₱ 900", notes: "GC (₱500) + Rice (₱400) at GOLD tier." },
  { metric: "Total Fixed + Incentives (Max)", minimum: "₱ 15,340", maximum: "₱ 21,452.50", notes: "Excludes Store Bonus share." },
];

export const SA_SAMPLE_MONTH_KIM = {
  title: "FULL PICTURE — SAMPLE MONTH (All 4 Components)",
  context: "Branch: POGRC (Mega Annex) · Month: June 2026 · Store hit ₱6M goal · SA: Kim",
  rows: [
    { component: "Base Salary", amount: "₱ 15,340", how: "Minimum wage. Fixed every month." },
    { component: "Sales Target Commission EXCELLENT (125%)", amount: "₱ 1,500", how: "₱1,250,000 ÷ ₱1,000,000 = 125%. Excellent tier." },
    { component: "Overtime Pay — 24 hrs total", amount: "₱ 2,212.50", how: "24 hrs × ₱92.19. Taken as cash." },
    { component: "Compliance Cash Bonus — GOLD (290 pts)", amount: "₱ 1,000", how: "Scored 290 pts. GOLD tier." },
    { component: "Compliance Grocery GC — GOLD", amount: "₱ 500 GC", how: "Non-cash. Grocery gift card." },
    { component: "Compliance 5kg Rice — GOLD", amount: "5kg Rice", how: "Non-cash. Estimated value ₱400." },
    { component: "Store Goal Bonus Share — branch hit ₱6M", amount: "Share of ₱10,000", how: "Exact amount varies by individual rank vs team. Calculated separately." },
    { component: "TOTAL CASH + SALARY", amount: "₱ 20,552.50", how: "Plus store goal bonus share on top." },
  ],
  breakReminder:
    "Break = 1 hour per shift (45 min lunch + 15 min dinner). Unpaid. Scheduled by assigned person by COO. Floor must always have coverage.",
};
