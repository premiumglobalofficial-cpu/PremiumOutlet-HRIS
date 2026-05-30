"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SA_COMMISSION_TIERS,
  SA_COMPLIANCE_DEDUCT_RULES,
  SA_COMPLIANCE_EARN_RULES,
  SA_COMPLIANCE_HEADER,
  SA_COMPLIANCE_REWARD_TIERS,
  SA_CRITICAL_EOM_RULE,
  SA_LEGENDS,
  SA_OT_REFERENCE,
  SA_SAMPLE_MONTH_KIM,
  SA_SPEC_EFFECTIVE,
  SA_SPEC_VERSION,
  SA_STORE_GOAL_REFERENCE,
  type SaCommissionTierRow,
} from "@/lib/sa-incentives-reference";
import { cn } from "@/lib/utils";

const tierToneClass: Record<SaCommissionTierRow["tone"], string> = {
  red: "text-red-700 dark:text-red-400 bg-red-50/80 dark:bg-red-950/30",
  neutral: "bg-muted/40",
  blue: "text-blue-800 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/30",
  gold: "text-amber-900 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/30",
  green: "text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/30",
};

type Props = {
  /** admin = full guide for OIC/COO/HR; employee = read-only reference */
  audience?: "admin" | "employee";
  compact?: boolean;
};

