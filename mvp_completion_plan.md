# 🎯 NexHRMS MVP Completion Plan
**Critical Gaps Implementation Roadmap**

> **Goal:** Complete the MVP simulation to achieve 85-95% production parity with full Philippine compliance demonstration capability.

---

## 📋 Overview

### Current State: 65/100
- ✅ Core CRUD operations
- ✅ Basic attendance & leave
- ✅ Philippine payroll calculations
- ⚠️ Missing critical workflows and compliance reports

### Target State: 95/100
- ✅ Complete payroll lifecycle with locking
- ✅ Full attendance-to-payroll integration
- ✅ Philippine government compliance reports
- ✅ Organizational structure management
- ✅ Shift scheduling system

---

## 🎨 Design System Reference

### Brand Colors (from globals.css)
```css
--primary: 262.1 83.3% 57.8%        /* Purple */
--secondary: 220 14.3% 95.9%       /* Light gray */
--accent: 220 14.3% 95.9%          /* Matching secondary */
--muted: 220 14.3% 95.9%           /* Background subtle */
--destructive: 0 84.2% 60.2%       /* Red for warnings */
```

### Component Library (shadcn/ui)
- **Forms:** Input, Select, Textarea, Checkbox, Switch
- **Data Display:** Table, Badge, Card, Tabs, Separator
- **Actions:** Button, Dialog, DropdownMenu, AlertDialog
- **Feedback:** Sonner (toast), Skeleton, Progress
- **Navigation:** Command palette (existing in topbar)

### Layout Pattern (Consistent Across App)
```tsx
<div className="space-y-6">
  {/* Page Header */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold">Page Title</h1>
      <p className="text-muted-foreground">Description</p>
    </div>
    <Button>Primary Action</Button>
  </div>

  {/* Filters/Tabs (if needed) */}
  <Tabs defaultValue="tab1">
    <TabsList>
      <TabsTrigger value="tab1">Tab One</TabsTrigger>
    </TabsList>
    <TabsContent value="tab1">
      {/* Content */}
    </TabsContent>
  </Tabs>

  {/* Main Content Card */}
  <Card>
    <CardHeader>
      <CardTitle>Section Title</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Data table or form */}
    </CardContent>
  </Card>
</div>
```

---

# Phase 1: Critical for Demo (Priority 1)

## 1️⃣ Payroll Run Locking

### Problem
Payroll runs can currently be edited after publishing, violating audit principles.

### Solution Specification

#### Data Model Changes
```typescript
// src/types/index.ts
interface PayrollRun {
  id: string;
  periodStart: string;
  periodEnd: string;
  issuedAt: string;
  issuedBy: string;
  payslips: Payslip[];
  
  // NEW FIELDS
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  policySnapshot: {
    taxTableVersion: string;
    sssVersion: string;
    philhealthVersion: string;
    pagibigVersion: string;
    holidayListVersion: string;
    ruleSetId?: string;
  };
}
```

#### Store Changes (`payroll.store.ts`)
```typescript
// Add new action
lockPayrollRun: (runId: string) => {
  set((state) => ({
    payrollRuns: state.payrollRuns.map(run =>
      run.id === runId
        ? {
            ...run,
            isLocked: true,
            lockedAt: new Date().toISOString(),
            lockedBy: get().currentUserId, // from auth store
          }
        : run
    ),
  }));
}
```

#### UI Implementation (`src/app/payroll/page.tsx`)

