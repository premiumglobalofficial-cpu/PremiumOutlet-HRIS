import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["<rootDir>/src/__tests__/**/*.test.ts"],
  collectCoverageFrom: [
    // High-coverage lib modules (all >85%)
    "src/lib/camera-context.ts",
    "src/lib/geofence.ts",
    "src/lib/notifications.ts",
    "src/lib/payroll-deductions.ts",
    "src/lib/ph-deductions.ts",
    "src/lib/qr-utils.ts",
    // Security-critical lib modules (newly tested)
    "src/lib/kiosk-auth.ts",
    "src/lib/permissions-server.ts",
    "src/lib/env.ts",
    // High-coverage stores (all >85%)
    "src/store/leave.store.ts",
    "src/store/loans.store.ts",
    // Moderately covered stores (worth tracking)
    "src/store/attendance.store.ts",
    "src/store/employees.store.ts",
    "src/store/notifications.store.ts",
    // High-coverage API routes
    "src/app/api/import/employees/route.ts",
    "src/app/api/export/employees/route.ts",
    "src/app/api/settings/notification-preferences/route.ts",
    // Newly-tested security routes
    "src/app/api/kiosk/admin-pin/route.ts",
    "src/app/api/kiosk/admin-pin/verify/route.ts",
    "src/app/api/notifications/resend/route.ts",
    "src/app/api/project-verification/route.ts",
    "src/app/api/attendance/reconcile-absences/route.ts",
    "!src/**/*.d.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 8,
      functions: 15,
      lines: 10,
      statements: 10,
    },
  },
  // Test timeout for async operations
  testTimeout: 10000,
  // Clear mocks between tests
  clearMocks: true,
  // Verbose output for debugging
  verbose: true,
};

export default createJestConfig(config);
