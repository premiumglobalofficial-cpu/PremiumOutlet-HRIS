"use client";

import { useState, useMemo } from "react";
import { useEmployeesStore } from "@/store/employees.store";
import { useAuthStore } from "@/store/auth.store";
import { useRolesStore } from "@/store/roles.store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Gavel, Shield, Plus, Eye, CheckCircle2, XCircle, Clock } from "lucide-react";

type CaseType = "nte" | "nod" | "verbal_warning" | "written_warning" | "suspension" | "termination";
type CaseStatus = "open" | "pending_response" | "under_review" | "resolved" | "closed" | "dismissed";

interface DisciplinaryCase {
    id: string;
    employeeId: string;
    caseType: CaseType;
    subject: string;
    description: string;
    status: CaseStatus;
    issuedBy: string;
    responseDeadline?: string;
    resolution?: string;
    createdAt: string;
    updatedAt: string;
}

const CASE_TYPE_LABELS: Record<CaseType, string> = {
    nte: "Notice to Explain (NTE)",
    nod: "Notice of Decision (NOD)",
    verbal_warning: "Verbal Warning",
    written_warning: "Written Warning",
    suspension: "Suspension",
    termination: "Termination Notice",
};

const STATUS_COLORS: Record<CaseStatus, string> = {
    open: "bg-red-500/15 text-red-700 dark:text-red-400",
    pending_response: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    under_review: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
    resolved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    closed: "bg-muted text-muted-foreground",
    dismissed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
};

