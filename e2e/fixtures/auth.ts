import type { Page } from "@playwright/test";
import { DEMO_ADMIN, ROUTES } from "./test-data";

/** Sign in via demo quick-login button (requires NEXT_PUBLIC_DEMO_MODE=true). */
export async function loginAsDemoAdmin(page: Page): Promise<void> {
  await page.goto(ROUTES.login);
  await page.getByTestId("demo-login-admin").click();
  await page.waitForURL(new RegExp(`/${DEMO_ADMIN.role}/dashboard`), { timeout: 30_000 });
}

/** Sign in via email/password form (demo or Supabase depending on env). */
export async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(ROUTES.login);
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL(/\/(admin|hr|finance|employee)\/dashboard/, { timeout: 45_000 });
}

export async function loginAsAdmin(page: Page): Promise<void> {
  const useDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.E2E_DEMO_MODE === "true";
  if (useDemo) {
    await loginAsDemoAdmin(page);
    return;
  }
  await loginWithCredentials(
    page,
    DEMO_ADMIN.email,
    process.env.E2E_ADMIN_PASSWORD ?? "Admin@2024",
  );
}
