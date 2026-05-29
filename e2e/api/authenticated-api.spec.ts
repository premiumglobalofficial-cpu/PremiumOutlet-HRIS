import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const authFile = path.join(__dirname, "..", ".auth", "admin.json");

test.describe("API with admin session cookie", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(authFile)) {
      throw new Error("Missing e2e/.auth/admin.json — run `npm run test:e2e` (setup project) first");
    }
  });

  test.use({ storageState: authFile });

  test("should return 200 for appearance module flags when authenticated", async ({ request }) => {
    const res = await request.get("/api/settings/appearance");
    expect(res.status()).not.toBe(401);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("modules");
  });

  test("should pass auth gate for reconcile-absences when admin session is present", async ({ request }) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const start = new Date();
    start.setDate(start.getDate() - 7);

    const res = await request.post("/api/attendance/reconcile-absences", {
      data: {
        startDate: start.toISOString().split("T")[0],
        endDate: yesterday.toISOString().split("T")[0],
      },
    });
    // Auth must succeed (demo cookie or Supabase JWT). DB may return 500 if service_role lacks grants.
    expect(res.status()).not.toBe(401);
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(typeof body.created).toBe("number");
    }
  });
});
