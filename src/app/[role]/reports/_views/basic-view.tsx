"use client";

import { useState, useMemo, useCallback } from "react";
import { usePayrollStore } from "@/store/payroll.store";
import { useAttendanceStore } from "@/store/attendance.store";
import { useEmployeesStore } from "@/store/employees.store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function BasicReportsView() {
    const payslips = usePayrollStore((s) => s.payslips);
    const logs = useAttendanceStore((s) => s.logs);
    const employees = useEmployeesStore((s) => s.employees);

    const getEmpName = useCallback((id: string) => employees.find((e) => e.id === id)?.name || id, [employees]);

    const payrollRegister = useMemo(() => [...payslips].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)), [payslips]);

    const govtSummary = useMemo(() => {
        const totals = { sss: 0, philhealth: 0, pagibig: 0, tax: 0 };
        payslips.forEach((p) => { totals.sss += (p.sssDeduction || 0); totals.philhealth += (p.philhealthDeduction || 0); totals.pagibig += (p.pagibigDeduction || 0); totals.tax += (p.taxDeduction || 0); });
        return totals;
    }, [payslips]);

    const absenceReport = useMemo(() => {
        const absences: Record<string, number> = {};
        logs.forEach((l) => { if (l.status === "absent") absences[l.employeeId] = (absences[l.employeeId] || 0) + 1; });
        return Object.entries(absences).map(([empId, count]) => ({ empId, name: getEmpName(empId), count })).sort((a, b) => b.count - a.count);
    }, [logs, getEmpName]);

    const lateReport = useMemo(() => {
        const lates: Record<string, { count: number; totalMinutes: number }> = {};
        logs.forEach((l) => { if (l.lateMinutes && l.lateMinutes > 0) { if (!lates[l.employeeId]) lates[l.employeeId] = { count: 0, totalMinutes: 0 }; lates[l.employeeId].count++; lates[l.employeeId].totalMinutes += l.lateMinutes; } });
        return Object.entries(lates).map(([empId, data]) => ({ empId, name: getEmpName(empId), ...data })).sort((a, b) => b.totalMinutes - a.totalMinutes);
    }, [logs, getEmpName]);

    const [tab, setTab] = useState("payroll_register");

    return (
        <div className="space-y-6">
            <div><h1 className="text-2xl font-bold tracking-tight">Reports</h1><p className="text-sm text-muted-foreground mt-0.5">Generated from live store data</p></div>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="flex flex-wrap gap-1 h-auto">
                    <TabsTrigger value="payroll_register" className="text-xs">Payroll Register</TabsTrigger>
                    <TabsTrigger value="govt" className="text-xs">Gov&apos;t Deductions</TabsTrigger>
                    <TabsTrigger value="absence" className="text-xs">Absence</TabsTrigger>
                    <TabsTrigger value="late" className="text-xs">Late</TabsTrigger>
                </TabsList>

                <TabsContent value="payroll_register" className="mt-4">
                    <Card className="border border-border/50"><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow>
                        <TableHead className="text-xs">Employee</TableHead><TableHead className="text-xs">Period</TableHead><TableHead className="text-xs">Gross</TableHead><TableHead className="text-xs">SSS</TableHead><TableHead className="text-xs">PH</TableHead><TableHead className="text-xs">PI</TableHead><TableHead className="text-xs">Tax</TableHead><TableHead className="text-xs">Net</TableHead>
                    </TableRow></TableHeader><TableBody>
                        {payrollRegister.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No payroll data</TableCell></TableRow> : payrollRegister.map((ps) => (
                            <TableRow key={ps.id}><TableCell className="text-sm">{getEmpName(ps.employeeId)}</TableCell><TableCell className="text-xs text-muted-foreground">{ps.periodStart} – {ps.periodEnd}</TableCell><TableCell className="text-xs">₱{(ps.grossPay || 0).toLocaleString()}</TableCell><TableCell className="text-xs text-red-500">₱{(ps.sssDeduction || 0).toLocaleString()}</TableCell><TableCell className="text-xs text-red-500">₱{(ps.philhealthDeduction || 0).toLocaleString()}</TableCell><TableCell className="text-xs text-red-500">₱{(ps.pagibigDeduction || 0).toLocaleString()}</TableCell><TableCell className="text-xs text-red-500">₱{(ps.taxDeduction || 0).toLocaleString()}</TableCell><TableCell className="text-sm font-medium">₱{ps.netPay.toLocaleString()}</TableCell></TableRow>
                        ))}
                    </TableBody></Table></div></CardContent></Card>
                </TabsContent>

                <TabsContent value="govt" className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="border border-blue-500/20 bg-blue-500/5"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground font-medium">SSS Total</p><p className="text-2xl font-bold mt-1">₱{govtSummary.sss.toLocaleString()}</p></CardContent></Card>
                        <Card className="border border-green-500/20 bg-green-500/5"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground font-medium">PhilHealth Total</p><p className="text-2xl font-bold mt-1">₱{govtSummary.philhealth.toLocaleString()}</p></CardContent></Card>
                        <Card className="border border-amber-500/20 bg-amber-500/5"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground font-medium">Pag-IBIG Total</p><p className="text-2xl font-bold mt-1">₱{govtSummary.pagibig.toLocaleString()}</p></CardContent></Card>
                        <Card className="border border-red-500/20 bg-red-500/5"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground font-medium">Tax Total</p><p className="text-2xl font-bold mt-1">₱{govtSummary.tax.toLocaleString()}</p></CardContent></Card>
                    </div>
                    <Card className="border border-border/50 mt-4"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Grand Total Deductions</p><p className="text-3xl font-bold text-red-500 mt-1">₱{(govtSummary.sss + govtSummary.philhealth + govtSummary.pagibig + govtSummary.tax).toLocaleString()}</p></CardContent></Card>
                </TabsContent>

                <TabsContent value="absence" className="mt-4">
                    <Card className="border border-border/50"><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="text-xs">#</TableHead><TableHead className="text-xs">Employee</TableHead><TableHead className="text-xs">Absent Days</TableHead><TableHead className="text-xs">Severity</TableHead></TableRow></TableHeader><TableBody>
                        {absenceReport.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No absence data</TableCell></TableRow> : absenceReport.map((row, i) => (
                            <TableRow key={row.empId}><TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell><TableCell className="text-sm font-medium">{row.name}</TableCell><TableCell className="text-sm">{row.count}</TableCell>
                                <TableCell><Badge variant="secondary" className={`text-[10px] ${row.count >= 5 ? "bg-red-500/15 text-red-700 dark:text-red-400" : row.count >= 3 ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"}`}>{row.count >= 5 ? "High" : row.count >= 3 ? "Moderate" : "Low"}</Badge></TableCell>
                            </TableRow>
                        ))}
                    </TableBody></Table></div></CardContent></Card>
                </TabsContent>

                <TabsContent value="late" className="mt-4">
                    <Card className="border border-border/50"><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="text-xs">#</TableHead><TableHead className="text-xs">Employee</TableHead><TableHead className="text-xs">Late Count</TableHead><TableHead className="text-xs">Total Late (min)</TableHead></TableRow></TableHeader><TableBody>
                        {lateReport.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No late data recorded</TableCell></TableRow> : lateReport.map((row, i) => (
                            <TableRow key={row.empId}><TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell><TableCell className="text-sm font-medium">{row.name}</TableCell><TableCell className="text-sm">{row.count}</TableCell><TableCell className="text-sm font-medium">{row.totalMinutes} min</TableCell></TableRow>
                        ))}
                    </TableBody></Table></div></CardContent></Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