export function SaIncentivesReferenceTables({ audience = "admin", compact = false }: Props) {
  const isAdmin = audience === "admin";

  return (
    <div className={cn("space-y-4", compact && "text-sm")}>
      <div className="rounded-lg border border-amber-300/70 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/25 px-3 py-2.5">
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
          ⚠️ CRITICAL SYSTEM RULE (SAincentives.md v{SA_SPEC_VERSION}, {SA_SPEC_EFFECTIVE})
        </p>
        <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
          {SA_CRITICAL_EOM_RULE}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Commission Tiers — Sales Target</CardTitle>
          <CardDescription>
            Individual monthly target ₱1,000,000. Flat tier system. Non-cumulative, non-proportional.
            Min ₱0 · Max ₱2,000.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Target Hit</TableHead>
                <TableHead>Sales Range</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Example</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SA_COMMISSION_TIERS.map((row) => (
                <TableRow key={row.level} className={tierToneClass[row.tone]}>
                  <TableCell className="font-semibold">{row.level}</TableCell>
                  <TableCell>{row.targetHit}</TableCell>
                  <TableCell>{row.salesRange}</TableCell>
                  <TableCell className="font-mono font-semibold">{row.commission}</TableCell>
                  <TableCell className="text-muted-foreground">{row.example}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">PART 4 — Compliance Points (Earn and Lose)</CardTitle>
          <CardDescription>{SA_COMPLIANCE_HEADER}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold mb-2">EARN Points 10 Ways</p>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-emerald-700 hover:bg-emerald-700">
                    <TableHead className="text-white min-w-[280px]">What the SA Does</TableHead>
                    <TableHead className="text-white w-20">Points</TableHead>
                    <TableHead className="text-white w-24">Per</TableHead>
                    <TableHead className="text-white w-28">Max / Month</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SA_COMPLIANCE_EARN_RULES.map((row, i) => (
                    <TableRow key={row.key} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      <TableCell className="text-sm leading-snug">{row.description}</TableCell>
                      <TableCell className="font-mono text-emerald-700 dark:text-emerald-400">
                        +{row.points}
                      </TableCell>
                      <TableCell>{row.per}</TableCell>
                      <TableCell className="font-medium">{row.maxPerMonth}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-emerald-50 dark:bg-emerald-950/30 font-semibold">
                    <TableCell colSpan={3}>MAXIMUM (all criteria met, all 4 weeks)</TableCell>
                    <TableCell>360 pts</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">LOSE Points 13 Violations</p>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-red-800 hover:bg-red-800">
                    <TableHead className="text-white min-w-[280px]">Violation</TableHead>
                    <TableHead className="text-white w-24">Rule</TableHead>
                    <TableHead className="text-white w-40">Deduction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SA_COMPLIANCE_DEDUCT_RULES.map((row, i) => (
                    <TableRow key={row.key} className={i % 2 === 0 ? "bg-background" : "bg-red-50/40 dark:bg-red-950/15"}>
                      <TableCell className="text-sm leading-snug">{row.violation}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{row.rule}</TableCell>
                      <TableCell className="font-mono text-red-700 dark:text-red-400 text-sm">
                        {row.deduction}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Compliance Tiers — Reward per Score</p>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Score</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Cash</TableHead>
                    <TableHead>GC</TableHead>
                    <TableHead>Rice</TableHead>
                    <TableHead>Total Reward</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SA_COMPLIANCE_REWARD_TIERS.map((row) => (
                    <TableRow key={row.tier}>
                      <TableCell>{row.score}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.tier}</Badge>
                      </TableCell>
                      <TableCell>{row.cash}</TableCell>
                      <TableCell>{row.gc}</TableCell>
                      <TableCell>{row.rice}</TableCell>
                      <TableCell className="font-medium">{row.totalReward}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {isAdmin && (
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                Rewards distributed by COO at last Monday training. Payroll tracks Cash separately from
                Non-Cash (GC/Rice/Token). Points floor at 0 — cannot go negative.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overtime (OT) Pay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Hourly rate:</strong> {SA_OT_REFERENCE.hourlyRate} ·{" "}
              <strong>Daily limit:</strong> {SA_OT_REFERENCE.dailyLimit} ·{" "}
              <strong>Monthly limit:</strong> {SA_OT_REFERENCE.monthlyLimit}
            </p>
            <p>
              <strong>Max payout:</strong> {SA_OT_REFERENCE.maxPayout}
            </p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              {SA_OT_REFERENCE.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Store Goal Bonus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Branch target:</strong> {SA_STORE_GOAL_REFERENCE.branchTarget}
            </p>
            <p>
              <strong>Bonus pool:</strong> {SA_STORE_GOAL_REFERENCE.bonusPool}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {SA_STORE_GOAL_REFERENCE.note}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Legends &amp; Min/Max Reference</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Minimum</TableHead>
                <TableHead>Maximum</TableHead>
                <TableHead className="min-w-[200px]">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SA_LEGENDS.map((row) => (
                <TableRow key={row.metric}>
                  <TableCell className="font-medium text-sm">{row.metric}</TableCell>
                  <TableCell className="text-sm">{row.minimum}</TableCell>
                  <TableCell className="text-sm">{row.maximum}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-violet-200 dark:border-violet-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{SA_SAMPLE_MONTH_KIM.title}</CardTitle>
          <CardDescription>{SA_SAMPLE_MONTH_KIM.context}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0 space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="min-w-[240px]">How</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SA_SAMPLE_MONTH_KIM.rows.map((row) => (
                <TableRow
                  key={row.component}
                  className={
                    row.component.includes("Store Goal")
                      ? "bg-emerald-50/80 dark:bg-emerald-950/20"
                      : row.component.includes("TOTAL")
                        ? "bg-foreground text-background font-semibold hover:bg-foreground"
                        : undefined
                  }
                >
                  <TableCell className={row.component.includes("TOTAL") ? "text-background" : ""}>
                    {row.component}
                  </TableCell>
                  <TableCell className={row.component.includes("TOTAL") ? "text-background font-mono" : "font-mono"}>
                    {row.amount}
                  </TableCell>
                  <TableCell
                    className={
                      row.component.includes("TOTAL")
                        ? "text-background/90 text-sm"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    {row.how}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-[11px] text-muted-foreground px-4 sm:px-0 leading-relaxed">
            <strong>Break reminder:</strong> {SA_SAMPLE_MONTH_KIM.breakReminder}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
