"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  computeComplianceScore,
  type SaComplianceDeducted,
  type SaComplianceEarned,
} from "@/lib/sa-commission";
import {
  aggregateWeekGridToEarned,
  emptyWeekGrid,
  weekGridFromMonthlyEarned,
  type SaWeekEarnFlags,
  type SaWeekEarnGrid,
} from "@/lib/sa-compliance-weeks";
import {
  SA_COMPLIANCE_DEDUCT_RULES,
  SA_COMPLIANCE_EARN_RULES,
  SA_COMPLIANCE_HEADER,
} from "@/lib/sa-incentives-reference";
import { Lock } from "lucide-react";

const WEEK_FLAG_KEYS: Array<{
  flag: keyof SaWeekEarnFlags;
  ruleIndex: number;
}> = [
  { flag: "attendance", ruleIndex: 0 },
  { flag: "grooming", ruleIndex: 1 },
  { flag: "floor", ruleIndex: 2 },
  { flag: "photo", ruleIndex: 3 },
  { flag: "groupchat", ruleIndex: 4 },
  { flag: "commitment", ruleIndex: 5 },
  { flag: "cashier", ruleIndex: 8 },
  { flag: "highestSalesWin", ruleIndex: 9 },
];

type Props = {
  employees: { id: string; name: string }[];
  employeeId: string;
  onEmployeeChange: (id: string) => void;
  earned: SaComplianceEarned;
  deducted: SaComplianceDeducted;
  weekGrid?: SaWeekEarnGrid;
  locked?: boolean;
  kpi: {
    unitsSold: number;
    revenue: number;
    upsells: number;
    commendations: number;
    complaints: number;
    shiftsWorked: number;
  };
  onSave: (
    earned: SaComplianceEarned,
    deducted: SaComplianceDeducted,
    kpi: Props["kpi"],
    weekGrid?: SaWeekEarnGrid,
  ) => void;
};

