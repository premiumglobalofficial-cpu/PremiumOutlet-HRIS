"use client";

import { useMemo } from "react";
import { useLoansStore } from "@/store/loans.store";
import { useEmployeesStore } from "@/store/employees.store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Calendar, Percent } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function ReadonlyLoansView() {
    const { loans, getAllDeductions, getSchedule } = useLoansStore();
    const employees = useEmployeesStore((s) => s.employees);
    const [statusFilter, setStatusFilter] = useState("all");

    const getEmpName = (id: string) => employees.find((e) => e.id === id)?.name || id;
    const filtered = useMemo(() => loans.filter((l) => statusFilter === "all" || l.status === statusFilter), [loans, statusFilter]);

    const stats = useMemo(() => {
        const active = loans.filter((l) => l.status === "active");
        return { totalActive: active.length, totalOutstanding: active.reduce((sum, l) => sum + l.remainingBalance, 0), totalSettled: loans.filter((l) => l.status === "settled").length };
    }, [loans]);

    const allDeductions = getAllDeductions();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Loans & Cash Advances</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{loans.length} total loans · View only</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border border-blue-500/20 bg-blue-500/5"><CardContent className="p-4"><p className="text-xs text-muted-foreground font-medium">Active Loans</p><p className="text-2xl font-bold mt-1">{stats.totalActive}</p></CardContent></Card>
                <Card className="border border-amber-500/20 bg-amber-500/5"><CardContent className="p-4"><p className="text-xs text-muted-foreground font-medium">Outstanding Balance</p><p className="text-2xl font-bold mt-1">₱{stats.totalOutstanding.toLocaleString()}</p></CardContent></Card>
                <Card className="border border-emerald-500/20 bg-emerald-500/5"><CardContent className="p-4"><p className="text-xs text-muted-foreground font-medium">Settled</p><p className="text-2xl font-bold mt-1">{stats.totalSettled}</p></CardContent></Card>
            </div>

            <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="settled">Settled</SelectItem><SelectItem value="frozen">Frozen</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
            </div>

            <Tabs defaultValue="loans">
                <TabsList className="w-full justify-start">
                    <TabsTrigger value="loans">Loan Accounts</TabsTrigger>
                    <TabsTrigger value="schedule" className="gap-1.5"><Calendar className="h-3.5 w-3.5" /> Repayment Schedule</TabsTrigger>
                    <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" /> Deduction History{allDeductions.length > 0 && <span className="ml-1 bg-primary/15 text-primary text-[10px] px-1.5 py-0.5 rounded-full">{allDeductions.length}</span>}</TabsTrigger>
                </TabsList>

                <TabsContent value="loans" className="mt-4">
                    <Card className="border border-border/50">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow>
                                        <TableHead className="text-xs">Employee</TableHead><TableHead className="text-xs">Type</TableHead><TableHead className="text-xs">Amount</TableHead><TableHead className="text-xs">Balance</TableHead><TableHead className="text-xs">Progress</TableHead><TableHead className="text-xs">Monthly</TableHead><TableHead className="text-xs">Cap</TableHead><TableHead className="text-xs">Status</TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>
                                        {filtered.length === 0 ? (
                                            <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No loans found</TableCell></TableRow>
                                        ) : filtered.map((loan) => {
                                            const paidPct = loan.amount > 0 ? Math.round(((loan.amount - loan.remainingBalance) / loan.amount) * 100) : 100;
                                            const statusColor = loan.status === "active" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" : loan.status === "settled" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : loan.status === "cancelled" ? "bg-red-500/15 text-red-700 dark:text-red-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400";
                                            return (
                                                <TableRow key={loan.id}>
                                                    <TableCell className="text-sm font-medium">{getEmpName(loan.employeeId)}</TableCell>
                                                    <TableCell className="text-xs capitalize">{loan.type.replace("_", " ")}</TableCell>
                                                    <TableCell className="text-sm">₱{loan.amount.toLocaleString()}</TableCell>
                                                    <TableCell className="text-sm font-medium">₱{loan.remainingBalance.toLocaleString()}</TableCell>
                                                    <TableCell className="w-32"><div className="flex items-center gap-2"><Progress value={paidPct} className="h-2 flex-1" /><span className="text-[10px] text-muted-foreground w-8">{paidPct}%</span></div></TableCell>
                                                    <TableCell className="text-xs">₱{loan.monthlyDeduction.toLocaleString()}/mo</TableCell>
                                                    <TableCell><Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-700 dark:text-violet-400"><Percent className="h-2.5 w-2.5 mr-0.5" />{loan.deductionCapPercent || 30}%</Badge></TableCell>
                                                    <TableCell><Badge variant="secondary" className={`text-[10px] ${statusColor}`}>{loan.status}</Badge></TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="schedule" className="mt-4">
                    <div className="space-y-4">
                        {loans.filter((l) => l.status === "active").length === 0 ? (
                            <Card className="border border-border/50"><CardContent className="py-8 text-center text-sm text-muted-foreground">No active loans with repayment schedules</CardContent></Card>
                        ) : loans.filter((l) => l.status === "active").map((loan) => {
                            const schedule = getSchedule(loan.id);
                            return (
                                <Card key={loan.id} className="border border-border/50">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div><p className="text-sm font-semibold">{getEmpName(loan.employeeId)} — {loan.type.replace("_", " ")}</p><p className="text-xs text-muted-foreground">Principal: ₱{loan.amount.toLocaleString()} · Monthly: ₱{loan.monthlyDeduction.toLocaleString()}</p></div>
                                            <Badge variant="outline" className="text-[10px]">{schedule.length} installments</Badge>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader><TableRow><TableHead className="text-xs">#</TableHead><TableHead className="text-xs">Due Date</TableHead><TableHead className="text-xs">Amount</TableHead><TableHead className="text-xs">Status</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {schedule.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">No schedule generated</TableCell></TableRow> : schedule.map((inst, idx) => (
                                                        <TableRow key={idx}><TableCell className="text-sm">{idx + 1}</TableCell><TableCell className="text-sm">{new Date(inst.dueDate).toLocaleDateString()}</TableCell><TableCell className="text-sm font-medium">₱{inst.amount.toLocaleString()}</TableCell>
                                                            <TableCell><Badge variant={inst.paid ? "default" : "secondary"} className={`text-[10px] ${inst.paid ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}`}>{inst.paid ? "paid" : inst.skippedReason ? `skipped (${inst.skippedReason})` : "pending"}</Badge></TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                    <Card className="border border-border/50">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Employee</TableHead><TableHead className="text-xs">Loan ID</TableHead><TableHead className="text-xs">Payslip</TableHead><TableHead className="text-xs">Amount</TableHead><TableHead className="text-xs">Balance After</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {allDeductions.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No deduction history yet</TableCell></TableRow> : allDeductions.map((d) => (
                                            <TableRow key={d.id}><TableCell className="text-sm">{new Date(d.deductedAt).toLocaleDateString()}</TableCell><TableCell className="text-sm font-medium">{getEmpName(d.employeeId)}</TableCell><TableCell><code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{d.loanId}</code></TableCell><TableCell><code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{d.payslipId}</code></TableCell><TableCell className="text-sm font-medium text-red-600 dark:text-red-400">−₱{d.amount.toLocaleString()}</TableCell><TableCell className="text-sm">₱{d.remainingAfter.toLocaleString()}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