export default function DisciplinaryPage() {
    const { employees } = useEmployeesStore();
    const currentUser = useAuthStore((s) => s.currentUser);
    const { hasPermission } = useRolesStore();

    const canView = hasPermission(currentUser.role, "page:employees");

    const [cases, setCases] = useState<DisciplinaryCase[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [showCreate, setShowCreate] = useState(false);
    const [viewCase, setViewCase] = useState<DisciplinaryCase | null>(null);

    const [form, setForm] = useState({
        employeeId: "",
        caseType: "nte" as CaseType,
        subject: "",
        description: "",
        responseDeadline: "",
    });

    const activeEmployees = useMemo(() => employees.filter((e) => e.status === "active"), [employees]);

    const filtered = useMemo(() => {
        let result = cases;
        if (statusFilter !== "all") result = result.filter((c) => c.status === statusFilter);
        if (typeFilter !== "all") result = result.filter((c) => c.caseType === typeFilter);
        if (search) {
            const q = search.toLowerCase();
            const empMatch = employees
                .filter((e) => e.name.toLowerCase().includes(q))
                .map((e) => e.id);
            result = result.filter(
                (c) => c.subject.toLowerCase().includes(q) || empMatch.includes(c.employeeId)
            );
        }
        return result;
    }, [cases, statusFilter, typeFilter, search, employees]);

    const stats = useMemo(() => ({
        open: cases.filter((c) => c.status === "open" || c.status === "pending_response").length,
        resolved: cases.filter((c) => c.status === "resolved" || c.status === "closed").length,
        total: cases.length,
    }), [cases]);

    const handleCreate = () => {
        if (!form.employeeId || !form.subject || !form.description) return;
        const newCase: DisciplinaryCase = {
            id: `DISC-${Date.now()}`,
            employeeId: form.employeeId,
            caseType: form.caseType,
            subject: form.subject,
            description: form.description,
            status: form.caseType === "nte" ? "pending_response" : "open",
            issuedBy: currentUser.name,
            responseDeadline: form.responseDeadline || undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setCases((prev) => [newCase, ...prev]);
        setForm({ employeeId: "", caseType: "nte", subject: "", description: "", responseDeadline: "" });
        setShowCreate(false);
    };

    const handleResolve = (id: string) => {
        setCases((prev) =>
            prev.map((c) =>
                c.id === id ? { ...c, status: "resolved", updatedAt: new Date().toISOString() } : c
            )
        );
    };

    const handleClose = (id: string) => {
        setCases((prev) =>
            prev.map((c) =>
                c.id === id ? { ...c, status: "closed", updatedAt: new Date().toISOString() } : c
            )
        );
    };

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Shield className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Access restricted to Admin and HR roles.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Gavel className="h-6 w-6 text-primary" />
                    <div>
                        <h1 className="text-xl font-semibold">Disciplinary Cases</h1>
                        <p className="text-sm text-muted-foreground">NTE / NOD and disciplinary action management</p>
                    </div>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4" /> File Case
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Active Cases", value: stats.open, icon: Clock, color: "text-amber-500" },
                    { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "text-emerald-500" },
                    { label: "Total Cases", value: stats.total, icon: Gavel, color: "text-primary" },
                ].map((s) => (
                    <Card key={s.label}>
                        <CardContent className="pt-4 pb-4 flex items-center gap-3">
                            <s.icon className={`h-8 w-8 ${s.color} opacity-80 shrink-0`} />
                            <div>
                                <p className="text-2xl font-bold">{s.value}</p>
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <Input
                    placeholder="Search by subject or employee..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64"
                />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-52">
                        <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Case Types</SelectItem>
                        {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {Object.keys(STATUS_COLORS).map((s) => (
                            <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Case #</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Issued By</TableHead>
                                <TableHead>Date Filed</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                        <Gavel className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                        <p>No disciplinary cases. All clear!</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((c) => {
                                    const emp = employees.find((e) => e.id === c.employeeId);
                                    return (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{c.id}</TableCell>
                                            <TableCell className="font-medium">{emp?.name ?? c.employeeId}</TableCell>
                                            <TableCell className="text-sm">{CASE_TYPE_LABELS[c.caseType]}</TableCell>
                                            <TableCell>{c.subject}</TableCell>
                                            <TableCell>
                                                <Badge className={STATUS_COLORS[c.status]} variant="secondary">
                                                    {c.status.replace(/_/g, " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{c.issuedBy}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(c.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => setViewCase(c)}>
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {(c.status === "open" || c.status === "pending_response" || c.status === "under_review") && (
                                                        <Button variant="ghost" size="sm" onClick={() => handleResolve(c.id)}>
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                        </Button>
                                                    )}
                                                    {c.status === "resolved" && (
                                                        <Button variant="ghost" size="sm" onClick={() => handleClose(c.id)}>
                                                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* File Case Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>File Disciplinary Case</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Employee</Label>
                            <Select value={form.employeeId} onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select employee..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {activeEmployees.map((e) => (
                                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Case Type</Label>
                            <Select value={form.caseType} onValueChange={(v) => setForm((f) => ({ ...f, caseType: v as CaseType }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Subject</Label>
                            <Input
                                value={form.subject}
                                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                                placeholder="Brief subject of the case..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description / Incident Details</Label>
                            <Textarea
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="Describe the incident or grounds for disciplinary action..."
                                rows={4}
                            />
                        </div>
                        {(form.caseType === "nte") && (
                            <div className="space-y-1.5">
                                <Label>Response Deadline</Label>
                                <Input
                                    type="date"
                                    value={form.responseDeadline}
                                    onChange={(e) => setForm((f) => ({ ...f, responseDeadline: e.target.value }))}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!form.employeeId || !form.subject || !form.description}
                        >
                            File Case
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Case Dialog */}
            <Dialog open={!!viewCase} onOpenChange={() => setViewCase(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{viewCase?.subject}</DialogTitle>
                    </DialogHeader>
                    {viewCase && (
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">Case Type</p>
                                    <p className="font-medium">{CASE_TYPE_LABELS[viewCase.caseType]}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Status</p>
                                    <Badge className={STATUS_COLORS[viewCase.status]} variant="secondary">
                                        {viewCase.status.replace(/_/g, " ")}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Issued By</p>
                                    <p className="font-medium">{viewCase.issuedBy}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Date Filed</p>
                                    <p className="font-medium">{new Date(viewCase.createdAt).toLocaleDateString()}</p>
                                </div>
                                {viewCase.responseDeadline && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Response Deadline</p>
                                        <p className="font-medium">{new Date(viewCase.responseDeadline).toLocaleDateString()}</p>
                                    </div>
                                )}
                                <div className="col-span-2">
                                    <p className="text-xs text-muted-foreground">Description</p>
                                    <p className="font-medium whitespace-pre-wrap">{viewCase.description}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewCase(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
