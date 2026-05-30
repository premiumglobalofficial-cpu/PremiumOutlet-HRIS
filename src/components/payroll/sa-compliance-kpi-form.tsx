"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  computeComplianceScore,
  type SaComplianceDeducted,
  type SaComplianceEarned,
} from "@/lib/sa-commission";
import {
  SA_COMPLIANCE_DEDUCT_RULES,
  SA_COMPLIANCE_EARN_RULES,
  SA_COMPLIANCE_HEADER,
} from "@/lib/sa-incentives-reference";

type Props = {
  employees: { id: string; name: string }[];
  employeeId: string;
  onEmployeeChange: (id: string) => void;
  earned: SaComplianceEarned;
  deducted: SaComplianceDeducted;
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
  ) => void;
};

export function SaComplianceKpiForm({
  employees,
  employeeId,
  onEmployeeChange,
  earned: initialEarned,
  deducted: initialDeducted,
  kpi: initialKpi,
  onSave,
}: Props) {
  const [earned, setEarned] = useState(initialEarned);
  const [deducted, setDeducted] = useState(initialDeducted);
  const [kpi, setKpi] = useState(initialKpi);

  useEffect(() => {
    setEarned(initialEarned);
    setDeducted(initialDeducted);
    setKpi(initialKpi);
  }, [employeeId, initialEarned, initialDeducted, initialKpi]);

  const scorePreview = useMemo(
    () => computeComplianceScore(earned, deducted),
    [earned, deducted],
  );

  if (employees.length === 0) return null;

  const selectedName = employees.find((e) => e.id === employeeId)?.name ?? "SA";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance &amp; KPI entry — manual scoring guide</CardTitle>
        <CardDescription>
          {SA_COMPLIANCE_HEADER} Enter monthly totals per criterion below. OIC/COO/HR use the
          reference wording to score each employee consistently.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1 min-w-[200px]">
            <Label>Employee (SA)</Label>
            <Select value={employeeId} onValueChange={onEmployeeChange}>
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
              {scorePreview.cash > 0 && (
                <span className="block text-emerald-700 dark:text-emerald-400 font-medium">
                  Cash reward ₱{scorePreview.cash.toLocaleString()}
                </span>
              )}
              {(scorePreview.gc > 0 || scorePreview.rice > 0) && (
                <span className="block">
                  Non-cash: GC ₱{scorePreview.gc} · Rice ₱{scorePreview.rice}
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">EARN Points — enter counts for {selectedName}</p>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-emerald-700 hover:bg-emerald-700">
                  <TableHead className="text-white min-w-[260px]">What the SA Does</TableHead>
                  <TableHead className="text-white w-16">Pts</TableHead>
                  <TableHead className="text-white w-20">Per</TableHead>
                  <TableHead className="text-white w-24">Max/Mo</TableHead>
                  <TableHead className="text-white w-28">Count</TableHead>
                  <TableHead className="text-white w-20">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SA_COMPLIANCE_EARN_RULES.map((row, i) => {
                  const count = earned[row.key];
                  const capped =
                    row.maxWeeks != null ? Math.min(count, row.maxWeeks) : count;
                  const subtotal = capped * row.points;
                  return (
                    <TableRow key={row.key} className={i % 2 === 0 ? "" : "bg-muted/25"}>
                      <TableCell className="text-sm leading-snug">{row.description}</TableCell>
                      <TableCell className="font-mono text-emerald-700 dark:text-emerald-400">
                        +{row.points}
                      </TableCell>
                      <TableCell className="text-xs">{row.per}</TableCell>
                      <TableCell className="text-xs font-medium">{row.maxPerMonth}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={row.maxWeeks}
                          className="h-8 w-20"
                          value={count}
                          aria-label={row.description}
                          onChange={(e) =>
                            setEarned((s) => ({
                              ...s,
                              [row.key]: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">+{subtotal}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Weekly fields = number of qualifying weeks (0–4). Training = sessions. Proactive = incidents
            (no monthly cap).
          </p>
        </div>

        <div>
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
                  const subtotal = count * ptsEach;
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
                          value={count}
                          aria-label={row.violation}
                          onChange={(e) =>
                            setDeducted((s) => ({
                              ...s,
                              [row.key]: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-red-700 dark:text-red-400">
                        −{subtotal}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">KPI (store goal pool — regular SAs only)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
        </div>

        <Button type="button" onClick={() => onSave(earned, deducted, kpi)} disabled={!employeeId}>
          Save compliance &amp; KPI for {selectedName}
        </Button>
      </CardContent>
    </Card>
  );
}