**Payroll Runs Table Enhancement:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Period</TableHead>
      <TableHead>Issued Date</TableHead>
      <TableHead>Payslips</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {payrollRuns.map((run) => (
      <TableRow key={run.id}>
        <TableCell>
          {format(new Date(run.periodStart), "MMM d")} - {format(new Date(run.periodEnd), "MMM d, yyyy")}
        </TableCell>
        <TableCell>{format(new Date(run.issuedAt), "PPP")}</TableCell>
        <TableCell>{run.payslips.length} employees</TableCell>
        <TableCell>
          {run.isLocked ? (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Locked
            </Badge>
          ) : (
            <Badge variant="outline">Draft</Badge>
          )}
        </TableCell>
        <TableCell className="text-right space-x-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          {!run.isLocked && canLock && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Lock className="h-4 w-4 mr-1" />
                  Lock
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Lock Payroll Run?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently lock this payroll run. No further edits will be allowed.
                    A policy snapshot will be saved for audit purposes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleLockRun(run.id)}>
                    Lock Payroll Run
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Policy Snapshot Display (in payslip detail dialog):**
```tsx
{run.policySnapshot && (
  <div className="mt-4 p-3 bg-muted rounded-lg">
    <p className="text-sm font-medium mb-2">Policy Snapshot</p>
    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
      <div>Tax Table: {run.policySnapshot.taxTableVersion}</div>
      <div>SSS: {run.policySnapshot.sssVersion}</div>
      <div>PhilHealth: {run.policySnapshot.philhealthVersion}</div>
      <div>Pag-IBIG: {run.policySnapshot.pagibigVersion}</div>
    </div>
  </div>
)}
```

#### Acceptance Criteria
- ✅ Lock button visible only for unlocked runs
- ✅ Locked badge shows with lock icon
- ✅ Policy snapshot captured on lock
- ✅ Cannot issue payslips from locked runs
- ✅ Toast confirmation on lock

---

## 2️⃣ Automatic Loan Deductions

### Problem
Loans exist but don't automatically deduct from payroll during computation.

### Solution Specification

#### Data Model Changes
```typescript
// src/types/index.ts
interface Loan {
  id: string;
  employeeId: string;
  amount: number;
  remainingBalance: number;
  deductionAmount: number;  // EXISTING - amount per cutoff
  status: "active" | "paid" | "defaulted";
  
  // NEW FIELDS
  deductions: LoanDeduction[];
  lastDeductedAt?: string;
}

interface LoanDeduction {
  id: string;
  loanId: string;
  payslipId: string;
  amount: number;
  deductedAt: string;
  remainingAfter: number;
}
```

#### Payroll Computation Enhancement (`payroll.store.ts`)

**Modified `issuePayslips` action:**
```typescript
issuePayslips: (employeeIds: string[], periodStart: string, periodEnd: string) => {
  const loans = useLoansStore.getState().loans;
  
  const payslips = employeeIds.map(empId => {
    const employee = employees.find(e => e.id === empId);
    const basicPay = employee.basicSalary;
    
    // ... existing earnings calculation ...
    
    // GOVERNMENT DEDUCTIONS
    const sss = calculateSSS(grossPay);
    const philhealth = calculatePhilHealth(grossPay);
    const pagibig = calculatePagIbig(grossPay);
    const withholdingTax = calculateTax(grossPay, sss, philhealth, pagibig);
    
    const deductions: PayslipLine[] = [
      { type: "sss", amount: sss },
      { type: "philhealth", amount: philhealth },
      { type: "pagibig", amount: pagibig },
      { type: "tax", amount: withholdingTax },
    ];
    
    // AUTO LOAN DEDUCTION (NEW)
    const activeLoans = loans.filter(
      loan => loan.employeeId === empId && loan.status === "active"
    );
    
    let totalLoanDeductions = 0;
    activeLoans.forEach(loan => {
      const deductAmount = Math.min(loan.deductionAmount, loan.remainingBalance);
      totalLoanDeductions += deductAmount;
      
      deductions.push({
        type: `loan_${loan.id}`,
        description: `Loan Deduction - ${loan.id}`,
        amount: deductAmount
      });
    });
    
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    const netPay = grossPay - totalDeductions;
    
    // Create payslip
    const payslip = {
      id: `PS-${nanoid(8)}`,
      employeeId: empId,
      periodStart,
      periodEnd,
      issuedAt: new Date().toISOString(),
      earnings,
      deductions,
      grossPay,
      netPay,
    };
    
    // Record loan deduction and update balance
    activeLoans.forEach(loan => {
      const deductAmount = Math.min(loan.deductionAmount, loan.remainingBalance);
      useLoansStore.getState().recordDeduction(loan.id, payslip.id, deductAmount);
    });
    
    return payslip;
  });
  
  // ... rest of the function
}
```

#### Loans Store Changes (`loans.store.ts`)
```typescript
recordDeduction: (loanId: string, payslipId: string, amount: number) => {
  set((state) => ({
    loans: state.loans.map(loan => {
      if (loan.id !== loanId) return loan;
      
      const newBalance = loan.remainingBalance - amount;
      const deduction: LoanDeduction = {
        id: `LD-${nanoid(8)}`,
        loanId,
        payslipId,
        amount,
        deductedAt: new Date().toISOString(),
        remainingAfter: newBalance,
      };
      
      return {
        ...loan,
        remainingBalance: newBalance,
        status: newBalance <= 0 ? "paid" : "active",
        lastDeductedAt: new Date().toISOString(),
        deductions: [...(loan.deductions || []), deduction],
      };
    }),
  }));
}
```

#### UI Enhancement (`src/app/loans/page.tsx`)

**Deduction History Tab:**
```tsx
<Tabs defaultValue="active">
  <TabsList>
    <TabsTrigger value="active">Active Loans</TabsTrigger>
    <TabsTrigger value="paid">Paid Loans</TabsTrigger>
    <TabsTrigger value="history">Deduction History</TabsTrigger>
  </TabsList>
  
  <TabsContent value="history">
    <Card>
      <CardContent className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Loan ID</TableHead>
              <TableHead>Payslip</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance After</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allDeductions.map((deduction) => (
              <TableRow key={deduction.id}>
                <TableCell>{format(new Date(deduction.deductedAt), "PP")}</TableCell>
                <TableCell>{getEmployeeName(deduction.employeeId)}</TableCell>
                <TableCell>
                  <code className="text-xs">{deduction.loanId}</code>
                </TableCell>
                <TableCell>
                  <Button variant="link" size="sm" className="p-0 h-auto">
                    {deduction.payslipId}
                  </Button>
                </TableCell>
                <TableCell className="text-right font-medium text-destructive">
                  -{formatCurrency(deduction.amount)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(deduction.remainingAfter)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

#### Acceptance Criteria
- ✅ Loans auto-deduct during payroll computation
- ✅ Deduction amount respects remaining balance (no over-deduction)
- ✅ Loan status auto-updates to "paid" when balance reaches zero
- ✅ Deduction history tracked per loan
- ✅ Payslip shows loan deduction line item

---

## 3️⃣ Semi-Monthly Cutoff Periods

### Problem
Date range selection is manual; should have preset cutoff periods (1-15, 16-EOM).

### Solution Specification

#### UI Enhancement (`src/app/payroll/page.tsx`)

**Cutoff Period Selector:**
```tsx
import { getMonth, getYear, startOfMonth, endOfMonth, addDays } from "date-fns";

function CutoffSelector({ onSelect }: { onSelect: (start: Date, end: Date) => void }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [cutoff, setCutoff] = useState<"first" | "second">("first");
  
  const handleSelect = () => {
    const year = getYear(selectedMonth);
    const month = getMonth(selectedMonth);
    
    let periodStart: Date;
    let periodEnd: Date;
    
    if (cutoff === "first") {
      // 1st to 15th
      periodStart = new Date(year, month, 1);
      periodEnd = new Date(year, month, 15);
    } else {
      // 16th to end of month
      periodStart = new Date(year, month, 16);
      periodEnd = endOfMonth(new Date(year, month, 1));
    }
    
    onSelect(periodStart, periodEnd);
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Label>Pay Period</Label>
        <Select
          value={format(selectedMonth, "yyyy-MM")}
          onValueChange={(val) => setSelectedMonth(new Date(val + "-01"))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getLast6Months().map(month => (
              <SelectItem key={month} value={month}>
                {format(new Date(month + "-01"), "MMMM yyyy")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label>Cutoff Period</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            variant={cutoff === "first" ? "default" : "outline"}
            onClick={() => setCutoff("first")}
            className="justify-start"
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            1st - 15th
          </Button>
          <Button
            variant={cutoff === "second" ? "default" : "outline"}
            onClick={() => setCutoff("second")}
            className="justify-start"
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            16th - {format(endOfMonth(selectedMonth), "do")}
          </Button>
        </div>
      </div>
      
      <div className="p-3 bg-muted rounded-lg">
        <p className="text-sm font-medium">Selected Period</p>
        <p className="text-muted-foreground text-sm mt-1">
          {cutoff === "first" 
            ? `${format(new Date(getYear(selectedMonth), getMonth(selectedMonth), 1), "MMM d")} - ${format(new Date(getYear(selectedMonth), getMonth(selectedMonth), 15), "MMM d, yyyy")}`
            : `${format(new Date(getYear(selectedMonth), getMonth(selectedMonth), 16), "MMM d")} - ${format(endOfMonth(selectedMonth), "MMM d, yyyy")}`
          }
        </p>
      </div>
      
      <Button onClick={handleSelect} className="w-full">
        Continue to Employee Selection
      </Button>
    </div>
  );
}
```

**Issue Payroll Dialog Flow:**
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>
      <DollarSign className="h-4 w-4 mr-2" />
      Issue Payslips
    </Button>
  </DialogTrigger>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Issue Payslips</DialogTitle>
      <DialogDescription>
        Select cutoff period and employees to generate payslips
      </DialogDescription>
    </DialogHeader>
    
    {step === 1 && (
      <CutoffSelector
        onSelect={(start, end) => {
          setPeriodStart(start);
          setPeriodEnd(end);
          setStep(2);
        }}
      />
    )}
    
    {step === 2 && (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep(1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Change Period
          </Button>
          <Badge variant="outline">
            {format(periodStart, "MMM d")} - {format(periodEnd, "MMM d, yyyy")}
          </Badge>
        </div>
        
        <div className="border rounded-lg p-4 max-h-[400px] overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <Label>Select Employees ({selectedEmployees.length} selected)</Label>
            <Button variant="outline" size="sm" onClick={toggleSelectAll}>
              {selectedEmployees.length === employees.length ? "Deselect All" : "Select All"}
            </Button>
          </div>
          
          <div className="space-y-2">
            {employees.map(emp => (
              <div key={emp.id} className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedEmployees.includes(emp.id)}
                  onCheckedChange={() => toggleEmployee(emp.id)}
                />
                <Label className="flex-1 cursor-pointer">
                  {emp.name}
                  <span className="text-muted-foreground text-sm ml-2">
                    {formatCurrency(emp.basicSalary)}/month
                  </span>
                </Label>
              </div>
            ))}
          </div>
        </div>
        
        <Button onClick={handleIssuePayslips} className="w-full" disabled={selectedEmployees.length === 0}>
          Issue {selectedEmployees.length} Payslip{selectedEmployees.length !== 1 ? 's' : ''}
        </Button>
      </div>
    )}
  </DialogContent>
</Dialog>
```

#### Acceptance Criteria
- ✅ Dropdown shows last 6 months
- ✅ Two cutoff buttons (1-15, 16-EOM)
- ✅ Preview shows exact date range
- ✅ Can go back to change period
- ✅ Employee checklist with select all

---

## 4️⃣ Holiday Pay Multipliers

### Problem
Holiday types exist but overtime rates don't apply DOLE multipliers during payroll.

### Solution Specification

#### Constants Enhancement (`src/lib/constants.ts`)

```typescript
export const PH_HOLIDAY_MULTIPLIERS = {
  regular_holiday: {
    worked: 2.0,              // 200% for work on regular holiday
    worked_overtime: 2.6,     // 260% (200% + 30% OT premium)
    rest_day: 2.6,            // 260% if RH falls on rest day
    rest_day_overtime: 3.38,  // 338% if RH + rest day + OT
  },
  special_holiday: {
    worked: 1.3,              // 130% for work on special holiday
    worked_overtime: 1.69,    // 169% (130% + 30% OT premium)
    rest_day: 1.5,            // 150% if SH falls on rest day
    rest_day_overtime: 1.95,  // 195% if SH + rest day + OT
  },
} as const;

export const DEFAULT_HOLIDAYS = [
  { date: "2026-01-01", name: "New Year's Day", type: "regular" },
  { date: "2026-02-25", name: "EDSA Revolution", type: "special" },
  { date: "2026-04-09", name: "Araw ng Kagitingan", type: "regular" },
  { date: "2026-04-10", name: "Maundy Thursday", type: "regular" },
  { date: "2026-04-11", name: "Good Friday", type: "regular" },
  { date: "2026-05-01", name: "Labor Day", type: "regular" },
  { date: "2026-06-12", name: "Independence Day", type: "regular" },
  { date: "2026-08-31", name: "National Heroes Day", type: "regular" },
  { date: "2026-11-30", name: "Bonifacio Day", type: "regular" },
  { date: "2026-12-25", name: "Christmas Day", type: "regular" },
  { date: "2026-12-30", name: "Rizal Day", type: "regular" },
];
```

#### Payroll Computation with Holiday Pay (`payroll.store.ts`)

```typescript
function calculateHolidayPay(
  employee: Employee,
  periodStart: string,
  periodEnd: string,
  overtimeHours: number
): number {
  const holidays = DEFAULT_HOLIDAYS.filter(h => {
    const holidayDate = new Date(h.date);
    return holidayDate >= new Date(periodStart) && holidayDate <= new Date(periodEnd);
  });
  
  if (holidays.length === 0) return 0;
  
  const hourlyRate = employee.basicSalary / 22 / 8; // monthly to hourly
  let holidayPay = 0;
  
  holidays.forEach(holiday => {
    // Check if employee worked on this day (from attendance logs)
    const workedHours = getWorkedHoursOnDate(employee.id, holiday.date);
    
    if (workedHours > 0) {
      const multiplier = holiday.type === "regular" 
        ? PH_HOLIDAY_MULTIPLIERS.regular_holiday.worked
        : PH_HOLIDAY_MULTIPLIERS.special_holiday.worked;
      
      // Base holiday pay
      holidayPay += workedHours * hourlyRate * multiplier;
      
      // Add OT premium if overtime exists
      if (overtimeHours > 0) {
        const otMultiplier = holiday.type === "regular"
          ? PH_HOLIDAY_MULTIPLIERS.regular_holiday.worked_overtime
          : PH_HOLIDAY_MULTIPLIERS.special_holiday.worked_overtime;
        
        holidayPay += overtimeHours * hourlyRate * otMultiplier;
      }
    } else {
      // Not worked but still paid (regular holidays only)
      if (holiday.type === "regular") {
        holidayPay += hourlyRate * 8; // Full day's pay
      }
    }
  });
  
  return holidayPay;
}

// Modified issuePayslips to include holiday pay
issuePayslips: (employeeIds: string[], periodStart: string, periodEnd: string) => {
  const payslips = employeeIds.map(empId => {
    const employee = employees.find(e => e.id === empId);
    
    // ... existing calculations ...
    
    const overtimeHours = calculateOvertimeHours(empId, periodStart, periodEnd);
    const holidayPay = calculateHolidayPay(employee, periodStart, periodEnd, overtimeHours);
    
    const earnings: PayslipLine[] = [
      { type: "basic", amount: employee.basicSalary / 2 }, // semi-monthly
      { type: "overtime", amount: overtimePay },
      { type: "holiday", amount: holidayPay, description: "Holiday Premium" },
    ];
    
    // ... rest of calculation
  });
}
```

#### UI Display (`payslip detail dialog`)

```tsx
{payslip.earnings.find(e => e.type === "holiday") && (
  <div className="flex items-center text-sm">
    <CalendarDays className="h-4 w-4 mr-2 text-purple-500" />
    <span className="flex-1">Holiday Premium</span>
    <span className="font-medium text-green-600">
      +{formatCurrency(payslip.earnings.find(e => e.type === "holiday")!.amount)}
    </span>
  </div>
)}
```

#### Acceptance Criteria
- ✅ Holiday multipliers defined per DOLE regulations
- ✅ Regular holiday pays even if not worked
- ✅ Special holiday requires work to be paid
- ✅ Overtime on holidays applies higher multiplier
- ✅ Holiday premium shown separately in payslip

---

## 5️⃣ Government Compliance Reports

### Problem
No summary reports for SSS, PhilHealth, Pag-IBIG, and withholding tax.

### Solution Specification

#### New Page: `src/app/reports/government/page.tsx`

```tsx
"use client";

import { useState, useMemo } from "react";
import { usePayrollStore } from "@/store/payroll.store";
import { useEmployeesStore } from "@/store/employees.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Shield } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export default function GovernmentReportsPage() {
  const { payslips } = usePayrollStore();
  const { employees } = useEmployeesStore();
  
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  
  const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
  const monthEnd = endOfMonth(monthStart);
  
  // Filter payslips for selected month
  const monthPayslips = useMemo(() => {
    return payslips.filter(ps => {
      const issueDate = new Date(ps.issuedAt);
      return issueDate >= monthStart && issueDate <= monthEnd;
    });
  }, [payslips, monthStart, monthEnd]);
  
  // SSS Summary
  const sssReport = useMemo(() => {
    const contributions = new Map<string, { employee: number; employer: number; total: number }>();
    
    monthPayslips.forEach(ps => {
      const sssLine = ps.deductions.find(d => d.type === "sss");
      if (!sssLine) return;
      
      const employeeShare = sssLine.amount;
      const employerShare = employeeShare * 1.5; // Employer pays 1.5x employee
      
      if (contributions.has(ps.employeeId)) {
        const existing = contributions.get(ps.employeeId)!;
        contributions.set(ps.employeeId, {
          employee: existing.employee + employeeShare,
          employer: existing.employer + employerShare,
          total: existing.total + employeeShare + employerShare,
        });
      } else {
        contributions.set(ps.employeeId, {
          employee: employeeShare,
          employer: employerShare,
          total: employeeShare + employerShare,
        });
      }
    });
    
    return Array.from(contributions.entries()).map(([empId, contrib]) => ({
      employeeId: empId,
      employeeName: employees.find(e => e.id === empId)?.name || empId,
      ...contrib,
    }));
  }, [monthPayslips, employees]);
  
  // PhilHealth Summary
  const philhealthReport = useMemo(() => {
    const contributions = new Map<string, number>();
    
    monthPayslips.forEach(ps => {
      const phLine = ps.deductions.find(d => d.type === "philhealth");
      if (!phLine) return;
      
      const current = contributions.get(ps.employeeId) || 0;
      contributions.set(ps.employeeId, current + phLine.amount * 2); // Employee + employer share
    });
    
    return Array.from(contributions.entries()).map(([empId, total]) => ({
      employeeId: empId,
      employeeName: employees.find(e => e.id === empId)?.name || empId,
      monthlyContribution: total,
    }));
  }, [monthPayslips, employees]);
  
  // Pag-IBIG Summary
  const pagibigReport = useMemo(() => {
    const contributions = new Map<string, number>();
    
    monthPayslips.forEach(ps => {
      const pagibigLine = ps.deductions.find(d => d.type === "pagibig");
      if (!pagibigLine) return;
      
      const current = contributions.get(ps.employeeId) || 0;
      contributions.set(ps.employeeId, current + pagibigLine.amount * 2); // Employee + employer
    });
    
    return Array.from(contributions.entries()).map(([empId, total]) => ({
      employeeId: empId,
      employeeName: employees.find(e => e.id === empId)?.name || empId,
      monthlyContribution: total,
    }));
  }, [monthPayslips, employees]);
  
  // Withholding Tax Summary
  const taxReport = useMemo(() => {
    const taxes = new Map<string, { gross: number; tax: number }>();
    
    monthPayslips.forEach(ps => {
      const taxLine = ps.deductions.find(d => d.type === "tax");
      if (!taxLine) return;
      
      const current = taxes.get(ps.employeeId) || { gross: 0, tax: 0 };
      taxes.set(ps.employeeId, {
        gross: current.gross + ps.grossPay,
        tax: current.tax + taxLine.amount,
      });
    });
    
    return Array.from(taxes.entries()).map(([empId, data]) => ({
      employeeId: empId,
      employeeName: employees.find(e => e.id === empId)?.name || empId,
      grossIncome: data.gross,
      withholdingTax: data.tax,
    }));
  }, [monthPayslips, employees]);
  
  const totals = {
    sss: sssReport.reduce((sum, r) => sum + r.total, 0),
    philhealth: philhealthReport.reduce((sum, r) => sum + r.monthlyContribution, 0),
    pagibig: pagibigReport.reduce((sum, r) => sum + r.monthlyContribution, 0),
    tax: taxReport.reduce((sum, r) => sum + r.withholdingTax, 0),
  };
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Government Compliance Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Monthly contribution summaries for SSS, PhilHealth, Pag-IBIG, and BIR
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => {
              const date = subMonths(new Date(), i);
              const value = format(date, "yyyy-MM");
              return (
                <SelectItem key={value} value={value}>
                  {format(date, "MMMM yyyy")}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SSS Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totals.sss)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {sssReport.length} employees
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">PhilHealth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totals.philhealth)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {philhealthReport.length} employees
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pag-IBIG</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totals.pagibig)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {pagibigReport.length} employees
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Withholding Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totals.tax)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {taxReport.length} employees
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Reports */}
      <Tabs defaultValue="sss">
        <TabsList>
          <TabsTrigger value="sss">SSS</TabsTrigger>
          <TabsTrigger value="philhealth">PhilHealth</TabsTrigger>
          <TabsTrigger value="pagibig">Pag-IBIG</TabsTrigger>
          <TabsTrigger value="tax">Withholding Tax</TabsTrigger>
        </TabsList>
        
        {/* SSS Report */}
        <TabsContent value="sss">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>SSS Contribution Report</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Employee Share</TableHead>
                    <TableHead className="text-right">Employer Share</TableHead>
                    <TableHead className="text-right">Total Contribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sssReport.map(row => (
                    <TableRow key={row.employeeId}>
                      <TableCell>{row.employeeName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.employee)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.employer)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(row.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(sssReport.reduce((s, r) => s + r.employee, 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(sssReport.reduce((s, r) => s + r.employer, 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.sss)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* PhilHealth Report */}
        <TabsContent value="philhealth">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>PhilHealth Contribution Report</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Monthly Contribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {philhealthReport.map(row => (
                    <TableRow key={row.employeeId}>
                      <TableCell>{row.employeeName}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.monthlyContribution)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.philhealth)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pag-IBIG Report */}
        <TabsContent value="pagibig">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pag-IBIG Contribution Report</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Monthly Contribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagibigReport.map(row => (
                    <TableRow key={row.employeeId}>
                      <TableCell>{row.employeeName}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.monthlyContribution)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.pagibig)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tax Report */}
        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Withholding Tax Report (BIR 1601C)</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Gross Income</TableHead>
                    <TableHead className="text-right">Tax Withheld</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxReport.map(row => (
                    <TableRow key={row.employeeId}>
                      <TableCell>{row.employeeName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.grossIncome)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.withholdingTax)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(taxReport.reduce((s, r) => s + r.grossIncome, 0))}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.tax)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### Navigation Update (`src/lib/constants.ts`)

```typescript
export const NAV_ITEMS = [
  // ... existing items ...
  {
    href: "/reports",
    label: "Reports",
    icon: FileText,
    roles: ["admin", "hr", "finance"],
    children: [
      { href: "/reports", label: "General Reports" },
      { href: "/reports/government", label: "Government Reports" },
    ],
  },
];
```

#### Acceptance Criteria
- ✅ Month selector for report period
- ✅ Summary cards showing totals
- ✅ Four tabs (SSS, PhilHealth, Pag-IBIG, Tax)
- ✅ Each tab shows employee breakdown
- ✅ Export CSV button (stub for MVP)
- ✅ Employer share calculated for SSS
- ✅ Accessible to Admin, HR, Finance only

---

# Phase 2: Enhanced MVP (Priority 2)

## 6️⃣ Departments & Positions Management

### New Page: `src/app/settings/organization/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Briefcase, Pencil, Trash2 } from "lucide-react";

interface Department {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  employeeCount: number;
}

interface Position {
  id: string;
  title: string;
  departmentId: string;
  level: "entry" | "mid" | "senior" | "lead" | "manager";
  employeeCount: number;
}

export default function OrganizationPage() {
  const [departments, setDepartments] = useState<Department[]>([
    { id: "1", name: "Engineering", code: "ENG", employeeCount: 8 },
    { id: "2", name: "Sales", code: "SALES", employeeCount: 4 },
  ]);
  
  const [positions, setPositions] = useState<Position[]>([
    { id: "1", title: "Software Engineer", departmentId: "1", level: "mid", employeeCount: 6 },
    { id: "2", title: "Engineering Manager", departmentId: "1", level: "manager", employeeCount: 2 },
  ]);
  
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Organization Structure</h1>
        <p className="text-muted-foreground mt-1">
          Manage departments, positions, and organizational hierarchy
        </p>
      </div>
      
      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Departments
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Add Department</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Department</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Department Name</Label>
                        <Input placeholder="e.g. Engineering" />
                      </div>
                      <div>
                        <Label>Department Code</Label>
                        <Input placeholder="e.g. ENG" />
                      </div>
                      <Button className="w-full">Create Department</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map(dept => (
                    <TableRow key={dept.id}>
                      <TableCell>
                        <Badge variant="outline">{dept.code}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.employeeCount} employees</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="positions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Positions
                </CardTitle>
                <Button>Add Position</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map(pos => (
                    <TableRow key={pos.id}>
                      <TableCell className="font-medium">{pos.title}</TableCell>
                      <TableCell>
                        {departments.find(d => d.id === pos.departmentId)?.name}
                      </TableCell>
                      <TableCell>
                        <Badge>{pos.level}</Badge>
                      </TableCell>
                      <TableCell>{pos.employeeCount} employees</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 7️⃣ Leave Balance Tracking

### Store Enhancement (`leave.store.ts`)

```typescript
interface LeaveBalance {
  employeeId: string;
  leaveType: string;
  accrued: number;
  used: number;
  remaining: number;
  carryForward: number;
}

interface LeaveState {
  // ... existing fields ...
  balances: LeaveBalance[];
  
  // New actions
  initializeBalances: (employeeId: string) => void;
  accrueLeave: (employeeId: string, type: string, days: number) => void;
  deductLeave: (requestId: string) => void;
}

// Implementation
initializeBalances: (employeeId: string) => {
  set((state) => ({
    balances: [
      ...state.balances,
      { employeeId, leaveType: "sick", accrued: 7, used: 0, remaining: 7, carryForward: 0 },
      { employeeId, leaveType: "vacation", accrued: 15, used: 0, remaining: 15, carryForward: 0 },
      { employeeId, leaveType: "emergency", accrued: 3, used: 0, remaining: 3, carryForward: 0 },
    ],
  }));
},

deductLeave: (requestId: string) => {
  set((state) => {
    const request = state.requests.find(r => r.id === requestId);
    if (!request || request.status !== "approved") return state;
    
    return {
      balances: state.balances.map(bal => {
        if (bal.employeeId === request.employeeId && bal.leaveType === request.type) {
          const newUsed = bal.used + request.daysCount;
          return {
            ...bal,
            used: newUsed,
            remaining: bal.accrued - newUsed,
          };
        }
        return bal;
      }),
    };
  });
},
```

### UI Display (`src/app/leave/page.tsx`)

```tsx
// Add balance cards at top
<div className="grid grid-cols-3 gap-4 mb-6">
  {balances.map(bal => (
    <Card key={bal.leaveType}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm capitalize">{bal.leaveType} Leave</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold">{bal.remaining}</span>
          <span className="text-muted-foreground text-sm mb-1">/ {bal.accrued} days</span>
        </div>
        <Progress value={(bal.remaining / bal.accrued) * 100} className="mt-2" />
      </CardContent>
    </Card>
  ))}
</div>
```

---

## 8️⃣ Overtime Request → Approval → Pay Workflow

### Data Model (`types/index.ts`)

```typescript
interface OvertimeRequest {
  id: string;
  employeeId: string;
  date: string;
  hoursRequested: number;
  reason: string;
  projectId?: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}
```

### Store (`attendance.store.ts`)

```typescript
interface AttendanceState {
  // ... existing ...
  overtimeRequests: OvertimeRequest[];
  
  submitOvertimeRequest: (data: Omit<OvertimeRequest, "id" | "status" | "requestedAt">) => void;
  approveOvertime: (requestId: string, approverId: string) => void;
  rejectOvertime: (requestId: string, approverId: string, reason: string) => void;
}
```

### UI (`src/app/attendance/page.tsx`)

```tsx
// Add "Overtime Requests" tab
<Tabs defaultValue="logs">
  <TabsList>
    <TabsTrigger value="logs">Attendance Logs</TabsTrigger>
    <TabsTrigger value="overtime">Overtime Requests</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overtime">
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Overtime Requests</CardTitle>
          {isEmployee && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Request Overtime</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Overtime</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>Hours</Label>
                    <Input type="number" min="1" max="8" />
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Textarea placeholder="Explain why overtime is needed..." />
                  </div>
                  <Button className="w-full">Submit Request</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overtimeRequests.map(req => (
              <TableRow key={req.id}>
                <TableCell>{getEmployeeName(req.employeeId)}</TableCell>
                <TableCell>{format(new Date(req.date), "PP")}</TableCell>
                <TableCell>{req.hoursRequested}h</TableCell>
                <TableCell className="max-w-xs truncate">{req.reason}</TableCell>
                <TableCell>
                  <Badge variant={req.status === "approved" ? "default" : req.status === "pending" ? "secondary" : "destructive"}>
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {req.status === "pending" && canApprove && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => handleApprove(req.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleReject(req.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

### Payroll Integration

```typescript
// In issuePayslips action
const approvedOT = overtimeRequests.filter(
  req => req.employeeId === empId 
    && req.status === "approved"
    && new Date(req.date) >= new Date(periodStart)
    && new Date(req.date) <= new Date(periodEnd)
);

const overtimeHours = approvedOT.reduce((sum, req) => sum + req.hoursRequested, 0);
const overtimePay = (employee.basicSalary / 22 / 8) * overtimeHours * 1.25;
```

---

## 9️⃣ Bank File Export (CSV)

### Implementation (`payroll.store.ts`)

```typescript
exportBankFile: (runId: string) => {
  const run = get().payrollRuns.find(r => r.id === runId);
  if (!run) return;
  
  const employees = useEmployeesStore.getState().employees;
  
  const csvRows = run.payslips.map(ps => {
    const emp = employees.find(e => e.id === ps.employeeId);
    return [
      emp?.bankAccount || "",
      emp?.name || "",
      ps.netPay.toFixed(2),
      format(new Date(ps.issuedAt), "yyyy-MM-dd"),
      ps.id,
    ].join(",");
  });
  
  const csv = [
    "Account Number,Employee Name,Amount,Payment Date,Reference",
    ...csvRows,
  ].join("\n");
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payroll-bank-file-${runId}.csv`;
  a.click();
  
  toast.success("Bank file exported");
}
```

### UI Button

```tsx
<Button variant="outline" onClick={() => exportBankFile(run.id)}>
  <Download className="h-4 w-4 mr-2" />
  Export Bank File
</Button>
```

---

## 🔟 Shift Templates Management

### Data Model (`types/index.ts`)

```typescript
interface ShiftTemplate {
  id: string;
  name: string;
  timeIn: string;  // "09:00"
  timeOut: string; // "18:00"
  gracePeriod: number; // minutes
  lateThreshold: number; // minutes
  hasBreak: boolean;
  breakDuration: number; // minutes
  workDays: number[]; // [1,2,3,4,5] = Mon-Fri
}
```

### Store (`attendance.store.ts`)

```typescript
interface AttendanceState {
  shiftTemplates: ShiftTemplate[];
  employeeShifts: Record<string, string>; // employeeId -> shiftId
  
  createShift: (shift: Omit<ShiftTemplate, "id">) => void;
  assignShift: (employeeId: string, shiftId: string) => void;
}
```

### UI (`src/app/settings/shifts/page.tsx`)

```tsx
"use client";

export default function ShiftsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shift Templates</h1>
          <p className="text-muted-foreground">
            Define work schedules and assign to employees
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Create Shift</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Shift Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Shift Name</Label>
                <Input placeholder="e.g. Day Shift" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Time In</Label>
                  <Input type="time" />
                </div>
                <div>
                  <Label>Time Out</Label>
                  <Input type="time" />
                </div>
              </div>
              <div>
                <Label>Grace Period (minutes)</Label>
                <Input type="number" placeholder="10" />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="hasBreak" />
                <Label htmlFor="hasBreak">Include break time</Label>
              </div>
              <Button className="w-full">Create Shift</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift Name</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
                <TableHead>Grace Period</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Day Shift</TableCell>
                <TableCell>09:00 AM</TableCell>
                <TableCell>06:00 PM</TableCell>
                <TableCell>10 minutes</TableCell>
                <TableCell>12 employees</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    Assign
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

# Phase 3: Nice-to-Have (Optional)

## 1️⃣1️⃣ Break Tracking (BREAK_START / BREAK_END)

- Add buttons to kiosk page
- Store events in attendance log
- Calculate paid vs unpaid break time
- Display in timesheet

## 1️⃣2️⃣ Half-Day Leave

- Add duration selector to leave request form: Full Day / Half Day AM / Half Day PM
- Adjust `daysCount` calculation (0.5 for half-day)
- Update balance deduction logic

## 1️⃣3️⃣ Night Differential Calculation

- Define night shift hours (10:00 PM - 6:00 AM)
- Calculate hours worked in night period
- Apply 10% premium per Philippine labor code
- Add as separate earning line in payslip

## 1️⃣4️⃣ Holidays Calendar Management

- Move from `constants.ts` to Settings page
- CRUD interface for holidays
- Mark as Regular or Special
- Auto-import annual DOLE holidays

---

# 📝 Implementation Checklist

## Phase 1 (Critical - 3 days)

- [ ] Payroll run locking with AlertDialog confirmation
- [ ] Policy snapshot capture on lock
- [ ] Auto loan deduction in payslip computation
- [ ] Loan deduction history tracking
- [ ] Semi-monthly cutoff selector (1-15, 16-EOM)
- [ ] Holiday pay multipliers implementation
- [ ] Government reports page (4 tabs)
- [ ] Export CSV button on government reports

## Phase 2 (Enhanced - 4 days)

- [ ] Departments CRUD page
- [ ] Positions CRUD page
- [ ] Link departments to employee profiles
- [ ] Leave balance initialization
- [ ] Leave balance cards on leave page
- [ ] Overtime request form
- [ ] Overtime approval workflow
- [ ] Overtime pay in payslip
- [ ] Bank file CSV export
- [ ] Shift templates CRUD
- [ ] Shift assignment to employees

## Phase 3 (Optional - 2 days)

- [ ] Break tracking buttons
- [ ] Half-day leave selector
- [ ] Night differential calculation
- [ ] Holidays calendar management

---

# 🎯 Success Criteria

### Phase 1 Complete (85/100)
- ✅ Payroll runs are immutable after locking
- ✅ Loans automatically deduct from payroll
- ✅ Semi-monthly cutoffs are selectable
- ✅ Holiday pay follows DOLE regulations
- ✅ Government compliance reports are available

### Phase 2 Complete (95/100)
- ✅ Organizational structure is manageable
- ✅ Leave balances are tracked and enforced
- ✅ Overtime follows request-approve-pay flow
- ✅ Bank files can be exported
- ✅ Shifts are definable and assignable

### Phase 3 Complete (100/100)
- ✅ Break periods are tracked
- ✅ Half-day leaves are supported
- ✅ Night differential is calculated
- ✅ Holiday calendar is configurable

---

# 🚀 Deployment Readiness

After Phase 1 completion, the MVP will be:
- ✅ Demo-ready for stakeholders
- ✅ Philippine labor law compliant
- ✅ Audit-defensible with locked payroll runs
- ✅ Complete enough to showcase all core workflows
- ✅ Production-architecture aligned (90% feature parity)

**Ready to begin implementation?** 🚀
