"use client";

import { useState, useMemo } from "react";
import { useEmployeesStore } from "@/store/employees.store";
import { useAuthStore } from "@/store/auth.store";
import { useRolesStore } from "@/store/roles.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ReceiptText, Shield, Download, FileText } from "lucide-react";
import * as XLSX from "xlsx";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (CURRENT_YEAR - i).toString());

interface AlphalistRow {
    seq: number;
    tin: string;
    lastName: string;
    firstName: string;
    mi: string;
    employmentStatus: string;
    grossCompensation: number;
    taxWithheld: number;
    thirteenthMonthPay: number;
    deMinimis: number;
    sssGsis: number;
    philhealth: number;
    pagibig: number;
    hdmf: number;
    totalExemptions: number;
    taxableCompensation: number;
}

export default function BirAlphalistPage() {
    const { employees } = useEmployeesStore();
    const currentUser = useAuthStore((s) => s.currentUser);
    const { hasPermission } = useRolesStore();

    const canView = hasPermission(currentUser.role, "page:reports");

    const [year, setYear] = useState(CURRENT_YEAR.toString());
    const [month, setMonth] = useState((new Date().getMonth()).toString()); // 0-indexed
    const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

    // Generate alphalist rows from active employees
    const rows = useMemo<AlphalistRow[]>(() => {
        const activeEmps = employees.filter((e) => e.status === "active");
        return activeEmps.map((emp, idx) => {
            const salary = emp.salary ?? 0;
            const sss = Math.min(salary * 0.045, 900);
            const philhealth = Math.min(salary * 0.02, 400);
            const pagibig = Math.min(salary * 0.02, 200);
            const totalExemptions = sss + philhealth + pagibig;
            const taxable = Math.max(0, salary - totalExemptions);
            const withheld = taxable > 20833 ? (taxable - 20833) * 0.20 : 0;
            const thirteenth = period === "annual" ? salary : 0;
            const nameParts = emp.name.split(" ");
            const lastName = nameParts[nameParts.length - 1] ?? emp.name;
            const firstName = nameParts[0] ?? "";
            const mi = nameParts.length > 2 ? (nameParts[1][0] ?? "") : "";

            return {
                seq: idx + 1,
                tin: emp.tin ?? "000-000-000-000",
                lastName,
                firstName,
                mi,
                employmentStatus: "RE", // Regular Employee
                grossCompensation: period === "annual" ? salary * 12 : salary,
                taxWithheld: Math.round(withheld * (period === "annual" ? 12 : 1)),
                thirteenthMonthPay: period === "annual" ? thirteenth : 0,
                deMinimis: 0,
                sssGsis: Math.round(sss * (period === "annual" ? 12 : 1)),
                philhealth: Math.round(philhealth * (period === "annual" ? 12 : 1)),
                pagibig: Math.round(pagibig * (period === "annual" ? 12 : 1)),
                hdmf: Math.round(pagibig * (period === "annual" ? 12 : 1)),
                totalExemptions: Math.round(totalExemptions * (period === "annual" ? 12 : 1)),
                taxableCompensation: Math.round(taxable * (period === "annual" ? 12 : 1)),
            };
        });
    }, [employees, period]);

    const totals = useMemo(() => ({
        gross: rows.reduce((s, r) => s + r.grossCompensation, 0),
        taxWithheld: rows.reduce((s, r) => s + r.taxWithheld, 0),
        sss: rows.reduce((s, r) => s + r.sssGsis, 0),
        philhealth: rows.reduce((s, r) => s + r.philhealth, 0),
        pagibig: rows.reduce((s, r) => s + r.pagibig, 0),
        taxable: rows.reduce((s, r) => s + r.taxableCompensation, 0),
    }), [rows]);

    const handleExport = () => {
        const wsData = [
            ["BIR Form 1604-C — Alphalist of Employees"],
            [`Year: ${year} | Period: ${period === "annual" ? "Annual" : MONTHS[parseInt(month)]}`],
            [],
            [
                "SEQ", "TIN", "Last Name", "First Name", "M.I.",
                "Status", "Gross Compensation", "Tax Withheld",
                "13th Month Pay", "De Minimis", "SSS/GSIS",
                "PhilHealth", "Pag-IBIG", "HDMF", "Total Exemptions",
                "Taxable Compensation",
            ],
            ...rows.map((r) => [
                r.seq, r.tin, r.lastName, r.firstName, r.mi,
                r.employmentStatus, r.grossCompensation, r.taxWithheld,
                r.thirteenthMonthPay, r.deMinimis, r.sssGsis,
                r.philhealth, r.pagibig, r.hdmf, r.totalExemptions,
                r.taxableCompensation,
            ]),
            [],
            ["", "", "", "", "", "TOTALS",
                totals.gross, totals.taxWithheld, "", "",
                totals.sss, totals.philhealth, totals.pagibig, totals.pagibig,
                "", totals.taxable],
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Alphalist");
        XLSX.writeFile(wb, `BIR_Alphalist_${year}_${period}.xlsx`);
    };

    const fmt = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Shield className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Access restricted to Admin, HR, Finance, and Payroll Admin roles.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ReceiptText className="h-6 w-6 text-primary" />
                    <div>
                        <h1 className="text-xl font-semibold">BIR Alphalist</h1>
                        <p className="text-sm text-muted-foreground">BIR Form 1604-C — Alphalist of Employees with Compensation</p>
                    </div>
                </div>
                <Button size="sm" className="gap-2" onClick={handleExport}>
                    <Download className="h-4 w-4" /> Export to Excel
                </Button>
            </div>

            {/* Period Controls */}
            <div className="flex flex-wrap gap-2 items-center">
                <Select value={period} onValueChange={(v) => setPeriod(v as "monthly" | "annual")}>
                    <SelectTrigger className="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                </Select>
                {period === "monthly" && (
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((m, i) => (
                                <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="w-28">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {YEARS.map((y) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                    { label: "Total Employees", value: rows.length.toString() },
                    { label: "Gross Compensation", value: fmt(totals.gross) },
                    { label: "Total Tax Withheld", value: fmt(totals.taxWithheld) },
                    { label: "SSS / GSIS", value: fmt(totals.sss) },
                    { label: "PhilHealth", value: fmt(totals.philhealth) },
                    { label: "Pag-IBIG", value: fmt(totals.pagibig) },
                ].map((s) => (
                    <Card key={s.label}>
                        <CardContent className="pt-4 pb-4">
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                            <p className="text-lg font-bold mt-0.5">{s.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Alphalist Table */}
            <Card>
                <CardHeader className="pb-0">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Alphalist — {period === "annual" ? `Annual ${year}` : `${MONTHS[parseInt(month)]} ${year}`}
                        <span className="ml-auto text-sm font-normal text-muted-foreground">{rows.length} employees</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 mt-3">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">#</TableHead>
                                    <TableHead>TIN</TableHead>
                                    <TableHead>Last Name</TableHead>
                                    <TableHead>First Name</TableHead>
                                    <TableHead>M.I.</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Gross</TableHead>
                                    <TableHead className="text-right">Tax Withheld</TableHead>
                                    <TableHead className="text-right">SSS</TableHead>
                                    <TableHead className="text-right">PhilHealth</TableHead>
                                    <TableHead className="text-right">Pag-IBIG</TableHead>
                                    <TableHead className="text-right">Taxable</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                                            <ReceiptText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                            <p>No active employees found.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((r) => (
                                        <TableRow key={r.seq}>
                                            <TableCell className="text-muted-foreground">{r.seq}</TableCell>
                                            <TableCell className="font-mono text-xs">{r.tin}</TableCell>
                                            <TableCell className="font-medium">{r.lastName}</TableCell>
                                            <TableCell>{r.firstName}</TableCell>
                                            <TableCell>{r.mi}</TableCell>
                                            <TableCell className="text-muted-foreground">{r.employmentStatus}</TableCell>
                                            <TableCell className="text-right text-sm">{fmt(r.grossCompensation)}</TableCell>
                                            <TableCell className="text-right text-sm">{fmt(r.taxWithheld)}</TableCell>
                                            <TableCell className="text-right text-sm">{fmt(r.sssGsis)}</TableCell>
                                            <TableCell className="text-right text-sm">{fmt(r.philhealth)}</TableCell>
                                            <TableCell className="text-right text-sm">{fmt(r.pagibig)}</TableCell>
                                            <TableCell className="text-right text-sm">{fmt(r.taxableCompensation)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center">
                Note: This alphalist is computed from current employee salary data. Verify against official payroll records before BIR filing.
                Deduction rates: SSS 4.5% (max ₱900), PhilHealth 2% (max ₱400), Pag-IBIG 2% (max ₱200).
            </p>
        </div>
    );
}
