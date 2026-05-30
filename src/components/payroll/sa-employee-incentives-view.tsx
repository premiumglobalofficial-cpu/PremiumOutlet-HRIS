"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Sparkles, BookOpen, Wallet } from "lucide-react";
import { fetchMySaPayout } from "@/services/sa-commission.service";
import { useSaCommissionStore } from "@/store/sa-commission.store";
import { toPayrollIncentiveAllowances } from "@/lib/sa-commission";
import { SaIncentivesReferenceTables } from "@/components/payroll/sa-incentives-reference-tables";
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
import type { SaPayoutRecord } from "@/types";

type Props = {
  employeeId: string;
  employeeName: string;
};

export function SaEmployeeIncentivesView({ employeeId, employeeName }: Props) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [remotePayout, setRemotePayout] = useState<SaPayoutRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const getPayoutForEmployee = useSaCommissionStore((s) => s.getPayoutForEmployee);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchMySaPayout(month).then(({ payout }) => {
      if (!cancelled) {
        setRemotePayout(payout);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [month, employeeId]);

  const localPayout = useMemo(
    () => getPayoutForEmployee(month, employeeId),
    [getPayoutForEmployee, month, employeeId],
  );

  const payout = useMemo(() => {
    const candidates = [remotePayout, localPayout].filter(Boolean) as SaPayoutRecord[];
    const visible = candidates.find(
      (p) => p.status === "approved" || p.status === "processed",
    );
    return visible ?? null;
  }, [remotePayout, localPayout]);

  const b = payout?.breakdown;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          SA Incentives &amp; Points
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Read-only view for {employeeName}. Approved payouts appear after COO approval. Variable pay
          is released on end-of-month (2nd cutoff) payroll.
        </p>
      </div>

      <div className="space-y-1 max-w-[180px]">
        <Label>Month</Label>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <Tabs defaultValue="my-payout" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="my-payout" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            My Payout
          </TabsTrigger>
          <TabsTrigger value="points-guide" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Points &amp; Policy Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-payout" className="mt-4 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading incentive data…</p>
          ) : !payout || !b ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No approved incentive payout for {month} yet. Your COO will review and approve
                month-end totals before they appear here and on your EOM payslip.
              </CardContent>
            </Card>
          ) : (
            <Card className="border-violet-200 dark:border-violet-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base">Your approved payout — {month}</CardTitle>
                  <Badge variant={payout.status === "processed" ? "default" : "secondary"}>
                    {payout.status === "processed" ? "Paid via payroll" : "Approved — pending EOM run"}
                  </Badge>
                </div>
                <CardDescription>
                  Cash components below are added to your EOM payslip allowances. GC and rice are
                  non-cash handoffs from COO.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Base salary (reference)</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(b.baseSalary)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        Sales commission ({b.salesLevel}, {b.achievementPct}%)
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(b.salesCommission)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Overtime pay</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(b.otPay)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        Compliance cash ({b.complianceTier}, {b.complianceScore} pts)
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(b.complianceCash)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Compliance grocery GC</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(b.complianceGc)} (non-cash)
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Compliance 5kg rice</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(b.complianceRice)} (non-cash)
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Store goal bonus share</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(b.storeGoalShare)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="font-semibold bg-violet-50/50 dark:bg-violet-950/20">
                      <TableCell>EOM payroll add-on (variable cash)</TableCell>
                      <TableCell className="text-right font-mono text-violet-700 dark:text-violet-300">
                        {formatCurrency(toPayrollIncentiveAllowances(b))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
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
