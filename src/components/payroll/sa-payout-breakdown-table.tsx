"use client";

import {
  buildSaFullPictureContextLine,
  buildSaFullPictureRows,
  formatSaMonthLabel,
} from "@/lib/sa-employee-payout-display";
import type { SaMonthlyPayoutBreakdown } from "@/lib/sa-commission";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  employeeName: string;
  month: string;
  branchLabel: string;
  storeGoalHit: boolean;
  salesTotal: number;
  otHoursTotal: number;
  breakdown: SaMonthlyPayoutBreakdown;
};

export function SaPayoutBreakdownTable({
  employeeName,
  month,
  branchLabel,
  storeGoalHit,
  salesTotal,
  otHoursTotal,
  breakdown,
}: Props) {
  const ctx = {
    branchLabel,
    month,
    storeGoalHit,
    otHoursTotal,
  };
  const contextLine = buildSaFullPictureContextLine(
    ctx,
    employeeName,
    salesTotal,
    breakdown.complianceScore,
    breakdown.complianceTier,
  );
  const rows = buildSaFullPictureRows(breakdown, ctx);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">{contextLine}</p>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="min-w-[220px]">How</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
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
                <TableCell className={row.tone === "total" ? "text-background text-sm" : "text-sm"}>
                  {row.component}
                </TableCell>
                <TableCell
                  className={
                    row.tone === "total"
                      ? "text-background font-mono"
                      : row.tone === "incentive"
                        ? "font-mono text-amber-700 dark:text-amber-400"
                        : "font-mono text-sm"
                  }
                >
                  {row.amount}
                </TableCell>
                <TableCell
                  className={
                    row.tone === "total"
                      ? "text-background/90 text-xs"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {row.how}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {formatSaMonthLabel(month)} · EOM variable pay on 2nd cutoff after COO approval
      </p>
    </div>
  );
}