export function SaComplianceKpiForm({
  employees,
  employeeId,
  onEmployeeChange,
  earned: initialEarned,
  deducted: initialDeducted,
  weekGrid: initialWeekGrid,
  locked = false,
  kpi: initialKpi,
  onSave,
}: Props) {
  const [earned, setEarned] = useState(initialEarned);
  const [deducted, setDeducted] = useState(initialDeducted);
  const [kpi, setKpi] = useState(initialKpi);
  const [weekGrid, setWeekGrid] = useState<SaWeekEarnGrid>(
    initialWeekGrid ?? weekGridFromMonthlyEarned(initialEarned),
  );
  const [trainingSessions, setTrainingSessions] = useState(initialEarned.trainingSessions);
  const [proactiveIncidents, setProactiveIncidents] = useState(initialEarned.proactiveIncidents);

  useEffect(() => {
    setEarned(initialEarned);
    setDeducted(initialDeducted);
    setKpi(initialKpi);
    setWeekGrid(initialWeekGrid ?? weekGridFromMonthlyEarned(initialEarned));
    setTrainingSessions(initialEarned.trainingSessions);
    setProactiveIncidents(initialEarned.proactiveIncidents);
  }, [employeeId, initialEarned, initialDeducted, initialKpi, initialWeekGrid]);

  const effectiveEarned = useMemo(
    () => aggregateWeekGridToEarned(weekGrid, trainingSessions, proactiveIncidents),
    [weekGrid, trainingSessions, proactiveIncidents],
  );

  const scorePreview = useMemo(
    () => computeComplianceScore(effectiveEarned, deducted),
    [effectiveEarned, deducted],
  );

  if (employees.length === 0) return null;

  const selectedName = employees.find((e) => e.id === employeeId)?.name ?? "SA";

  const handleSave = () => {
    onSave(effectiveEarned, deducted, kpi, weekGrid);
  };

  const toggleWeekFlag = (weekIdx: number, flag: keyof SaWeekEarnFlags, checked: boolean) => {
    setWeekGrid((prev) => {
      const next = prev.map((w) => ({ ...w })) as SaWeekEarnGrid;
      next[weekIdx] = { ...next[weekIdx], [flag]: checked };
      return next;
    });
  };

  return (
    <Card className={locked ? "opacity-90 border-amber-300/50" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          Compliance &amp; KPI entry — manual scoring guide
          {locked && (
            <Badge variant="outline" className="gap-1 text-amber-700 border-amber-400">
              <Lock className="h-3 w-3" />
              Locked (approved)
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {SA_COMPLIANCE_HEADER} Use the <strong>Weekly grid</strong> for OIC daily/Friday
          validation, or monthly totals for quick entry.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1 min-w-[200px]">
            <Label>Employee (SA)</Label>
            <Select value={employeeId} onValueChange={onEmployeeChange} disabled={locked}>
              <SelectTrigger>
                <SelectValue placeholder="Select SA" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border bg-muted/40 px-4 py-2.5 flex flex-wrap gap-4 items-center">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">Live score</p>
              <p className="text-2xl font-bold tabular-nums">{scorePreview.score}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">Tier</p>
              <Badge variant="secondary" className="mt-1">
                {scorePreview.tier}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              +{scorePreview.earnedPoints} earned · −{scorePreview.deductedPoints} deducted
            </div>
          </div>
        </div>

        <Tabs defaultValue="weekly">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="weekly">Weekly grid (4 weeks)</TabsTrigger>
            <TabsTrigger value="violations">Violations (13)</TabsTrigger>
            <TabsTrigger value="monthly">Monthly totals</TabsTrigger>
            <TabsTrigger value="kpi">KPI</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-4 space-y-4">
            <p className="text-sm font-semibold">EARN Points — check each qualifying week for {selectedName}</p>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-emerald-700 hover:bg-emerald-700">
                    <TableHead className="text-white min-w-[260px]">What the SA Does</TableHead>
                    <TableHead className="text-white w-14">Pts</TableHead>
                    <TableHead className="text-white w-14 text-center">W1</TableHead>
                    <TableHead className="text-white w-14 text-center">W2</TableHead>
                    <TableHead className="text-white w-14 text-center">W3</TableHead>
                    <TableHead className="text-white w-14 text-center">W4</TableHead>
                    <TableHead className="text-white w-16">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {WEEK_FLAG_KEYS.map(({ flag, ruleIndex }, i) => {
                    const rule = SA_COMPLIANCE_EARN_RULES[ruleIndex];
                    const total = weekGrid.filter((w) => w[flag]).length;
                    return (
                      <TableRow key={flag} className={i % 2 === 0 ? "" : "bg-muted/25"}>
                        <TableCell className="text-sm leading-snug">{rule.description}</TableCell>
                        <TableCell className="font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                          +{rule.points}
                        </TableCell>
                        {[0, 1, 2, 3].map((wi) => (
                          <TableCell key={wi} className="text-center">
                            <Checkbox
                              checked={weekGrid[wi][flag]}
                              disabled={locked}
                              aria-label={`${rule.description} week ${wi + 1}`}
                              onCheckedChange={(c) => toggleWeekFlag(wi, flag, c === true)}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="font-mono text-sm tabular-nums">+{total * rule.points}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
              <div>
                <Label className="text-xs">Attended Monday training session (+5 per session)</Label>
                <Input
                  type="number"
                  min={0}
                  className="h-8 mt-1"
                  disabled={locked}
                  value={trainingSessions}
                  onChange={(e) => setTrainingSessions(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div>
                <Label className="text-xs">Did something extra, flagged by OIC or COO (+5 per incident)</Label>
                <Input
                  type="number"
                  min={0}
                  className="h-8 mt-1"
                  disabled={locked}
                  value={proactiveIncidents}
                  onChange={(e) => setProactiveIncidents(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="violations" className="mt-4">
            <p className="text-sm font-semibold mb-2">LOSE Points — violation counts for {selectedName}</p>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-red-800 hover:bg-red-800">
                    <TableHead className="text-white min-w-[260px]">Violation</TableHead>
                    <TableHead className="text-white w-20">Rule</TableHead>
                    <TableHead className="text-white w-36">Deduction</TableHead>
                    <TableHead className="text-white w-28">Count</TableHead>
                    <TableHead className="text-white w-20">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SA_COMPLIANCE_DEDUCT_RULES.map((row, i) => {
                    const count = deducted[row.key];
                    const ptsEach =
                      row.key === "zoneUncovered" ||
                      row.key === "missedTraining" ||
                      row.key === "repeatedViolation" ||
                      row.key === "cashShortage" ||
                      row.key === "counterUnattended"
                        ? 10
                        : 5;
                    return (
                      <TableRow key={row.key} className={i % 2 === 0 ? "" : "bg-red-50/30 dark:bg-red-950/10"}>
                        <TableCell className="text-sm leading-snug">{row.violation}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.rule}</TableCell>
                        <TableCell className="font-mono text-red-700 dark:text-red-400 text-xs">
                          {row.deduction}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            className="h-8 w-20"
                            disabled={locked}
                            value={count}
                            onChange={(e) =>
                              setDeducted((s) => ({
                                ...s,
                                [row.key]: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm tabular-nums text-red-700 dark:text-red-400">
                          −{count * ptsEach}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Derived from weekly grid + session/incident counts (read-only preview).
            </p>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criterion</TableHead>
                    <TableHead className="text-right">Weeks / Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SA_COMPLIANCE_EARN_RULES.map((rule) => {
                    const key = rule.key;
                    const val = effectiveEarned[key];
                    return (
                      <TableRow key={key}>
                        <TableCell className="text-sm">{rule.description}</TableCell>
                        <TableCell className="text-right font-mono">{val}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="kpi" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-2xl">
              {(
                [
                  ["unitsSold", "Units sold"],
                  ["revenue", "Revenue (₱)"],
                  ["upsells", "Upsells"],
                  ["commendations", "Commendations"],
                  ["complaints", "Complaints"],
                  ["shiftsWorked", "Shifts worked"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <Input
                    type="number"
                    min={0}
                    className="h-8"
                    disabled={locked}
                    value={kpi[key]}
                    onChange={(e) =>
                      setKpi((s) => ({
                        ...s,
                        [key]: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Button type="button" onClick={handleSave} disabled={!employeeId || locked}>
          Save compliance &amp; KPI for {selectedName}
        </Button>
      </CardContent>
    </Card>
  );
}
