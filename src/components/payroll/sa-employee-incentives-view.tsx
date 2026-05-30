"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Sparkles, BookOpen, Wallet, History, BarChart3 } from "lucide-react";
import { fetchMySaIncentives, type MySaIncentivesResponse } from "@/services/sa-commission.service";
import { SaIncentivesReferenceTables } from "@/components/payroll/sa-incentives-reference-tables";
import { SaEmployeeCompliancePoints } from "@/components/payroll/sa-employee-compliance-points";
import {
  buildSaFullPictureContextLine,
  buildSaFullPictureRows,
} from "@/lib/sa-employee-payout-display";
import { SA_BREAK_REMINDER } from "@/lib/break-policy";
import type { SaWeekEarnGrid } from "@/lib/sa-compliance-weeks";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  employeeId: string;
  employeeName: string;
};

export function SaEmployeeIncentivesView({ employeeId, employeeName }: Props) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [activeTab, setActiveTab] = useState("full-picture");
  const [data, setData] = useState<MySaIncentivesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchMySaIncentives(month).then((res) => {
      if (!cancelled) {
        setData(res);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [month, employeeId]);

  const payout = data?.payout ?? null;
  const b = payout?.breakdown;
  const isOfficial = payout?.status === "approved" || payout?.status === "processed";

  const fullPicture = useMemo(() => {
    if (!b || !data) return null;
    const ctx = {
      branchLabel: data.branchLabel,
      month: data.month,
      storeGoalHit: data.storeGoalHit,
      otHoursTotal: data.otHoursTotal,
    };
    return {
      contextLine: buildSaFullPictureContextLine(
        ctx,
        employeeName,
        data.salesTotal,
        b.complianceScore,
        b.complianceTier,
      ),
      rows: buildSaFullPictureRows(b, ctx),
    };
  }, [b, data, employeeName]);

  const weekGrid = (data?.compliance?.weekGrid as SaWeekEarnGrid | null) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          SA Incentives &amp; Points
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track your compliance score, violations, and month-end payout. Variable pay is released on
          EOM (2nd cutoff) payroll after COO approval.
        </p>
      </div>

      <div className="space-y-1 max-w-[180px]">
        <Label>Month</Label>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="full-picture" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Full Picture
          </TabsTrigger>
          <TabsTrigger value="my-points" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Points &amp; Violations
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-3.5 w-3.5" />
            History
          </TabsTrigger>
          <TabsTrigger value="points-guide" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Policy Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="full-picture" className="mt-4 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading incentive data…</p>
          ) : !payout || !b || !fullPicture ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No incentive data for {month} yet. OIC/COO will enter sales, compliance, and OT
                before month-end review.
              </CardContent>
            </Card>
          ) : (
            <Card className="border-violet-200 dark:border-violet-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base">FULL PICTURE — All 4 Components</CardTitle>
                  <Badge
                    variant={
                      payout.status === "processed"
                        ? "default"
                        : payout.status === "approved"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {payout.status === "processed"
                      ? "Paid via payroll"
                      : payout.status === "approved"
                        ? "Approved — pending EOM run"
                        : "Draft preview — subject to COO approval"}
                  </Badge>
                </div>
                <CardDescription className="text-xs leading-relaxed">{fullPicture.contextLine}</CardDescription>
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
                    {fullPicture.rows.map((row) => (
                      <TableRow
                        key={row.component}
                        className={
                          row.tone === "storeGoal"
                            ? "bg-emerald-50/80 dark:bg-emerald-950/20"
                            : row.tone === "total"
                              ? "bg-foreground text-background font-semibold hover:bg-foreground"
                              : undefined
                        }
                      >
                        <TableCell className={row.tone === "total" ? "text-background" : ""}>
                          {row.component}
                        </TableCell>
                        <TableCell
                          className={
                            row.tone === "total"
                              ? "text-background font-mono"
                              : row.tone === "incentive"
                                ? "font-mono text-amber-700 dark:text-amber-400"
                                : "font-mono"
                          }
                        >
                          {row.amount}
                        </TableCell>
                        <TableCell
                          className={
                            row.tone === "total"
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
                  <strong>Break reminder:</strong> {SA_BREAK_REMINDER}
                </p>
                {!isOfficial && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 px-4 sm:px-0">
                    This is a live preview from OIC/COO entries. Final amounts are confirmed when
                    COO approves your payout.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-points" className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading points…</p>
          ) : !data?.compliance ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No compliance tracking for {month} yet.
              </CardContent>
            </Card>
          ) : (
            <SaEmployeeCompliancePoints
              earned={data.compliance.earned}
              deducted={data.compliance.deducted}
              weekGrid={weekGrid}
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading history…</p>
          ) : !data?.history?.length ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No approved payout history yet.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Payout history</CardTitle>
                <CardDescription>Approved and processed SA incentive months</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Sales level</TableHead>
                      <TableHead className="text-right">Total cash</TableHead>
                      <TableHead className="text-right">Variable cash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.history.map((h) => (
                      <TableRow
                        key={h.month}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setMonth(h.month);
                          setActiveTab("full-picture");
                        }}
                      >
                        <TableCell className="font-medium">{h.month}</TableCell>
                        <TableCell>
                          <Badge variant={h.status === "processed" ? "default" : "secondary"}>
                            {h.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {h.complianceTier} ({h.complianceScore} pts)
                        </TableCell>
                        <TableCell>{h.salesLevel.replace("_", " ")}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(h.cashTotal)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-violet-700 dark:text-violet-300">
                          {formatCurrency(h.variableCash)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-2">
                  Tap a row to open the full computation breakdown for that month.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="points-guide" className="mt-4">
          <SaIncentivesReferenceTables audience="employee" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
