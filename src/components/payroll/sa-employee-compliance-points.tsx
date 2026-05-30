"use client";

import {
  computeComplianceScore,
  type SaComplianceDeducted,
  type SaComplianceEarned,
} from "@/lib/sa-commission";
import {
  SA_COMPLIANCE_DEDUCT_RULES,
  SA_COMPLIANCE_EARN_RULES,
  SA_COMPLIANCE_REWARD_TIERS,
} from "@/lib/sa-incentives-reference";
import type { SaWeekEarnGrid } from "@/lib/sa-compliance-weeks";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";

const WEEK_LABELS = ["Week 1", "Week 2", "Week 3", "Week 4"] as const;

const WEEK_FLAG_LABELS: Record<string, string> = {
  attendance: "On-time all week",
  grooming: "Grooming correct",
  floor: "No floor rule breaks",
  photo: "Photos submitted",
  groupchat: "Group chat replies",
  commitment: "Commitment card",
  cashier: "Cashier duty",
  highestSalesWin: "Highest sales win",
};

type Props = {
  earned: SaComplianceEarned;
  deducted: SaComplianceDeducted;
  weekGrid?: SaWeekEarnGrid | null;
};

export function SaEmployeeCompliancePoints({ earned, deducted, weekGrid }: Props) {
  const result = computeComplianceScore(earned, deducted);
  const activeViolations = SA_COMPLIANCE_DEDUCT_RULES.filter(
    (rule) => (deducted[rule.key] ?? 0) > 0,
  );
  const rewardTier =
    SA_COMPLIANCE_REWARD_TIERS.find((t) =>
      result.tier === "NI" ? t.tier === "NEEDS IMPROVEMENT" : t.tier === result.tier,
    ) ?? SA_COMPLIANCE_REWARD_TIERS[SA_COMPLIANCE_REWARD_TIERS.length - 1];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground">Earned</p>
            <p className="text-xl font-bold text-emerald-600">+{result.earnedPoints}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground">Deducted</p>
            <p className="text-xl font-bold text-red-600">−{result.deductedPoints}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground">Score</p>
            <p className="text-xl font-bold">{result.score}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground">Tier</p>
            <Badge className="mt-1">{result.tier}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your awards ({result.tier})</CardTitle>
          <CardDescription>{rewardTier.totalReward}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reward</TableHead>
                <TableHead>Cash</TableHead>
                <TableHead>GC</TableHead>
                <TableHead>Rice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{result.tier}</TableCell>
                <TableCell>{result.cash > 0 ? formatCurrency(result.cash) : "—"}</TableCell>
                <TableCell>{result.gc > 0 ? formatCurrency(result.gc) : "—"}</TableCell>
                <TableCell>{result.rice > 0 ? formatCurrency(result.rice) : "—"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {weekGrid && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly earn tracking</CardTitle>
            <CardDescription>OIC/COO validated checkboxes per week (read-only)</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Criterion</TableHead>
                  {WEEK_LABELS.map((w) => (
                    <TableHead key={w} className="text-center text-xs">
                      {w}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(WEEK_FLAG_LABELS).map(([key, label]) => (
                  <TableRow key={key}>
                    <TableCell className="text-sm">{label}</TableCell>
                    {weekGrid.map((week, wi) => {
                      const checked = week[key as keyof typeof week];
                      return (
                        <TableCell key={wi} className="text-center">
                          {checked ? (
                            <Check className="h-4 w-4 text-emerald-600 inline" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/40 inline" />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Earn points summary</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>What you earned</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SA_COMPLIANCE_EARN_RULES.map((rule) => {
                const count = earned[rule.key] ?? 0;
                const pts = count * rule.points;
                if (count <= 0) return null;
                return (
                  <TableRow key={rule.key}>
                    <TableCell className="text-sm">{rule.description}</TableCell>
                    <TableCell className="text-right font-mono">{count}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">+{pts}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className={activeViolations.length > 0 ? "border-red-200 dark:border-red-900" : undefined}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Violations this month</CardTitle>
          <CardDescription>
            {activeViolations.length === 0
              ? "No recorded violations — keep it up!"
              : `${activeViolations.length} violation type(s) recorded by OIC/COO`}
          </CardDescription>
        </CardHeader>
        {activeViolations.length > 0 && (
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Violation</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead className="text-right">Times</TableHead>
                  <TableHead className="text-right">Deduction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeViolations.map((rule) => {
                  const times = deducted[rule.key] ?? 0;
                  const perMatch = rule.deduction.match(/(\d+)/);
                  const perPts = perMatch ? Number(perMatch[1]) : 5;
                  return (
                    <TableRow key={rule.key}>
                      <TableCell className="text-sm">{rule.violation}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{rule.rule}</TableCell>
                      <TableCell className="text-right font-mono">{times}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        −{times * perPts}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
