/**
 * Security Route Tests
 * =====================
 * Tests auth + RBAC guards for all security-critical API routes added/modified
 * during the production-readiness audit. Also tests lib/kiosk-auth and lib/env.
 *
 * Routes covered:
 *   - POST /api/attendance/reconcile-absences  (admin/hr only)
 *   - GET  /api/kiosk/admin-pin               (disabled â€” 405)
 *   - POST /api/kiosk/admin-pin               (admin only, sets PIN)
 *   - POST /api/kiosk/admin-pin/verify        (public, verifies PIN)
 *   - POST /api/notifications/resend          (auth required)
 *   - GET  /api/project-verification          (auth required)
 *   - POST /api/project-verification          (projects:manage required)
 *
 * Lib coverage:
 *   - src/lib/kiosk-auth.ts     (validateKioskAuth)
 *   - src/lib/permissions-server.ts (hasPermissionServer)
 *   - src/lib/env.ts            (getFaceTemplateEncryptionKey)
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/services/supabase-server";

// â”€â”€â”€ Route handlers under test â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { POST as reconcileAbsencesPOST } from "@/app/api/attendance/reconcile-absences/route";
import { GET as adminPinGET, POST as adminPinPOST } from "@/app/api/kiosk/admin-pin/route";
import { POST as adminPinVerifyPOST } from "@/app/api/kiosk/admin-pin/verify/route";
import { POST as resendNotificationPOST } from "@/app/api/notifications/resend/route";
import { GET as projectVerificationGET, POST as projectVerificationPOST } from "@/app/api/project-verification/route";

// â”€â”€â”€ Lib modules under test â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { validateKioskAuth, KIOSK_AUTH_HEADER } from "@/lib/kiosk-auth";
import { hasPermissionServer } from "@/lib/permissions-server";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function makeRequest(method: "GET" | "POST", url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Mock Supabase with a given user id and role (from `profiles` table) */
function mockAuthWithProfile(userId: string, role: string) {
  (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
    from: jest.fn((table: string) => {
      if (table === "profiles" || table === "employees") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: userId, role }, error: null }),
            }),
          }),
        };
      }
      // For other tables (e.g. attendance, audit_logs) return empty results
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };
    }),
  });
}

