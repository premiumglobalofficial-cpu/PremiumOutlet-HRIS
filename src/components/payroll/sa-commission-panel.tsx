"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useEmployeesStore } from "@/store/employees.store";
import { useSaCommissionStore } from "@/store/sa-commission.store";
import { useAuthStore } from "@/store/auth.store";
import {
  toPayrollIncentiveAllowances,
  SA_STORE_GOAL_THRESHOLD,
  type SaComplianceDeducted,
  type SaComplianceEarned,
} from "@/lib/sa-commission";
import { SaComplianceKpiForm } from "@/components/payroll/sa-compliance-kpi-form";
import { fetchSaCycle, persistSaCycle } from "@/services/sa-commission.service";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, Download, Info, Sparkles, BookOpen, Settings2 } from "lucide-react";
import { SA_EOM_BLOCKED_REASON, getSaVariableCapWarning } from "@/lib/sa-eom-policy";
import { SaIncentivesReferenceTables } from "@/components/payroll/sa-incentives-reference-tables";
import { SaOtApprovalPanel } from "@/components/payroll/sa-ot-approval-panel";
import {
  exportSaComplianceReport,
  exportSaKpiRanking,
  exportSaOtReport,
  exportSaOtSummaryByEmployee,
  exportSaPayoutReport,
  exportSaStoreGoalDashboard,
} from "@/lib/sa-report-export";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SaEmploymentType } from "@/types";

const BRANCHES = [
  { id: "main", label: "Main Branch" },
  { id: "north", label: "North Branch" },
  { id: "south", label: "South Branch" },
];

