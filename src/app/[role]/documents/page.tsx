"use client";

import { useState, useMemo } from "react";
import { useEmployeesStore } from "@/store/employees.store";
import { useAuthStore } from "@/store/auth.store";
import { useRolesStore } from "@/store/roles.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FileText, Shield, Upload, FolderArchive, FileCheck, Clock, AlertCircle, Plus, Download } from "lucide-react";
import type { Employee201DocType, Document201Status } from "@/types";

const DOC_CATEGORY_LABELS: Record<string, string> = {
    employment_contract: "Employment Contract",
    government_id: "Government ID",
    resume: "Resume / CV",
    job_offer: "Job Offer Letter",
    medical: "Medical Certificate",
    training_certificate: "Training Certificate",
    performance_evaluation: "Performance Evaluation",
    nte: "Notice to Explain (NTE)",
    nod: "Notice of Decision (NOD)",
    clearance: "Clearance",
    coe: "Certificate of Employment",
    other: "Other",
};

const STATUS_COLORS: Record<Document201Status, string> = {
    pending_upload: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    uploaded: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    for_review: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
    approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
    expired: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
    archived: "bg-muted text-muted-foreground",
};

interface DocRecord {
    id: string;
    employeeId: string;
    employeeName: string;
    documentType: Employee201DocType;
    documentTitle: string;
    status: Document201Status;
    uploadedBy: string;
    createdAt: string;
}

export default function DocumentCenterPage() {
    const { employees } = useEmployeesStore();
    const currentUser = useAuthStore((s) => s.currentUser);
    const { hasPermission } = useRolesStore();

    const canView = hasPermission(currentUser.role, "page:employees");

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [docs, setDocs] = useState<DocRecord[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({
        employeeId: "",
        documentType: "employment_contract" as Employee201DocType,
        documentTitle: "",
        status: "uploaded" as Document201Status,
    });

    const activeEmployees = useMemo(() => employees.filter((e) => e.status === "active"), [employees]);

    const stats = useMemo(() => ({
        total: docs.length,
        approved: docs.filter((d) => d.status === "approved").length,
        pending: docs.filter((d) => d.status === "pending_upload" || d.status === "for_review").length,
        employees: new Set(docs.map((d) => d.employeeId)).size,
    }), [docs]);

    const filtered = useMemo(() => {
        let result = docs;
        if (typeFilter !== "all") result = result.filter((d) => d.documentType === typeFilter);
        if (statusFilter !== "all") result = result.filter((d) => d.status === statusFilter);
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(
                (d) =>
                    d.documentTitle.toLowerCase().includes(q) ||
                    d.employeeName.toLowerCase().includes(q)
            );
        }
        return result;
    }, [docs, typeFilter, statusFilter, search]);

    const handleAdd = () => {
        if (!form.employeeId || !form.documentTitle) return;
        const emp = employees.find((e) => e.id === form.employeeId);
        setDocs((prev) => [
            ...prev,
            {
                id: `DC-${Date.now()}`,
                employeeId: form.employeeId,
                employeeName: emp?.name ?? form.employeeId,
                documentType: form.documentType,
                documentTitle: form.documentTitle,
                status: form.status,
                uploadedBy: currentUser.name,
                createdAt: new Date().toISOString(),
            },
        ]);
        setForm({ employeeId: "", documentType: "employment_contract", documentTitle: "", status: "uploaded" });
        setShowAdd(false);
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
                    <FileText className="h-6 w-6 text-primary" />
                    <div>
                        <h1 className="text-xl font-semibold">Document Center</h1>
                        <p className="text-sm text-muted-foreground">Centralized HR document repository</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" /> Export
                    </Button>
                    <Button size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
                        <Plus className="h-4 w-4" /> Upload Document
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Documents", value: stats.total, icon: FolderArchive, color: "text-primary" },
                    { label: "Approved", value: stats.approved, icon: FileCheck, color: "text-emerald-500" },
                    { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-amber-500" },
                    { label: "Employees Covered", value: stats.employees, icon: AlertCircle, color: "text-blue-500" },
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
                    placeholder="Search by title or employee..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64"
                />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-52">
                        <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Document Types</SelectItem>
                        {Object.entries(DOC_CATEGORY_LABELS).map(([k, v]) => (
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
                                <TableHead>Employee</TableHead>
                                <TableHead>Document</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Uploaded By</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                        <p>No documents yet. Upload the first document to get started.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-medium">{doc.employeeName}</TableCell>
                                        <TableCell>{doc.documentTitle}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {DOC_CATEGORY_LABELS[doc.documentType] ?? doc.documentType}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={STATUS_COLORS[doc.status]} variant="secondary">
                                                {doc.status.replace(/_/g, " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{doc.uploadedBy}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(doc.createdAt).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Upload Dialog */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
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
                            <Label>Document Type</Label>
                            <Select
                                value={form.documentType}
                                onValueChange={(v) => setForm((f) => ({ ...f, documentType: v as Employee201DocType }))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(DOC_CATEGORY_LABELS).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Document Title</Label>
                            <Input
                                value={form.documentTitle}
                                onChange={(e) => setForm((f) => ({ ...f, documentTitle: e.target.value }))}
                                placeholder="e.g. SSS ID — Juan Dela Cruz"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Initial Status</Label>
                            <Select
                                value={form.status}
                                onValueChange={(v) => setForm((f) => ({ ...f, status: v as Document201Status }))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="uploaded">Uploaded</SelectItem>
                                    <SelectItem value="for_review">For Review</SelectItem>
                                    <SelectItem value="pending_upload">Pending Upload</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                            <Upload className="h-4 w-4 shrink-0" />
                            <span>File upload will be connected to storage in the next release.</span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                        <Button onClick={handleAdd} disabled={!form.employeeId || !form.documentTitle}>
                            Save Document
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
