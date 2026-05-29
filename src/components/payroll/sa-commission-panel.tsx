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
import { CheckCircle, Download, Sparkles } from "lucide-react";
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

  const goalHit = (cycle?.branchTotalSales ?? 0) >= SA_STORE_GOAL_THRESHOLD;

  return (
    <div className="space-y-6">
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

      <SaComplianceKpiForm
        key={complianceEmpId}
        employees={branchEmployees.map((e) => ({ id: e.id, name: e.name }))}
        employeeId={complianceEmpId}
        onEmployeeChange={setComplianceEmpId}
        earned={complianceEarned}
        deducted={complianceDeducted}
        kpi={complianceKpi}
        onSave={(earned, deducted, kpi) => {
          const targetId = complianceEmpId;
          if (!targetId) return;
          ensureProfiles();
          getOrCreateCycle(month, branchId);
          setCompliance(month, branchId, targetId, earned, deducted);
          setEmployeeKpi(month, branchId, targetId, kpi);
          recomputePayouts(month, branchId);
          void syncCycle();
          toast.success("Compliance & KPI saved");
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Monthly payout (draft)</CardTitle>
          <CardDescription>
            Enter POS sales per SA and approved OT hours (comma-separated per day, max 2h/day).
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

                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
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
                        {payout?.status === "approved" ? (
                          <Badge>Approved</Badge>
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
    </div>
  );
}
