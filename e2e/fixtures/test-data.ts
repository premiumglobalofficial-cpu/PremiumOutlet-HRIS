/**
 * E2E test data — factories aligned with src/data/seed.ts (demo mode).
 */

export const DEMO_ADMIN = {
  email: "admin@premiumoutlets.com.ph",
  password: "demo1234",
  role: "admin",
} as const;

export const DEMO_HR = {
  email: "hr@premiumoutlets.com.ph",
  password: "demo1234",
  role: "hr",
} as const;

export const ROUTES = {
  login: "/login",
  adminDashboard: "/admin/dashboard",
  adminEmployees: "/admin/employees/manage",
  adminAttendance: "/admin/attendance",
  adminPayroll: "/admin/payroll",
  kiosk: "/kiosk",
} as const;
