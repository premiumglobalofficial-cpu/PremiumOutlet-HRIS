"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Sparkles, ChevronRight, TrendingUp, Award, Target } from "lucide-react";
import { fetchMySaIncentives } from "@/services/sa-commission.service";
import { aggregateEmployeeSaStats } from "@/lib/sa-dashboard-stats";
import { formatCurrency } from "@/lib/format";
import { useRoleHref } from "@/lib/hooks/use-role-href";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function EmployeeSaIncentivesCard() {
  const rh = useRoleHref();
  const month = format(new Date(), "yyyy-MM");
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState<ReturnType<typeof aggregateEmployeeSaStats> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchMySaIncentives(month).then((data) => {
      if (cancelled) return;
      if (!data?.employeeId) {
        setVisible(false);
        setLoading(false);
        return;
      }
      setVisible(true);
      setStats(
        aggregateEmployeeSaStats(
          month,
          data.payout,
          data.history,
          data.salesTotal,
          data.otHoursTotal,
        ),
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const maxTrend = useMemo(
    () => Math.max(1, ...(stats?.monthlyTrend.map((t) => t.variableCash) ?? [1])),
    [stats],
  );

  if (!loading && !visible) return null;

  return (
    <Card className="border border-violet-200/70 dark:border-violet-800/50 bg-gradient-to-br from-violet-50/80 via-background to-background dark:from-violet-950/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">SA Incentives</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monthly variable pay · EOM (2nd cutoff)
              </p>
            </div>
          </div>
          <Link href={`${rh("/my-payslips")}?tab=sa-incentives`}>
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-violet-700 dark:text-violet-300">
              Full breakdown <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading || !stats ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-violet-200/60 dark:border-violet-800/40 bg-background/80 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  This month (variable)
                </p>
                <p className="text-2xl font-bold tabular-nums mt-1 text-violet-700 dark:text-violet-300">
                  {stats.hasData ? formatCurrency(stats.variableCash) : "—"}
                </p>
                {stats.hasData && (
                  <Badge variant="outline" className="mt-2 text-[10px] capitalize">
                    {stats.status}
                  </Badge>
                )}
              </div>
              <div className="rounded-xl border bg-background/80 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  <Award className="h-3 w-3" /> Compliance
                </p>
                <p className="text-xl font-bold mt-1">{stats.hasData ? stats.complianceScore : "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats.hasData ? `${stats.complianceTier} tier` : "Pending OIC entry"}
                </p>
              </div>
              <div className="rounded-xl border bg-background/80 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> YTD variable
                </p>
                <p className="text-xl font-bold tabular-nums mt-1">
                  {formatCurrency(stats.ytdVariableCash)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats.ytdMonthsPaid} approved month{stats.ytdMonthsPaid !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {stats.hasData && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary" className="gap-1">
                  <Target className="h-3 w-3" />
                  Sales: {formatCurrency(stats.salesTotal)} · {stats.salesLevel}
                </Badge>
                <Badge variant="secondary">OT: {stats.otHoursTotal} hrs</Badge>
                <Badge variant="secondary">
                  Full picture: {formatCurrency(stats.displayCashTotal)}
                </Badge>
              </div>
            )}

            {stats.monthlyTrend.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                  Recent months (variable cash)
                </p>
                <div className="flex items-end gap-1.5 h-14">
                  {stats.monthlyTrend.map((t) => (
                    <div key={t.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <div
                        className="w-full rounded-t bg-violet-500/70 dark:bg-violet-400/60 min-h-[4px] transition-all"
                        style={{ height: `${Math.max(8, (t.variableCash / maxTrend) * 100)}%` }}
                        title={`${t.month}: ${formatCurrency(t.variableCash)}`}
                      />
                      <span className="text-[9px] text-muted-foreground">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!stats.hasData && (
              <p className="text-xs text-muted-foreground text-center py-2">
                OIC/COO will enter sales, compliance, and OT before month-end review.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
