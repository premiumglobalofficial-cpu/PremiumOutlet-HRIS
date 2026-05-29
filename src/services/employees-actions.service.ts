"use client";
/**
 * Employees Actions Service — DB-first mutations via /api/employees.
 *
 * Writes to Supabase through server routes (service role + auth gate), then
 * updates local Zustand cache on success.
 */

import { useEmployeesStore } from "@/store/employees.store";
import type { Employee, SalaryChangeRequest, SalaryHistoryEntry } from "@/types";
import { nanoid } from "nanoid";
import { employeesDb, salaryDb } from "./db.service";

async function persistEmployee(emp: Employee): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/employees", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(emp),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) {
    return { ok: false, error: data.error ?? `Save failed (${res.status})` };
  }
  return { ok: true };
}

async function patchEmployeeApi(
  id: string,
  patch: Partial<Employee>,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/employees/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) {
    return { ok: false, error: data.error ?? `Update failed (${res.status})` };
  }
  return { ok: true };
}

/**
 * Add an employee — API-first (falls back to direct client upsert in demo if API unavailable).
 */
export async function addEmployee(emp: Employee): Promise<{ ok: boolean; error?: string }> {
  const store = useEmployeesStore.getState();
  if (store.employees.some((e) => e.id === emp.id)) {
    return { ok: false, error: `Employee ID "${emp.id}" already exists.` };
  }
  if (store.employees.some((e) => e.email.toLowerCase() === emp.email.toLowerCase())) {
    return { ok: false, error: `An employee with email "${emp.email}" already exists.` };
  }

  const withTimestamps: Employee = {
    ...emp,
    createdAt: emp.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let saved = await persistEmployee(withTimestamps);
  if (!saved.ok) {
    const fallback = await employeesDb.upsert(withTimestamps);
    if (!fallback) return saved;
  }

  useEmployeesStore.setState((s) => ({
    employees: [...s.employees, withTimestamps],
    deletedEmployeeIds: s.deletedEmployeeIds.filter((id) => id !== emp.id),
  }));
  return { ok: true };
}

/**
 * Update an employee — API-first.
 */
export async function updateEmployee(
  id: string,
  patch: Partial<Employee>,
): Promise<{ ok: boolean; error?: string }> {
  const patchWithTs = { ...patch, updatedAt: new Date().toISOString() };
  let saved = await patchEmployeeApi(id, patchWithTs);
  if (!saved.ok) {
    const fallback = await employeesDb.update(id, patchWithTs);
    if (!fallback) return saved;
  }

  useEmployeesStore.setState((s) => ({
    employees: s.employees.map((e) => (e.id === id ? { ...e, ...patchWithTs } : e)),
  }));
  return { ok: true };
}

/**
 * Remove an employee — API DELETE then local cache.
 */
export async function removeEmployee(id: string): Promise<boolean> {
  const res = await fetch(`/api/employees/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
  if (!res.ok || data.ok === false) {
    const fallback = await employeesDb.remove(id);
    if (!fallback) return false;
  }

  useEmployeesStore.setState((s) => ({
    employees: s.employees.filter((e) => e.id !== id),
    deletedEmployeeIds: [...new Set([...s.deletedEmployeeIds, id])],
  }));
  return true;
}

/**
 * Toggle employee status — DB-first.
 */
export async function toggleStatus(id: string): Promise<boolean> {
  const store = useEmployeesStore.getState();
  const emp = store.employees.find((e) => e.id === id);
  if (!emp) return false;

  const newStatus = emp.status === "active" ? "inactive" : "active";
  const result = await updateEmployee(id, { status: newStatus });
  return result.ok;
}

/**
 * Resign an employee — DB-first.
 */
export async function resignEmployee(id: string): Promise<boolean> {
  const result = await updateEmployee(id, {
    status: "resigned",
    resignedAt: new Date().toISOString(),
  });
  return result.ok;
}

/**
 * Propose a salary change — DB-first.
 */
export async function proposeSalaryChange(data: {
  employeeId: string;
  proposedSalary: number;
  effectiveDate: string;
  reason: string;
  proposedBy: string;
}): Promise<{ ok: boolean; id?: string }> {
  const store = useEmployeesStore.getState();
  const emp = store.employees.find((e) => e.id === data.employeeId);
  if (!emp) return { ok: false };

  const req: SalaryChangeRequest = {
    id: `SCR-${nanoid(8)}`,
    employeeId: data.employeeId,
    oldSalary: emp.salary,
    proposedSalary: data.proposedSalary,
    effectiveDate: data.effectiveDate,
    reason: data.reason,
    proposedBy: data.proposedBy,
    proposedAt: new Date().toISOString(),
    status: "pending",
  };

  const ok = await salaryDb.upsertRequest(req);
  if (!ok) return { ok: false };

  useEmployeesStore.setState((s) => ({
    salaryRequests: [...s.salaryRequests, req],
  }));
  return { ok: true, id: req.id };
}

/**
 * Approve a salary change — DB-first.
 */
export async function approveSalaryChange(requestId: string, reviewerId: string): Promise<boolean> {
  const store = useEmployeesStore.getState();
  const req = store.salaryRequests.find((r) => r.id === requestId);
  if (!req || req.status !== "pending") return false;

  const updatedReq: SalaryChangeRequest = {
    ...req,
    status: "approved",
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString(),
  };

  const historyEntry: SalaryHistoryEntry = {
    id: `SH-${nanoid(8)}`,
    employeeId: req.employeeId,
    monthlySalary: req.proposedSalary,
    effectiveFrom: req.effectiveDate,
    approvedBy: reviewerId,
    reason: req.reason,
  };

  const [reqOk, histOk, empOk] = await Promise.all([
    salaryDb.upsertRequest(updatedReq),
    salaryDb.insertHistory(historyEntry),
    updateEmployee(req.employeeId, { salary: req.proposedSalary }),
  ]);

  if (!reqOk || !empOk) return false;

  useEmployeesStore.getState().approveSalaryChange(requestId, reviewerId);
  return true;
}

/**
 * Reject a salary change — DB-first.
 */
export async function rejectSalaryChange(requestId: string, reviewerId: string): Promise<boolean> {
  const store = useEmployeesStore.getState();
  const req = store.salaryRequests.find((r) => r.id === requestId);
  if (!req || req.status !== "pending") return false;

  const updatedReq: SalaryChangeRequest = {
    ...req,
    status: "rejected",
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString(),
  };

  const ok = await salaryDb.upsertRequest(updatedReq);
  if (!ok) return false;

  useEmployeesStore.setState((s) => ({
    salaryRequests: s.salaryRequests.map((r) =>
      r.id === requestId ? updatedReq : r,
    ),
  }));
  return true;
}
