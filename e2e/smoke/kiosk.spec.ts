import { test, expect } from "@playwright/test";
import { ROUTES } from "../fixtures/test-data";

test.describe("Kiosk (public)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should load kiosk landing without authentication", async ({ page }) => {
    await page.goto(ROUTES.kiosk, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/kiosk/, { timeout: 30_000 });
    await expect(page.getByTestId("kiosk-landing")).toBeVisible({ timeout: 30_000 });
  });
});
