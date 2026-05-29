import { test, expect } from "@playwright/test";
import { ROUTES } from "../fixtures/test-data";

test.describe("Authenticated admin navigation", () => {
  test("should load admin dashboard after session restore", async ({ page }) => {
    await page.goto(ROUTES.adminDashboard);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("should open employees manage page without redirecting to login", async ({ page }) => {
    await page.goto(ROUTES.adminEmployees);
    await expect(page).toHaveURL(/\/admin\/employees\/manage/);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("should open attendance page without redirecting to login", async ({ page }) => {
    await page.goto(ROUTES.adminAttendance);
    await expect(page).toHaveURL(/\/admin\/attendance/);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("should open payroll page without redirecting to login", async ({ page }) => {
    await page.goto(ROUTES.adminPayroll);
    await expect(page).toHaveURL(/\/admin\/payroll/);
    await expect(page.getByRole("main")).toBeVisible();
  });
});