export function SaCommissionPanel() {
  const employees = useEmployeesStore((s) => s.employees);
  const currentUser = useAuthStore((s) => s.currentUser);
  const {
    profiles,
    cycles,
    upsertProfile,
    getOrCreateCycle,
    setBranchSales,
    setEmployeeSales,
    setEmployeeOtDays,
    setCompliance,
    setEmployeeKpi,
    approvePayout,
    recomputePayouts,
    getApprovedPayouts,
    replaceCycle,
    revertPayoutToDraft,
    addOtApproval,
    approveOtApproval,
    rejectOtApproval,
  } = useSaCommissionStore();

  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [branchId, setBranchId] = useState("main");
  const [complianceEmpId, setComplianceEmpId] = useState("");

  const cycle = useMemo(
    () => cycles.find((c) => c.month === month && c.branchId === branchId),
    [cycles, month, branchId],
  );

  const branchEmployees = useMemo(() => {
    return employees.filter(
      (e) =>
        e.status === "active" &&
        (e.department?.toLowerCase().includes("sales") ||
          e.jobTitle?.toLowerCase().includes("associate") ||
          profiles.some((p) => p.employeeId === e.id && p.isSalesAssociate)),
    );
  }, [employees, profiles]);

  useEffect(() => {
    if (branchEmployees.length > 0 && !complianceEmpId) {
      setComplianceEmpId(branchEmployees[0].id);
    }
  }, [branchEmployees, complianceEmpId]);

  const syncCycle = useCallback(async () => {
    const state = useSaCommissionStore.getState();
    const c = state.cycles.find((x) => x.month === month && x.branchId === branchId);
    if (!c) return;
    const branchProfiles = state.profiles.filter((p) => p.branchId === branchId);
    const result = await persistSaCycle(c, branchProfiles);
    if (!result.ok) toast.error(result.error ?? "Failed to sync SA cycle to database");
  }, [month, branchId]);

  useEffect(() => {
    let cancelled = false;
    void fetchSaCycle(month, branchId).then((remote) => {
      if (cancelled || !remote) return;
      const local = useSaCommissionStore
        .getState()
        .cycles.find((c) => c.month === month && c.branchId === branchId);
      if (!local) {
        replaceCycle(remote);
        return;
      }
      const remoteTs = new Date(remote.updatedAt).getTime();
      const localTs = new Date(local.updatedAt).getTime();
      if (remoteTs > localTs) replaceCycle(remote);
    });
    return () => {
      cancelled = true;
    };
  }, [month, branchId, replaceCycle]);

  const emptyEarned = (): SaComplianceEarned => ({
    attendanceWeeks: 0,
    groomingWeeks: 0,
    floorWeeks: 0,
    photoWeeks: 0,
    groupchatWeeks: 0,
    commitmentWeeks: 0,
    trainingSessions: 0,
    proactiveIncidents: 0,
    cashierWeeks: 0,
    highestSalesWins: 0,
  });

  const emptyDeducted = (): SaComplianceDeducted => ({
    lateArrival: 0,
    hairViolation: 0,
    uniformViolation: 0,
    zoneUncovered: 0,
    noGreeting: 0,
    phoneUse: 0,
    photoMissed: 0,
    groupchatMissed: 0,
    missedTraining: 0,
    lateKpiReport: 0,
    repeatedViolation: 0,
    cashShortage: 0,
    counterUnattended: 0,
  });

  const complianceEarned =
    cycle?.complianceEarned[complianceEmpId] ?? emptyEarned();
  const complianceDeducted =
    cycle?.complianceDeducted[complianceEmpId] ?? emptyDeducted();
  const complianceKpi = cycle?.kpiByEmployee[complianceEmpId] ?? {
    unitsSold: 0,
    revenue: 0,
    upsells: 0,
    commendations: 0,
    complaints: 0,
    shiftsWorked: 0,
  };
  const complianceWeekGrid = cycle?.complianceWeeksByEmployee?.[complianceEmpId];
  const complianceEmpPayout = cycle?.payouts.find((p) => p.employeeId === complianceEmpId);
  const complianceLocked =
    complianceEmpPayout?.status === "approved" || complianceEmpPayout?.status === "processed";
  const otApprovals = useMemo(
    () => Object.values(cycle?.otApprovalsByEmployee ?? {}).flat(),
    [cycle?.otApprovalsByEmployee],
  );
  const getEmpName = (id: string) => employees.find((e) => e.id === id)?.name ?? id;

  const ensureProfiles = () => {
    for (const emp of branchEmployees) {
      const existing = profiles.find((p) => p.employeeId === emp.id);
      if (!existing) {
        upsertProfile({
          employeeId: emp.id,
          branchId,
          employmentType: "regular",
          isSalesAssociate: true,
        });
      }
    }
  };

  const handleInitCycle = () => {
    ensureProfiles();
    getOrCreateCycle(month, branchId);
    recomputePayouts(month, branchId);
    void syncCycle();
    toast.success("SA cycle initialized");
  };

  const handleExportApproved = () => {
    const approved = getApprovedPayouts(month);
    if (approved.length === 0) {
      toast.error("No approved payouts for this month");
      return;
    }
    const lines = [
      "employee_id,month,branch,sales_commission,ot_pay,compliance_cash,store_goal,incentive_allowances,cash_total,non_cash,tier,status",
      ...approved.map((p) => {
        const b = p.breakdown;
        const incentives = toPayrollIncentiveAllowances(b);
        return [
          p.employeeId,
          p.month,
          p.branchId,
          b.salesCommission,
          b.otPay,
          b.complianceCash,
          b.storeGoalShare,
          incentives,
          b.cashTotal,
          b.nonCashTotal,
          b.complianceTier,
          p.status,
        ].join(",");
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sa-payout-${month}-approved.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported approved payouts for HR");
  };

  const handleExportAllReports = () => {
    if (!cycle) {
      toast.error("Load a cycle first");
      return;
    }
    exportSaPayoutReport(cycle.payouts, month, branchId);
    exportSaComplianceReport(cycle, getEmpName);
    exportSaOtReport(cycle, getEmpName);
    exportSaOtSummaryByEmployee(cycle, getEmpName);
    exportSaKpiRanking(cycle, getEmpName);
    exportSaStoreGoalDashboard(cycle);
    toast.success("Exported 6 SA month reports (CSV)");
  };

  const goalHit = (cycle?.branchTotalSales ?? 0) >= SA_STORE_GOAL_THRESHOLD;
  const approvedCount = cycle?.payouts.filter((p) => p.status === "approved").length ?? 0;
  const draftCount = cycle?.payouts.filter((p) => p.status === "draft").length ?? 0;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="operations" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 mb-2">
          <TabsTrigger value="operations" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="policy" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Policy &amp; Points Reference
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policy" className="mt-0">
          <SaIncentivesReferenceTables audience="admin" />
        </TabsContent>

        <TabsContent value="operations" className="mt-0 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            SA Commission &amp; Points Engine
          </CardTitle>
          <CardDescription>
            POGRC Dev Brief — sales commission, OT, compliance score, store goal pool. Draft →
            approve → export to payroll.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label>Month</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={handleInitCycle}>
              Load / Recompute
            </Button>
            <Button type="button" variant="outline" onClick={handleExportApproved}>
              <Download className="h-4 w-4 mr-2" />
              Export approved (HR)
            </Button>
            <Button type="button" variant="outline" onClick={handleExportAllReports}>
              <Download className="h-4 w-4 mr-2" />
              Export all reports
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Branch total sales (POS)</Label>
              <Input
                type="number"
                min={0}
                placeholder="6000000"
                value={cycle?.branchTotalSales ?? ""}
                onChange={(e) => {
                  ensureProfiles();
                  getOrCreateCycle(month, branchId);
                  setBranchSales(month, branchId, Number(e.target.value) || 0);
                }}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Badge variant={goalHit ? "default" : "secondary"}>
                Store goal {goalHit ? "UNLOCKED" : "not hit"} (₱6M)
              </Badge>
              {cycle && (
                <span className="text-sm text-muted-foreground">
                  {cycle.payouts.length} SA payout(s) ·{" "}
                  {cycle.payouts.filter((p) => p.status === "approved").length} approved
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/80 to-amber-50/40 dark:from-violet-950/25 dark:to-amber-950/15 p-4 space-y-3">
        <p className="text-sm font-semibold text-violet-900 dark:text-violet-100 flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" />
          EOM payroll checklist
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Variable SA pay (commission, OT, compliance cash, store goal) is released on the{" "}
          <strong>2nd cutoff (EOM)</strong> only. Mid-month runs pay base + statutory.
        </p>
        <ol className="text-xs space-y-2 list-decimal list-inside text-muted-foreground">
          <li>
            <span className={draftCount > 0 || approvedCount > 0 ? "text-foreground" : ""}>
              Enter POS sales, OT hours, and compliance for {month}
            </span>
            {cycle && (
              <span className="ml-1 text-[10px]">
                ({cycle.payouts.length} payout{cycle.payouts.length === 1 ? "" : "s"})
              </span>
            )}
          </li>
          <li>
            <span className={approvedCount > 0 ? "text-emerald-700 dark:text-emerald-400 font-medium" : ""}>
              COO approve payouts
            </span>
            {approvedCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {approvedCount} approved
              </Badge>
            )}
            {draftCount > 0 && approvedCount === 0 && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                {draftCount} draft pending
              </Badge>
            )}
          </li>
          <li>
            Payroll tab → select <strong>2nd cutoff</strong> → enable{" "}
            <strong>SA Incentives</strong> toggle → issue payslips
          </li>
        </ol>
        {approvedCount > 0 && (
          <p className="text-[10px] text-violet-800 dark:text-violet-200 border-t border-violet-200/60 dark:border-violet-800/60 pt-2">
            {SA_EOM_BLOCKED_REASON}
          </p>
        )}
      </div>

      <SaComplianceKpiForm
        key={complianceEmpId}
        employees={branchEmployees.map((e) => ({ id: e.id, name: e.name }))}
        employeeId={complianceEmpId}
        onEmployeeChange={setComplianceEmpId}
        earned={complianceEarned}
        deducted={complianceDeducted}
        weekGrid={complianceWeekGrid}
        locked={complianceLocked}
        kpi={complianceKpi}
        onSave={(earned, deducted, kpi, weekGrid) => {
          const targetId = complianceEmpId;
          if (!targetId) return;
          ensureProfiles();
          getOrCreateCycle(month, branchId);
          setCompliance(month, branchId, targetId, earned, deducted, weekGrid);
          setEmployeeKpi(month, branchId, targetId, kpi);
          recomputePayouts(month, branchId);
          void syncCycle();
          toast.success("Compliance & KPI saved");
        }}
      />

      <SaOtApprovalPanel
        month={month}
        employees={branchEmployees.map((e) => ({ id: e.id, name: e.name }))}
        employeeId={complianceEmpId}
        onEmployeeChange={setComplianceEmpId}
        approvals={otApprovals}
        locked={complianceLocked}
        approverEmail={currentUser.email}
        onAdd={(approval) => {
          ensureProfiles();
          getOrCreateCycle(month, branchId);
          addOtApproval(month, branchId, approval);
          void syncCycle();
        }}
        onApprove={(id, by) => {
          approveOtApproval(month, branchId, id, by);
          void syncCycle();
          toast.success("OT approved");
        }}
        onReject={(id) => {
          rejectOtApproval(month, branchId, id);
          void syncCycle();
          toast.info("OT rejected");
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Monthly payout (draft)</CardTitle>
          <CardDescription>
            Enter POS sales per SA. OT pay uses pre-approved cash logs when present; otherwise
            comma-separated hours (legacy, max 2h/day).
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>POS sales</TableHead>
                <TableHead>OT hrs/day</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>OT pay</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Store goal</TableHead>
                <TableHead>Cash total</TableHead>
                <TableHead>Payroll add-on</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {branchEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground">
                    No active sales associates found. Tag employees in SA profiles or use Sales
                    department.
                  </TableCell>
                </TableRow>
              ) : (
                branchEmployees.map((emp) => {
                  const profile = profiles.find((p) => p.employeeId === emp.id);
                  const employmentType: SaEmploymentType =
                    profile?.employmentType ?? "regular";
                  const payout = cycle?.payouts.find((p) => p.employeeId === emp.id);
                  const b = payout?.breakdown;
                  const isLocked =
                    payout?.status === "approved" || payout?.status === "processed";
                  const capWarning = b ? getSaVariableCapWarning(b) : null;

                  return (
                    <TableRow key={emp.id} className={capWarning ? "bg-amber-50/50 dark:bg-amber-950/15" : undefined}>
                      <TableCell className="font-medium">
                        {emp.name}
                        {isLocked && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            {payout?.status}
                          </Badge>
                        )}
                        {capWarning && (
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 max-w-[200px] leading-tight">
                            ⚠ Cap exceeded
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={employmentType}
                          onValueChange={(v) => {
                            upsertProfile({
                              employeeId: emp.id,
                              branchId,
                              employmentType: v as SaEmploymentType,
                              isSalesAssociate: true,
                            });
                            recomputePayouts(month, branchId);
                          }}
                        >
                          <SelectTrigger className="h-8 w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trainee">Trainee</SelectItem>
                            <SelectItem value="probationary">Probation</SelectItem>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="oic">OIC</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-[120px] h-8"
                          disabled={isLocked}
                          value={cycle?.salesByEmployee[emp.id] ?? ""}
                          onChange={(e) => {
                            ensureProfiles();
                            getOrCreateCycle(month, branchId);
                            setEmployeeSales(
                              month,
                              branchId,
                              emp.id,
                              Number(e.target.value) || 0,
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="w-[100px] h-8"
                          placeholder="2,1,0"
                          disabled={isLocked}
                          defaultValue={(cycle?.otHoursByEmployee[emp.id] ?? []).join(",")}
                          onBlur={(e) => {
                            const hours = e.target.value
                              .split(",")
                              .map((s) => parseFloat(s.trim()))
                              .filter((n) => !Number.isNaN(n));
                            ensureProfiles();
                            getOrCreateCycle(month, branchId);
                            setEmployeeOtDays(month, branchId, emp.id, hours);
                          }}
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(b?.salesCommission ?? 0)}</TableCell>
                      <TableCell>{formatCurrency(b?.otPay ?? 0)}</TableCell>
                      <TableCell>
                        {b ? (
                          <span>
                            {b.complianceScore}{" "}
                            <Badge variant="outline" className="ml-1">
                              {b.complianceTier}
                            </Badge>
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(b?.storeGoalShare ?? 0)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(b?.cashTotal ?? 0)}
                      </TableCell>
                      <TableCell className="text-primary">
                        {formatCurrency(b ? toPayrollIncentiveAllowances(b) : 0)}
                      </TableCell>
                      <TableCell>
                        {payout?.status === "processed" ? (
                          <Badge variant="default">Processed</Badge>
                        ) : payout?.status === "approved" ? (
                          <div className="flex flex-col gap-1">
                            <Badge>Approved</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px] px-2"
                              onClick={() => {
                                revertPayoutToDraft(payout.id);
                                void syncCycle();
                                toast.info(`Reverted ${emp.name} to draft`);
                              }}
                            >
                              Revert to draft
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!payout}
                            onClick={() => {
                              if (!payout) return;
                              approvePayout(payout.id, currentUser.email);
                              void syncCycle();
                              toast.success(`Approved payout for ${emp.name}`);
                            }}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
