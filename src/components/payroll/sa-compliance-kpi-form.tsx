"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SaComplianceDeducted, SaComplianceEarned } from "@/lib/sa-commission";

const EARNED_FIELDS: { key: keyof SaComplianceEarned; label: string; max?: number }[] = [
  { key: "attendanceWeeks", label: "Attendance weeks", max: 4 },
  { key: "groomingWeeks", label: "Grooming weeks", max: 4 },
  { key: "floorWeeks", label: "Floor weeks", max: 4 },
  { key: "photoWeeks", label: "Photo weeks", max: 4 },
  { key: "groupchatWeeks", label: "Group chat weeks", max: 4 },
  { key: "commitmentWeeks", label: "Commitment weeks", max: 4 },
  { key: "trainingSessions", label: "Training sessions" },
  { key: "proactiveIncidents", label: "Proactive incidents" },
  { key: "cashierWeeks", label: "Cashier weeks", max: 4 },
  { key: "highestSalesWins", label: "Highest sales wins", max: 1 },
];

const DEDUCTED_FIELDS: { key: keyof SaComplianceDeducted; label: string }[] = [
  { key: "lateArrival", label: "Late arrivals" },
  { key: "hairViolation", label: "Hair violations" },
  { key: "uniformViolation", label: "Uniform violations" },
  { key: "zoneUncovered", label: "Zone uncovered" },
  { key: "noGreeting", label: "No greeting" },
  { key: "phoneUse", label: "Phone use" },
  { key: "photoMissed", label: "Photo missed" },
  { key: "groupchatMissed", label: "Group chat missed" },
  { key: "missedTraining", label: "Missed training" },
  { key: "lateKpiReport", label: "Late KPI report" },
  { key: "repeatedViolation", label: "Repeated violation" },
  { key: "cashShortage", label: "Cash shortage" },
  { key: "counterUnattended", label: "Counter unattended" },
];

type Props = {
  employees: { id: string; name: string }[];
  employeeId: string;
  onEmployeeChange: (id: string) => void;
  earned: SaComplianceEarned;
  deducted: SaComplianceDeducted;
  kpi: {
    unitsSold: number;
    revenue: number;
    upsells: number;
    commendations: number;
    complaints: number;
    shiftsWorked: number;
  };
  onSave: (
    earned: SaComplianceEarned,
    deducted: SaComplianceDeducted,
    kpi: Props["kpi"],
  ) => void;
};

export function SaComplianceKpiForm({
  employees,
  employeeId,
  onEmployeeChange,
  earned: initialEarned,
  deducted: initialDeducted,
  kpi: initialKpi,
  onSave,
}: Props) {
  const [earned, setEarned] = useState(initialEarned);
  const [deducted, setDeducted] = useState(initialDeducted);
  const [kpi, setKpi] = useState(initialKpi);

  useEffect(() => {
    setEarned(initialEarned);
    setDeducted(initialDeducted);
    setKpi(initialKpi);
  }, [employeeId, initialEarned, initialDeducted, initialKpi]);

  if (employees.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance &amp; KPI entry</CardTitle>
        <CardDescription>
          OIC weekly compliance totals and KPI inputs for store goal pool (regular SAs only).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 max-w-xs">
          <Label>Employee</Label>
          <Select value={employeeId} onValueChange={onEmployeeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select SA" />
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Earned (monthly totals)</p>
            <div className="grid grid-cols-2 gap-2">
              {EARNED_FIELDS.map(({ key, label, max }) => (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={max}
                    className="h-8"
                    value={earned[key]}
                    onChange={(e) =>
                      setEarned((s) => ({
                        ...s,
                        [key]: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Deductions (counts)</p>
            <div className="grid grid-cols-2 gap-2">
              {DEDUCTED_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <Input
                    type="number"
                    min={0}
                    className="h-8"
                    value={deducted[key]}
                    onChange={(e) =>
                      setDeducted((s) => ({
                        ...s,
                        [key]: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">KPI (store goal pool)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {(
              [
                ["unitsSold", "Units sold"],
                ["revenue", "Revenue (₱)"],
                ["upsells", "Upsells"],
                ["commendations", "Commendations"],
                ["complaints", "Complaints"],
                ["shiftsWorked", "Shifts worked"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  type="number"
                  min={0}
                  className="h-8"
                  value={kpi[key]}
                  onChange={(e) =>
                    setKpi((s) => ({
                      ...s,
                      [key]: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <Button
          type="button"
          onClick={() => onSave(earned, deducted, kpi)}
          disabled={!employeeId}
        >
          Save compliance &amp; KPI
        </Button>
      </CardContent>
    </Card>
  );
}