/** Mock unauthenticated Supabase */
function mockAuthAsAnon() {
  (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: jest.fn(),
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 1. lib/permissions-server â€” hasPermissionServer
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe("lib/permissions-server â€” hasPermissionServer", () => {
  it("admin has all permissions (wildcard *)", () => {
    expect(hasPermissionServer("admin", "attendance:edit")).toBe(true);
    expect(hasPermissionServer("admin", "payroll:generate")).toBe(true);
    expect(hasPermissionServer("admin", "projects:manage")).toBe(true);
  });

  it("hr has attendance:edit but not projects:manage", () => {
    expect(hasPermissionServer("hr", "attendance:edit")).toBe(true);
    expect(hasPermissionServer("hr", "projects:manage")).toBe(false);
  });

  it("supervisor has projects:manage but not attendance:edit", () => {
    expect(hasPermissionServer("supervisor", "projects:manage")).toBe(true);
    expect(hasPermissionServer("supervisor", "attendance:edit")).toBe(false);
  });

  it("employee role has no special permissions", () => {
    expect(hasPermissionServer("employee", "attendance:edit")).toBe(false);
    expect(hasPermissionServer("employee", "projects:manage")).toBe(false);
    expect(hasPermissionServer("employee", "payroll:generate")).toBe(false);
  });

  it("unknown role returns false for any permission", () => {
    expect(hasPermissionServer("unknown_role", "attendance:edit")).toBe(false);
    expect(hasPermissionServer("", "attendance:edit")).toBe(false);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 2. lib/kiosk-auth â€” validateKioskAuth
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe("lib/kiosk-auth â€” validateKioskAuth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns ok:true in demo mode regardless of key", () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    const headers = new Headers();
    const result = validateKioskAuth(headers);
    expect(result.ok).toBe(true);
  });

  it("returns 403 in production when KIOSK_API_KEY not set", () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    delete process.env.KIOSK_API_KEY;
    const headers = new Headers();
    const result = validateKioskAuth(headers);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });

  it("returns 401 when key header is missing (key configured)", () => {
    process.env.KIOSK_API_KEY = "test-secret-key";
    const headers = new Headers();
    const result = validateKioskAuth(headers);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("returns ok:true when correct key is provided", () => {
    process.env.KIOSK_API_KEY = "correct-key-abc123";
    const headers = new Headers({ [KIOSK_AUTH_HEADER]: "correct-key-abc123" });
    const result = validateKioskAuth(headers);
    expect(result.ok).toBe(true);
  });

  it("returns 403 when wrong key is provided", () => {
    process.env.KIOSK_API_KEY = "correct-key";
    const headers = new Headers({ [KIOSK_AUTH_HEADER]: "wrong-key" });
    const result = validateKioskAuth(headers);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 3. POST /api/attendance/reconcile-absences
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe("POST /api/attendance/reconcile-absences", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuthAsAnon();
    const req = makeRequest("POST", "http://localhost/api/attendance/reconcile-absences");
    const res = await reconcileAbsencesPOST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated as employee (no attendance:edit)", async () => {
    // Employee role does not have attendance:edit permission
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-emp" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "employee" }, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    });
    const req = makeRequest("POST", "http://localhost/api/attendance/reconcile-absences");
    const res = await reconcileAbsencesPOST(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 when authenticated as supervisor (no attendance:edit)", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-sup" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "supervisor" }, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    });
    const req = makeRequest("POST", "http://localhost/api/attendance/reconcile-absences");
    const res = await reconcileAbsencesPOST(req);
    expect(res.status).toBe(403);
  });

  it("proceeds (no 403) when authenticated as admin", async () => {
    // Admin has attendance:edit; route will proceed to DB queries which return empty
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
              }),
            }),
          };
        }
        // employees query
        if (table === "employees") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    });
    const req = makeRequest("POST", "http://localhost/api/attendance/reconcile-absences");
    const res = await reconcileAbsencesPOST(req);
    // Should not be 401 or 403 â€” admin passes auth/role checks
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 4. GET /api/kiosk/admin-pin â€” disabled endpoint
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe("GET /api/kiosk/admin-pin", () => {
  it("returns 405 Method Not Allowed", async () => {
    const res = await adminPinGET();
    expect(res.status).toBe(405);
    const json = await res.json();
    expect(json.error).toMatch(/Method not allowed/i);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 5. POST /api/kiosk/admin-pin â€” save new PIN (admin only)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe("POST /api/kiosk/admin-pin", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuthAsAnon();
    const req = makeRequest("POST", "http://localhost/api/kiosk/admin-pin", { pin: "1234" });
    const res = await adminPinPOST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated as hr (non-admin)", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-hr" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "employees") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "hr" }, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    });
    const req = makeRequest("POST", "http://localhost/api/kiosk/admin-pin", { pin: "1234" });
    const res = await adminPinPOST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid PIN format (too short)", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "employees") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    });
    const req = makeRequest("POST", "http://localhost/api/kiosk/admin-pin", { pin: "12" });
    const res = await adminPinPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-digit PIN", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "employees") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    });
    const req = makeRequest("POST", "http://localhost/api/kiosk/admin-pin", { pin: "abcd" });
    const res = await adminPinPOST(req);
    expect(res.status).toBe(400);
  });

  it("saves valid PIN as admin and returns 200", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "employees") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
              }),
            }),
          };
        }
        if (table === "kiosk_pins") {
          // Route does select().eq().maybeSingle() then insert()
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    });
    const req = makeRequest("POST", "http://localhost/api/kiosk/admin-pin", { pin: "1234" });
    const res = await adminPinPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 6. POST /api/kiosk/admin-pin/verify â€” public PIN verification
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe("POST /api/kiosk/admin-pin/verify", () => {
  it("returns 400 for invalid PIN format", async () => {
    const req = makeRequest("POST", "http://localhost/api/kiosk/admin-pin/verify", { pin: "ab" });
    const res = await adminPinVerifyPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing pin field", async () => {
    const req = makeRequest("POST", "http://localhost/api/kiosk/admin-pin/verify", {});
    const res = await adminPinVerifyPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns {valid:false, reason:'no_pin_configured'} when no PIN exists in DB", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: { getUser: jest.fn() },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      })),
    });
    const req = makeRequest("POST", "http://localhost/api/kiosk/admin-pin/verify", { pin: "1234" });
    const res = await adminPinVerifyPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.reason).toBe("no_pin_configured");
  });

  it("returns {valid:false} for wrong PIN", async () => {
    const crypto = require("crypto");
    const correctHash = crypto.createHash("sha256").update("kiosk-admin:9999").digest("hex");
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: { getUser: jest.fn() },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { pin_hash: correctHash }, error: null }),
            }),
          }),
        }),
      })),
    });
    const req = makeRequest("POST", "http://localhost/api/kiosk/admin-pin/verify", { pin: "1234" });
    const res = await adminPinVerifyPOST(req);
    const json = await res.json();
    expect(json.valid).toBe(false);
  });

  it("returns {valid:true} for correct PIN", async () => {
    const crypto = require("crypto");
    const correctHash = crypto.createHash("sha256").update("kiosk-admin:1234").digest("hex");
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: { getUser: jest.fn() },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { pin_hash: correctHash }, error: null }),
            }),
          }),
        }),
      })),
    });
    const req = makeRequest("POST", "http://localhost/api/kiosk/admin-pin/verify", { pin: "1234" });
    const res = await adminPinVerifyPOST(req);
    const json = await res.json();
    expect(json.valid).toBe(true);
  });

  it("returns {valid:false, reason:'verification_error'} on DB error (status 503)", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: { getUser: jest.fn() },
      from: jest.fn(() => {
        throw new Error("DB connection failed");
      }),
    });
    const req = makeRequest("POST", "http://localhost/api/kiosk/admin-pin/verify", { pin: "1234" });
    const res = await adminPinVerifyPOST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.reason).toBe("verification_error");
  });

  it("NEVER falls back to a default PIN â€” DB error â†’ deny access", async () => {
    // This test explicitly verifies the security fix: no DEFAULT_PIN fallback
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: { getUser: jest.fn() },
      from: jest.fn(() => {
        throw new Error("Simulated DB outage");
      }),
    });
    const req = makeRequest("POST", "http://localhost/api/kiosk/admin-pin/verify", { pin: "000000" });
    const res = await adminPinVerifyPOST(req);
    const json = await res.json();
    // Must be denied â€” 000000 is the old default PIN that was removed
    expect(json.valid).toBe(false);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 7. POST /api/notifications/resend
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe("POST /api/notifications/resend", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuthAsAnon();
    const req = new Request("http://localhost/api/notifications/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: "EMP01",
        employeeName: "Juan",
        employeeEmail: "juan@test.com",
        type: "assignment",
        projectName: "Project X",
      }),
    });
    const res = await resendNotificationPOST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn(),
    });
    const req = new Request("http://localhost/api/notifications/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: "EMP01" }), // missing required fields
    });
    const res = await resendNotificationPOST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid type", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn(),
    });
    const req = new Request("http://localhost/api/notifications/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: "EMP01",
        employeeName: "Juan",
        employeeEmail: "juan@test.com",
        type: "invalid_type",
      }),
    });
    const res = await resendNotificationPOST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
  });

  it("returns 200 for valid assignment notification", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn(),
    });
    const req = new Request("http://localhost/api/notifications/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: "EMP01",
        employeeName: "Juan",
        employeeEmail: "juan@test.com",
        type: "assignment",
        projectName: "Project X",
      }),
    });
    const res = await resendNotificationPOST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 200 for valid absence notification", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn(),
    });
    const req = new Request("http://localhost/api/notifications/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: "EMP01",
        employeeName: "Juan",
        employeeEmail: "juan@test.com",
        type: "absence",
        date: "2025-01-15",
      }),
    });
    const res = await resendNotificationPOST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(200);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 8. GET /api/project-verification
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

