import { keysToCamel, keysToSnake, roleFromDb, roleToDbFormat } from "@/lib/db-utils";
import type { Employee } from "@/types";

/** Map DB row → Employee (server-safe, no "use client"). */
export function employeeFromDb(row: Record<string, unknown>): Employee {
  const camel = keysToCamel(row) as Record<string, unknown>;
  if (typeof camel.role === "string") {
    camel.role = roleFromDb(camel.role as string);
  }
  if (typeof camel.workDays === "string") {
    try {
      camel.workDays = JSON.parse(camel.workDays as string);
    } catch {
      /* keep as-is */
    }
  }
  return camel as unknown as Employee;
}

/** Map Employee → DB row (snake_case + role format). */
export function employeeToDb(emp: Partial<Employee>): Record<string, unknown> {
  const row = keysToSnake(emp as Record<string, unknown>);
  if (typeof row.role === "string") {
    row.role = roleToDbFormat(row.role as string);
  }
  return row;
}
