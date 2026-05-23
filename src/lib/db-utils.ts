/**
 * Utility for converting between camelCase (TypeScript) and snake_case (PostgreSQL).
 */

/** Convert a snake_case string to camelCase */
export function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Convert a camelCase string to snake_case */
export function toSnake(s: string): string {
  // Insert _ before a capital that is preceded by a lowercase/digit,
  // or before a capital that is followed by lowercase (handles acronyms like UTC, ID).
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

/** Convert all keys of an object from snake_case to camelCase */
export function keysToCamel<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toCamel(key)] = value;
  }
  return result;
}

/** Convert all keys of an object from camelCase to snake_case */
export function keysToSnake<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toSnake(key)] = value;
  }
  return result;
}

/** Convert an array of DB rows (snake_case) to camelCase objects */
export function rowsToCamel<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => keysToCamel(row) as T);
}

/** Convert a single object to snake_case for DB insert/update */
export function toDbRow(obj: Record<string, unknown>): Record<string, unknown> {
  return keysToSnake(obj);
}

/**
 * Valid system roles per DB CHECK constraint.
 * Job titles (Frontend Developer, etc.) are NOT valid DB roles.
 */
const VALID_DB_ROLES = new Set([
  "admin",
  "hr",
  "finance",
  "employee",
  "supervisor",
  "payroll_admin",
  "auditor",
]);

/**
 * Map a role string to a valid DB role.
 * - If already a valid system role, return as-is (lowercased).
 * - If a job title or invalid value, default to "employee".
 */
export function roleToDbFormat(role: string): string {
  if (!role) return "employee";
  const lower = role.toLowerCase();
  if (VALID_DB_ROLES.has(lower)) return lower;
  // Job titles like "Frontend Developer" are not valid DB roles → default to "employee"
  console.warn(`[db-utils] Invalid role "${role}" mapped to "employee" for DB storage`);
  return "employee";
}

/** Pass-through: employees.role is already lowercase in DB */
export function roleFromDb(role: string): string {
  return role;
}

/**
 * Check if a role is a valid system role (not a job title).
 */
export function isValidSystemRole(role: string): boolean {
  return VALID_DB_ROLES.has(role?.toLowerCase() ?? "");
}