jest.mock("@/services/project-verification.service", () => ({
  getProjectVerificationMethod: jest.fn().mockResolvedValue({ projectId: "P1", method: "qr_only" }),
  getAllProjectVerificationMethods: jest.fn().mockResolvedValue([
    { projectId: "P1", method: "qr_only" },
    { projectId: "P2", method: "face_only" },
  ]),
  setProjectVerificationMethod: jest.fn().mockResolvedValue({ ok: true }),
}));

describe("GET /api/project-verification", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuthAsAnon();
    const { NextRequest } = require("next/server");
    const req = new NextRequest("http://localhost/api/project-verification");
    const res = await projectVerificationGET(req);
    expect(res.status).toBe(401);
  });

  it("returns all projects for authenticated user", async () => {
    const { getAllProjectVerificationMethods } = require("@/services/project-verification.service");
    (getAllProjectVerificationMethods as jest.Mock).mockResolvedValueOnce([
      { projectId: "P1", method: "qr_only" },
    ]);
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn(),
    });
    // project-verification GET uses request.nextUrl.searchParams â€” must use NextRequest
    const { NextRequest } = require("next/server");
    const req = new NextRequest("http://localhost/api/project-verification");
    const res = await projectVerificationGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
  });

  it("returns single project when projectId param given", async () => {
    const { getProjectVerificationMethod } = require("@/services/project-verification.service");
    (getProjectVerificationMethod as jest.Mock).mockResolvedValueOnce({ projectId: "P1", method: "qr_only" });
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn(),
    });
    const { NextRequest } = require("next/server");
    const req = new NextRequest("http://localhost/api/project-verification?projectId=P1");
    const res = await projectVerificationGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.projectId).toBe("P1");
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 9. POST /api/project-verification
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe("POST /api/project-verification", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuthAsAnon();
    const req = new Request("http://localhost/api/project-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "P1", method: "qr_only" }),
    }) as unknown as import("next/server").NextRequest;
    const res = await projectVerificationPOST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks projects:manage permission", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-employee" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "employee" }, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    });
    const req = new Request("http://localhost/api/project-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "P1", method: "qr_only" }),
    }) as unknown as import("next/server").NextRequest;
    const res = await projectVerificationPOST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing projectId", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    });
    const req = new Request("http://localhost/api/project-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "qr_only" }), // missing projectId
    }) as unknown as import("next/server").NextRequest;
    const res = await projectVerificationPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid method", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    });
    const req = new Request("http://localhost/api/project-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "P1", method: "invalid_method" }),
    }) as unknown as import("next/server").NextRequest;
    const res = await projectVerificationPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 for valid admin request", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    });
    const req = new Request("http://localhost/api/project-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "P1", method: "qr_only" }),
    }) as unknown as import("next/server").NextRequest;
    const res = await projectVerificationPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 10. lib/env.ts â€” getFaceTemplateEncryptionKey
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe("lib/env â€” getFaceTemplateEncryptionKey", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns the key when FACE_TEMPLATE_ENCRYPTION_KEY is set", () => {
    process.env.FACE_TEMPLATE_ENCRYPTION_KEY = "my-test-key";
    const { getFaceTemplateEncryptionKey } = require("@/lib/env");
    const key = getFaceTemplateEncryptionKey();
    expect(key).toBe("my-test-key");
  });

  it("returns dev default when key is not set in non-production", () => {
    delete process.env.FACE_TEMPLATE_ENCRYPTION_KEY;
    Object.defineProperty(process.env, "NODE_ENV", { value: "test", configurable: true });
    // Clear module cache so the module re-reads env
    jest.resetModules();
    const { getFaceTemplateEncryptionKey } = require("@/lib/env");
    const key = getFaceTemplateEncryptionKey();
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  it("throws in production when FACE_TEMPLATE_ENCRYPTION_KEY is not set", () => {
    delete process.env.FACE_TEMPLATE_ENCRYPTION_KEY;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    jest.resetModules();
    const { getFaceTemplateEncryptionKey } = require("@/lib/env");
    expect(() => getFaceTemplateEncryptionKey()).toThrow("FACE_TEMPLATE_ENCRYPTION_KEY must be set");
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 11. lib/permissions-server â€” compound checks and route access
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { hasAllPermissionsServer, hasAnyPermissionServer, canAccessRoute, getRolePermissions } from "@/lib/permissions-server";

describe("lib/permissions-server â€” compound checks and route access", () => {
  it("hasAllPermissionsServer: admin passes all combinations", () => {
    expect(hasAllPermissionsServer("admin", ["attendance:edit", "payroll:generate"])).toBe(true);
  });

  it("hasAllPermissionsServer: hr fails if any permission missing", () => {
    expect(hasAllPermissionsServer("hr", ["attendance:edit", "payroll:lock"])).toBe(false);
  });

  it("hasAnyPermissionServer: employee fails with no matching permissions", () => {
    expect(hasAnyPermissionServer("employee", ["attendance:edit", "payroll:generate"])).toBe(false);
  });

  it("hasAnyPermissionServer: hr passes if at least one matches", () => {
    expect(hasAnyPermissionServer("hr", ["attendance:edit", "payroll:generate"])).toBe(true);
  });

  it("getRolePermissions: returns empty array for unknown role", () => {
    const perms = getRolePermissions("unknown_role");
    expect(Array.isArray(perms)).toBe(true);
    expect(perms.length).toBe(0);
  });

  it("getRolePermissions: returns permissions for hr role", () => {
    const perms = getRolePermissions("hr");
    expect(perms).toContain("attendance:edit");
    expect(perms).toContain("leave:approve");
  });

  it("canAccessRoute: allows user on unprotected path", () => {
    const result = canAccessRoute("employee", "/employee/dashboard");
    expect(result.allowed).toBe(true);
  });

  it("canAccessRoute: allows admin on any path", () => {
    const result = canAccessRoute("admin", "/admin/payroll");
    expect(result.allowed).toBe(true);
  });

  it("canAccessRoute: denies supervisor on payroll path", () => {
    // supervisor does not have page:payroll
    const result = canAccessRoute("supervisor", "/supervisor/payroll");
    expect(result.allowed).toBe(false);
  });

  it("canAccessRoute: allows hr on attendance path", () => {
    const result = canAccessRoute("hr", "/hr/attendance");
    expect(result.allowed).toBe(true);
  });

  it("canAccessRoute: denies employee on audit path", () => {
    const result = canAccessRoute("employee", "/employee/audit");
    expect(result.allowed).toBe(false);
  });

  it("canAccessRoute: allows employee on my-payslips (payroll:view_own)", () => {
    const result = canAccessRoute("employee", "/employee/my-payslips");
    expect(result.allowed).toBe(true);
  });

  it("canAccessRoute: allows employee on loans (anyOf: loans:view_own)", () => {
    const result = canAccessRoute("employee", "/employee/loans");
    expect(result.allowed).toBe(true);
  });

  it("canAccessRoute: denies employee on employees/manage path", () => {
    const result = canAccessRoute("employee", "/employee/employees/manage");
    expect(result.allowed).toBe(false);
  });

  it("canAccessRoute: allows hr on leave path", () => {
    const result = canAccessRoute("hr", "/hr/leave");
    expect(result.allowed).toBe(true);
  });

  it("canAccessRoute: returns allowed:true for unmatched path", () => {
    const result = canAccessRoute("employee", "/employee/some-unprotected-page");
    expect(result.allowed).toBe(true);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 12. POST /api/attendance/reconcile-absences â€” main logic
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe("POST /api/attendance/reconcile-absences â€” main logic", () => {
  it("returns ok:true with created:0 when there are no active employees", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
              }),
            }),
          };
        }
        if (table === "employees") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    });
    const req = makeRequest("POST", "http://localhost/api/attendance/reconcile-absences", {
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    });
    const res = await reconcileAbsencesPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.created).toBe(0);
  });

  it("returns 500 when employees DB query fails", async () => {
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
              }),
            }),
          };
        }
        if (table === "employees") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
            }),
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    });
    const req = makeRequest("POST", "http://localhost/api/attendance/reconcile-absences");
    const res = await reconcileAbsencesPOST(req);
    expect(res.status).toBe(500);
  });

  it("proceeds through main loop when employees exist (hr role)", async () => {
    const employee = { id: "EMP01", name: "Juan", work_days: ["Mon","Tue","Wed","Thu","Fri"], join_date: "2024-01-01", status: "active" };
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "uid-hr" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { role: "hr" }, error: null }),
              }),
            }),
          };
        }
        if (table === "employees") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [employee], error: null }),
            }),
          };
        }
        if (table === "holidays") {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === "attendance_logs") {
          let callIdx = 0;
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
            upsert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === "attendance_events") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "leave_requests") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                or: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === "audit_logs") {
          return { insert: jest.fn().mockResolvedValue({ error: null }) };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          insert: jest.fn().mockResolvedValue({ error: null }),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    });
    const req = makeRequest("POST", "http://localhost/api/attendance/reconcile-absences", {
      startDate: "2025-01-06",
      endDate: "2025-01-06",
    });
    const res = await reconcileAbsencesPOST(req);
    expect(res.status).toBe(200);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 13. lib/env â€” all accessors
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe("lib/env â€” all accessors", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it("getSupabaseUrl: returns value when set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    const { getSupabaseUrl } = require("@/lib/env");
    expect(getSupabaseUrl()).toBe("https://example.supabase.co");
  });

  it("getSupabaseUrl: throws when missing and not demo mode", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    const { getSupabaseUrl } = require("@/lib/env");
    expect(() => getSupabaseUrl()).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("getSupabaseUrl: returns empty string in demo mode without key", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    const { getSupabaseUrl } = require("@/lib/env");
    expect(getSupabaseUrl()).toBe("");
  });

  it("getSupabaseAnonKey: returns value when set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-123";
    const { getSupabaseAnonKey } = require("@/lib/env");
    expect(getSupabaseAnonKey()).toBe("anon-key-123");
  });

  it("getSupabaseAnonKey: throws when missing and not demo mode", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    const { getSupabaseAnonKey } = require("@/lib/env");
    expect(() => getSupabaseAnonKey()).toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("getServiceRoleKey: throws when missing", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { getServiceRoleKey } = require("@/lib/env");
    expect(() => getServiceRoleKey()).toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("getServiceRoleKey: returns value when set", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    const { getServiceRoleKey } = require("@/lib/env");
    expect(getServiceRoleKey()).toBe("service-role-key");
  });

  it("getDashScopeBaseUrl: returns custom when set", () => {
    process.env.DASHSCOPE_BASE_URL = "https://custom.api.url";
    const { getDashScopeBaseUrl } = require("@/lib/env");
    expect(getDashScopeBaseUrl()).toBe("https://custom.api.url");
  });

  it("getDashScopeBaseUrl: returns default when not set", () => {
    delete process.env.DASHSCOPE_BASE_URL;
    const { getDashScopeBaseUrl } = require("@/lib/env");
    expect(getDashScopeBaseUrl()).toContain("dashscope.aliyuncs.com");
  });

  it("getQwenApiKey: returns value when set", () => {
    process.env.QWEN_API_KEY = "qwen-key";
    const { getQwenApiKey } = require("@/lib/env");
    expect(getQwenApiKey()).toBe("qwen-key");
  });

  it("getQwenApiKey: returns undefined when not set", () => {
    delete process.env.QWEN_API_KEY;
    const { getQwenApiKey } = require("@/lib/env");
    expect(getQwenApiKey()).toBeUndefined();
  });

  it("getQwenModel: returns explicit QWEN_MODEL env if set", () => {
    process.env.QWEN_MODEL = "qwen-vl-custom";
    const { getQwenModel } = require("@/lib/env");
    expect(getQwenModel()).toBe("qwen-vl-custom");
  });

  it("getQwenModel: returns qwen-vl-max in production", () => {
    delete process.env.QWEN_MODEL;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    const { getQwenModel } = require("@/lib/env");
    expect(getQwenModel()).toBe("qwen-vl-max");
  });

  it("getQwenModel: returns qwen-vl-plus in development", () => {
    delete process.env.QWEN_MODEL;
    Object.defineProperty(process.env, "NODE_ENV", { value: "development", configurable: true });
    const { getQwenModel } = require("@/lib/env");
    expect(getQwenModel()).toBe("qwen-vl-plus");
  });

  it("getT800BridgeTargetUrl: returns T800_BRIDGE_TARGET_URL when set", () => {
    process.env.T800_BRIDGE_TARGET_URL = "http://t800.local";
    const { getT800BridgeTargetUrl } = require("@/lib/env");
    expect(getT800BridgeTargetUrl()).toBe("http://t800.local");
  });

  it("getT800BridgeTargetUrl: falls back to HRMS_URL", () => {
    delete process.env.T800_BRIDGE_TARGET_URL;
    process.env.HRMS_URL = "http://hrms.local";
    const { getT800BridgeTargetUrl } = require("@/lib/env");
    expect(getT800BridgeTargetUrl()).toBe("http://hrms.local");
  });

  it("getT800BridgeTargetUrl: falls back to default", () => {
    delete process.env.T800_BRIDGE_TARGET_URL;
    delete process.env.HRMS_URL;
    const { getT800BridgeTargetUrl } = require("@/lib/env");
    expect(getT800BridgeTargetUrl()).toContain("localhost");
  });

  it("getT800AllowedDeviceIds: parses comma-separated list", () => {
    process.env.T800_DEVICE_IDS = "DEV001, DEV002 , DEV003";
    const { getT800AllowedDeviceIds } = require("@/lib/env");
    expect(getT800AllowedDeviceIds()).toEqual(["DEV001", "DEV002", "DEV003"]);
  });

  it("getT800AllowedDeviceIds: returns empty array when not set", () => {
    delete process.env.T800_DEVICE_IDS;
    delete process.env.BIOMETRIC_DEVICE_IDS;
    const { getT800AllowedDeviceIds } = require("@/lib/env");
    expect(getT800AllowedDeviceIds()).toEqual([]);
  });

  it("getT800RequestCode: returns custom value when set", () => {
    process.env.T800_REQUEST_CODE = "custom_code";
    const { getT800RequestCode } = require("@/lib/env");
    expect(getT800RequestCode()).toBe("custom_code");
  });

  it("getT800RequestCode: returns default when not set", () => {
    delete process.env.T800_REQUEST_CODE;
    const { getT800RequestCode } = require("@/lib/env");
    expect(getT800RequestCode()).toBe("realtime_glog");
  });

  it("getT800Only: returns true when set", () => {
    process.env.T800_ONLY = "true";
    const { getT800Only } = require("@/lib/env");
    expect(getT800Only()).toBe(true);
  });

  it("getT800Only: returns false when not set", () => {
    delete process.env.T800_ONLY;
    const { getT800Only } = require("@/lib/env");
    expect(getT800Only()).toBe(false);
  });

  it("getKioskApiKey: returns value when set", () => {
    process.env.KIOSK_API_KEY = "kiosk-secret";
    const { getKioskApiKey } = require("@/lib/env");
    expect(getKioskApiKey()).toBe("kiosk-secret");
  });

  it("getKioskApiKey: returns undefined when not set", () => {
    delete process.env.KIOSK_API_KEY;
    const { getKioskApiKey } = require("@/lib/env");
    expect(getKioskApiKey()).toBeUndefined();
  });
});

