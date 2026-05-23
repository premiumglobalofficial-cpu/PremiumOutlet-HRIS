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
import { FolderArchive, Shield, Upload, Eye, CheckCircle2, Clock, AlertCircle, Plus } from "lucide-react";
import type { Employee201Document, Employee201DocType, Document201Status } from "@/types";

const DOC_TYPE_LABELS: Record<Employee201DocType, string> = {
    personal_info: "Personal Information",
    employment_contract: "Employment Contract",
    government_id: "Government ID",
    resume: "Resume / CV",
    application_form: "Application Form",
    job_offer: "Job Offer Letter",
    medical: "Medical Certificate",
    training_certificate: "Training Certificate",
    performance_evaluation: "Performance Evaluation",
    payslip: "Payslip",
    leave_record: "Leave Record",
    warning: "Written Warning",
    nte: "Notice to Explain (NTE)",
    nod: "Notice of Decision (NOD)",
    clearance: "Clearance",
    resignation_letter: "Resignation Letter",
    coe: "Certificate of Employment",
    final_pay_document: "Final Pay Document",
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

const REQUIRED_DOC_TYPES: Employee201DocType[] = [
    "personal_info", "employment_contract", "government_id",
    "resume", "application_form", "job_offer", "medical",
];

export default function Files201Page() {
    const { employees } = useEmployeesStore();
    const currentUser = useAuthStore((s) => s.currentUser);
    const { hasPermission } = useRolesStore();

    const canView = hasPermission(currentUser.role, "page:employees");

    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [documents, setDocuments] = useState<Employee201Document[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [viewDoc, setViewDoc] = useState<Employee201Document | null>(null);

    // Form state for new document
    const [form, setForm] = useState<{
        employeeId: string;
        documentType: Employee201DocType;
        documentTitle: string;
        visibility: string;
        remarks: string;
    }>({
        employeeId: "",
        documentType: "employment_contract",
        documentTitle: "",
        visibility: "hr_only",
        remarks: "",
    });

    const activeEmployees = useMemo(
        () => employees.filter((e) => e.status === "active"),
        [employees]
    );

    const filtered = useMemo(() => {
        let result = documents;
        if (selectedEmployeeId !== "all") result = result.filter((d) => d.employeeId === selectedEmployeeId);
        if (typeFilter !== "all") result = result.filter((d) => d.documentType === typeFilter);
        if (statusFilter !== "all") result = result.filter((d) => d.status === statusFilter);
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(
                (d) =>
                    d.documentTitle.toLowerCase().includes(q) ||
                    DOC_TYPE_LABELS[d.documentType].toLowerCase().includes(q)
            );
        }
        return result;
    }, [documents, selectedEmployeeId, typeFilter, statusFilter, search]);

    // Compliance summary per selected employee
    const compliance = useMemo(() => {
        const empId = selectedEmployeeId !== "all" ? selectedEmployeeId : null;
        const empDocs = empId ? documents.filter((d) => d.employeeId === empId) : [];
        const uploaded = REQUIRED_DOC_TYPES.filter((t) =>
            empDocs.some((d) => d.documentType === t && d.status !== "pending_upload")
        );
        return { total: REQUIRED_DOC_TYPES.length, uploaded: uploaded.length };
    }, [documents, selectedEmployeeId]);

    const handleAddDoc = () => {
        if (!form.employeeId || !form.documentTitle) return;
        const newDoc: Employee201Document = {
            id: `DOC-${Date.now()}`,
            employeeId: form.employeeId,
            documentType: form.documentType,
            documentTitle: form.documentTitle,
            status: "uploaded",
            visibility: form.visibility as Employee201Document["visibility"],
            remarks: form.remarks,
            uploadedBy: currentUser.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setDocuments((prev) => [...prev, newDoc]);
        setForm({ employeeId: "", documentType: "employment_contract", documentTitle: "", visibility: "hr_only", remarks: "" });
        setShowAdd(false);
    };

    const handleApprove = (id: string) => {
        setDocuments((prev) =>
            prev.map((d) =>
                d.id === id
                    ? { ...d, status: "approved", reviewedBy: currentUser.name, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
                    : d
            )
        );
    };

    const handleArchive = (id: string) => {
        setDocuments((prev) =>
            prev.map((d) => d.id === id ? { ...d, status: "archived", updatedAt: new Date().toISOString() } : d)
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
                    <FolderArchive className="h-6 w-6 text-primary" />
                    <div>
                        <h1 className="text-xl font-semibold">201 Files</h1>
                        <p className="text-sm text-muted-foreground">Employee document tracking and management</p>
                    </div>
                </div>
                <Button onClick={() => setShowAdd(true)} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Add Document
                </Button>
            </div>

            {/* Compliance card — shown when single employee selected */}
            {selectedEmployeeId !== "all" && (
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <p className="text-sm font-medium">Required Documents Compliance</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {compliance.uploaded} of {compliance.total} required documents uploaded
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {compliance.uploaded === compliance.total ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                ) : compliance.uploaded > 0 ? (
                                    <Clock className="h-5 w-5 text-amber-500" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                )}
                                <span className="text-lg font-bold">
                                    {Math.round((compliance.uploaded / compliance.total) * 100)}%
                                </span>
                            </div>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all rounded-full"
                                style={{ width: `${Math.round((compliance.uploaded / compliance.total) * 100)}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger className="w-52">
                        <SelectValue placeholder="All employees" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {activeEmployees.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-52">
                        <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
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
                <Input
                    placeholder="Search documents..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-56"
                />
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Document Type</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Uploaded By</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        <FolderArchive className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                        <p>No documents found. Add the first document to get started.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((doc) => {
                                    const emp = employees.find((e) => e.id === doc.employeeId);
                                    return (
                                        <TableRow key={doc.id}>
                                            <TableCell className="font-medium">{emp?.name ?? doc.employeeId}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {DOC_TYPE_LABELS[doc.documentType]}
                                            </TableCell>
                                            <TableCell>{doc.documentTitle}</TableCell>
                                            <TableCell>
                                                <Badge className={STATUS_COLORS[doc.status]} variant="secondary">
                                                    {doc.status.replace(/_/g, " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {doc.uploadedBy ?? "—"}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(doc.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => setViewDoc(doc)}>
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {doc.status === "uploaded" && (
                                                        <Button variant="ghost" size="sm" onClick={() => handleApprove(doc.id)}>
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                        </Button>
                                                    )}
                                                    {doc.status !== "archived" && (
                                                        <Button variant="ghost" size="sm" onClick={() => handleArchive(doc.id)}>
                                                            <FolderArchive className="h-3.5 w-3.5 text-muted-foreground" />
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

            {/* Add Document Dialog */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Document</DialogTitle>
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
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
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
                                placeholder="e.g. Employment Contract — Juan Dela Cruz"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Visibility</Label>
                            <Select value={form.visibility} onValueChange={(v) => setForm((f) => ({ ...f, visibility: v }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin_only">Admin Only</SelectItem>
                                    <SelectItem value="hr_only">HR Only</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="payroll">Payroll</SelectItem>
                                    <SelectItem value="employee">Employee (Self)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Remarks</Label>
                            <Input
                                value={form.remarks}
                                onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                                placeholder="Optional notes..."
                            />
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                            <Upload className="h-4 w-4 shrink-0" />
                            <span>File upload will be connected to storage in the next release.</span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                        <Button onClick={handleAddDoc} disabled={!form.employeeId || !form.documentTitle}>
                            Add Document
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Document Dialog */}
            <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{viewDoc?.documentTitle}</DialogTitle>
                    </DialogHeader>
                    {viewDoc && (
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">Type</p>
                                    <p className="font-medium">{DOC_TYPE_LABELS[viewDoc.documentType]}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Status</p>
                                    <Badge className={STATUS_COLORS[viewDoc.status]} variant="secondary">
                                        {viewDoc.status.replace(/_/g, " ")}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Visibility</p>
                                    <p className="font-medium">{viewDoc.visibility.replace(/_/g, " ")}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Uploaded By</p>
                                    <p className="font-medium">{viewDoc.uploadedBy ?? "—"}</p>
                                </div>
                                {viewDoc.reviewedBy && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Reviewed By</p>
                                        <p className="font-medium">{viewDoc.reviewedBy}</p>
                                    </div>
                                )}
                                {viewDoc.remarks && (
                                    <div className="col-span-2">
                                        <p className="text-xs text-muted-foreground">Remarks</p>
                                        <p className="font-medium">{viewDoc.remarks}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewDoc(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
