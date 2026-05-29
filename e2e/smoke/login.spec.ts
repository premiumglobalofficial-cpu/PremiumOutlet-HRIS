import { test, expect } from "@playwright/test";
import { DEMO_ADMIN, ROUTES } from "../fixtures/test-data";

test.describe("Login page", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should render login form when visiting /login", async ({ page }) => {
    await page.goto(ROUTES.login);
    await expect(page.getByTestId("login-form")).toBeVisible();
    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();
  });

  test("should redirect to admin dashboard when demo admin quick-login is used", async ({ page }) => {
    test.skip(
      process.env.NEXT_PUBLIC_DEMO_MODE !== "true" && process.env.E2E_DEMO_MODE !== "true",
      "Demo quick-login requires NEXT_PUBLIC_DEMO_MODE=true",
    );

    await page.goto(ROUTES.login);
    await page.getByTestId("demo-login-admin").click();
    await expect(page).toHaveURL(new RegExp(`/${DEMO_ADMIN.role}/dashboard`), { timeout: 60_000 });
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("should sign in with credentials when demo mode is enabled", async ({ page }) => {
    test.skip(
      process.env.NEXT_PUBLIC_DEMO_MODE !== "true" && process.env.E2E_DEMO_MODE !== "true",
      "Credential demo login requires NEXT_PUBLIC_DEMO_MODE=true",
    );

    await page.goto(ROUTES.login);
    await page.getByTestId("login-email").fill(DEMO_ADMIN.email);
    await page.getByTestId("login-password").fill(DEMO_ADMIN.password);
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(new RegExp(`/${DEMO_ADMIN.role}/dashboard`), { timeout: 60_000 });
  });
});
