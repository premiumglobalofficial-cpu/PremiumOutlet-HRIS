import { test, expect } from "@playwright/test";

test.describe("API auth guards", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("should return 401 for appearance settings when unauthenticated", async ({ request }) => {
    const res = await request.get("/api/settings/appearance");
    expect(res.status()).toBe(401);
  });

  test("should return 401 for employee upsert when unauthenticated", async ({ request }) => {
    const res = await request.post("/api/employees", {
      data: {
        id: "E2E-UNAUTH",
        name: "E2E Test",
        email: "e2e-unauth@test.local",
        role: "employee",
        status: "active",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("should return 401 for reconcile-absences when unauthenticated", async ({ request }) => {
    const res = await request.post("/api/attendance/reconcile-absences", {
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test("should allow public kiosk admin-pin verify endpoint", async ({ request }) => {
    const res = await request.post("/api/kiosk/admin-pin/verify", {
      data: { pin: "0000" },
    });
    // 400 invalid format, 200/503 with valid shape — not 401
    expect(res.status()).not.toBe(401);
  });
});
