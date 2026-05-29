import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";
import { loginAsDemoAdmin } from "./fixtures/auth";

const authFile = path.join(__dirname, ".auth", "admin.json");

setup("should persist admin session for dependent tests", async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await loginAsDemoAdmin(page);
  await page.context().storageState({ path: authFile });
});
