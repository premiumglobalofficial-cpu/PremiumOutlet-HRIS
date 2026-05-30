"use client";

import { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { Clock, Plus, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import {
  monthlyOtApprovalSummary,
  validateOtApprovalInput,
} from "@/lib/sa-ot-approvals";
import { SA_OT_REFERENCE } from "@/lib/sa-incentives-reference";
import type { SaOtApproval } from "@/types";
import { toast } from "sonner";

type Props = {
  month: string;
  employees: { id: string; name: string }[];
  employeeId: string;
  onEmployeeChange: (id: string) => void;
  approvals: SaOtApproval[];
  locked?: boolean;
  onAdd: (approval: SaOtApproval) => void;
  onApprove: (id: string, approvedBy: string) => void;
  onReject: (id: string) => void;
  approverEmail: string;
};

export function SaOtApprovalPanel({
  month,
  employees,
  employeeId,
  onEmployeeChange,
  approvals,
  locked = false,
  onAdd,
  onApprove,
  onReject,
  approverEmail,
}: Props) {
  const [workDate, setWorkDate] = useState(`${month}-01`);
  const [hours, setHours] = useState("2");
  const [otType, setOtType] = useState<"cash" | "offset">("cash");

  const empApprovals = useMemo(
    () => approvals.filter((a) => a.employeeId === employeeId),
    [approvals, employeeId],
  );

  const summary = useMemo(
    () => monthlyOtApprovalSummary(empApprovals, month),
    [empApprovals, month],
  );

  const selectedName = employees.find((e) => e.id === employeeId)?.name ?? "SA";

  const handleAdd = () => {
    const h = Number(hours);
    const check = validateOtApprovalInput(workDate, h, month);
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    if (empApprovals.some((a) => a.date === workDate)) {
      toast.error("An OT entry already exists for this date");
      return;
    }
    onAdd({
      id: `SAOT-${nanoid(8)}`,
      employeeId,
      date: workDate,
      hours: h,
      otType,
      status: "pending",
    });
    toast.success("OT log added — approve to count toward pay");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          OT Pre-Approval Log
        </CardTitle>
        <CardDescription>
          {SA_OT_REFERENCE.dailyLimit} · {SA_OT_REFERENCE.monthlyLimit} · Max{" "}
          {SA_OT_REFERENCE.maxPayout}. SA must declare <strong>Cash</strong> or{" "}
          <strong>Offset</strong> before rendering. Unapproved OT = ₱0.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1 min-w-[180px]">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={onEmployeeChange} disabled={locked}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs space-y-0.5">
            <p>
              <strong>{summary.approvedCashCount}</strong> approved cash ·{" "}
              <strong>{summary.totalCashHours}h</strong> →{" "}
              {formatCurrency(summary.otPay)} OT pay
            </p>
            <p className="text-muted-foreground">
              {summary.pendingCount} pending · {summary.approvedOffsetCount} offset approved
            </p>
          </div>
        </div>

        {!locked && (
          <div className="flex flex-wrap gap-3 items-end border rounded-lg p-3 bg-background/60">
            <div className="space-y-1">
              <Label className="text-xs">Work date</Label>
              <Input
                type="date"
                className="h-8 w-[150px]"
                value={workDate}
                min={`${month}-01`}
                max={`${month}-31`}
                onChange={(e) => setWorkDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hours (max 2)</Label>
              <Input
                type="number"
                min={0.5}
                max={2}
                step={0.5}
                className="h-8 w-20"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={otType} onValueChange={(v) => setOtType(v as "cash" | "offset")}>
                <SelectTrigger className="h-8 w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="offset">Offset</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" size="sm" onClick={handleAdd} disabled={!employeeId}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add log
            </Button>
          </div>
        )}

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {empApprovals.filter((a) => a.date.startsWith(month)).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">
                    No OT logs for {selectedName} in {month}
                  </TableCell>
                </TableRow>
              ) : (
                empApprovals
                  .filter((a) => a.date.startsWith(month))
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.date}</TableCell>
                      <TableCell>{a.hours}h</TableCell>
                      <TableCell className="capitalize">{a.otType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            a.status === "approved"
                              ? "default"
                              : a.status === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {a.status === "pending" && !locked && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => onApprove(a.id, approverEmail)}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => onReject(a.id)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
