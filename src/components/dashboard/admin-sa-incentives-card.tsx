"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Sparkles,
  ChevronRight,
  Users,
  CheckCircle2,
  Clock,
  Target,
  AlertCircle,
} from "lucide-react";
import { useEmployeesStore } from "@/store/employees.store";
import { useAuthStore } from "@/store/auth.store";
import { checkPermission } from "@/lib/permissions";
import { aggregateAdminSaStats } from "@/lib/sa-dashboard-stats";
import { formatCurrency } from "@/lib/format";
import { useRoleHref } from "@/lib/hooks/use-role-href";
import { SA_STORE_GOAL_THRESHOLD } from "@/lib/sa-commission";
import type { SaPayoutRecord } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BRANCH_ID = "main";

export function AdminSaIncentivesCard() {
  const rh = useRoleHref();
  const currentUser = useAuthStore((s) => s.currentUser);
  const employees = useEmployeesStore((s) => s.employees);
  const canManagePayroll = checkPermission(currentUser.role, "page:payroll");
  const month = format(new Date(), "yyyy-MM");

  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<SaPayoutRecord[]>([]);
  const [branchTotalSales, setBranchTotalSales] = useState(0);
  const [pendingOt, setPendingOt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/sa-commission/cycles?month=${encodeURIComponent(month)}&branchId=${BRANCH_ID}`,
      { credentials: "include", cache: "no-store" },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setPayouts((data?.payouts as SaPayoutRecord[]) ?? []);
        setBranchTotalSales(Number(data?.cycle?.branchTotalSales ?? 0));
        const otMap = (data?.cycle?.otApprovalsByEmployee ?? {}) as Record<
          string,
          Array<{ status: string }>
        >;
        const pending = Object.values(otMap)
          .flat()
          .filter((a) => a.status === "pending").length;
        setPendingOt(pending);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const nameMap = useMemo(() => {
    const m: Record<string, string> = {};
    employees.forEach((e) => {
      m[e.id] = e.name;
    });
    return m;
  }, [employees]);

  const stats = useMemo(
    () =>
      aggregateAdminSaStats(
        month,
        BRANCH_ID,
        branchTotalSales,
        payouts,
        nameMap,
        pendingOt,
      ),
    [month, branchTotalSales, payouts, nameMap, pendingOt],
  );

  const payrollHref = canManagePayroll
    ? `${rh("/payroll")}?tab=sa-incentives`
    : null;

  return (
    <Card className="border border-violet-200/60 dark:border-violet-900/40 bg-gradient-to-br from-violet-50/50 via-background to-background dark:from-violet-950/15">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/15">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">SA Incentives — {format(new Date(), "MMMM yyyy")}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                POGRC branch · EOM variable pay overview
              </p>
            </div>
          </div>
          {payrollHref ? (
            <Link href={payrollHref}>
              <Button variant="outline" size="sm" className="text-xs gap-1 border-violet-300/50">
                Manage <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          ) : (
            <Badge variant="secondary" className="text-[10px]">Read-only</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg border bg-background/80 p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Users className="h-3 w-3" /> SAs tracked
                </p>
                <p className="text-xl font-bold mt-0.5">{stats.saCount}</p>
              </div>
              <div className="rounded-lg border bg-background/80 p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Variable (all)
                </p>
                <p className="text-lg font-bold tabular-nums mt-0.5 text-violet-700 dark:text-violet-300">
                  {formatCurrency(stats.totalVariableCash)}
                </p>
              </div>
              <div className="rounded-lg border bg-background/80 p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Approved
                </p>
                <p className="text-xl font-bold mt-0.5">{stats.approvedCount + stats.processedCount}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatCurrency(stats.totalPayrollAddon)} payroll add-on
                </p>
              </div>
              <div className="rounded-lg border bg-background/80 p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Draft
                </p>
                <p className="text-xl font-bold mt-0.5">{stats.draftCount}</p>
                {stats.pendingOtApprovals > 0 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    {stats.pendingOtApprovals} OT pending
                  </p>
                )}
              </div>
            </div>

            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                stats.storeGoalHit
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                  : "bg-muted/50 border border-border/50 text-muted-foreground"
              }`}
            >
              <Target className="h-3.5 w-3.5 shrink-0" />
              {stats.storeGoalHit ? (
                <span>
                  Store goal hit — {formatCurrency(stats.branchTotalSales)} /{" "}
                  {formatCurrency(SA_STORE_GOAL_THRESHOLD)}
                </span>
              ) : (
                <span>
                  Store goal: {formatCurrency(stats.branchTotalSales)} of{" "}
                  {formatCurrency(SA_STORE_GOAL_THRESHOLD)}
                  {stats.branchTotalSales > 0 ? "" : " — enter branch sales in payroll"}
                </span>
              )}
            </div>

            {stats.topPerformers.length > 0 ? (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">SA</TableHead>
                      <TableHead className="text-xs">Tier</TableHead>
                      <TableHead className="text-xs">Sales</TableHead>
                      <TableHead className="text-xs text-right">Variable</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.topPerformers.map((row) => (
                      <TableRow key={row.employeeId}>
                        <TableCell className="text-sm font-medium py-2">{row.name}</TableCell>
                        <TableCell className="text-xs py-2">{row.complianceTier}</TableCell>
                        <TableCell className="text-xs py-2">{row.salesLevel}</TableCell>
                        <TableCell className="text-xs text-right font-mono py-2 text-violet-700 dark:text-violet-300">
                          {formatCurrency(row.variableCash)}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-[9px] capitalize">
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
                <AlertCircle className="h-4 w-4" />
                No SA payout data for this month yet.
                {canManagePayroll && " Open Payroll → SA Incentives to set up."}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
