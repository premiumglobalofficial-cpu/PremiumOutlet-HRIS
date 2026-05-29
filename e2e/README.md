# E2E Testing (Playwright)

Automated tests follow the project [testing rules](../testing-rules%20(3).md): behavior-focused names, AAA structure, critical journeys only at this layer.

## Quick start

```bash
# Install browser (first time)
npm run test:e2e:install

# Run full E2E suite (starts dev server unless one is already on :3000)
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# View last HTML report
npm run test:e2e:report
```

## Requirements

- Node 18+
- `.env.local` with `NEXT_PUBLIC_DEMO_MODE=true` for default demo-login flows (recommended for local E2E)
- Optional: `PLAYWRIGHT_BASE_URL` to hit Vercel instead of localhost
- Optional: `PLAYWRIGHT_SKIP_WEBSERVER=1` when `npm run dev` is already running

## Suite layout

| Path | Layer | Purpose |
|------|--------|---------|
| `e2e/auth.setup.ts` | Setup | Saves admin session to `e2e/.auth/admin.json` |
| `e2e/smoke/login.spec.ts` | E2E | Login form + demo admin journey |
| `e2e/smoke/navigation.spec.ts` | E2E | Dashboard, employees, attendance, payroll |
| `e2e/smoke/kiosk.spec.ts` | E2E | Public kiosk route |
| `e2e/api/auth-api.spec.ts` | API | 401 guards without session |
| `e2e/api/authenticated-api.spec.ts` | API | Appearance + reconcile with session |

Unit/integration coverage remains in Jest (`npm test`).

## Playwright MCP (Cursor)

The repo includes `.cursor/mcp.json` for the official [@playwright/mcp](https://playwright.dev/docs/getting-started-mcp) server. After pulling:

1. **Cursor → Settings → MCP** — confirm `playwright` server is listed and connected.
2. Reload the window if tools do not appear.
3. Ask the agent to navigate, snapshot, or debug pages using MCP browser tools.

## Database note

Some API routes use the Supabase **service role** (`SUPABASE_SERVICE_ROLE_KEY`). If reconcile or employee writes return `permission denied for table employees`, grant access in Supabase SQL or confirm the service role key matches your project dashboard.

## CI

Set `CI=true`, ensure demo mode or seeded Supabase credentials, and run:

```bash
npm run test:e2e:install
npm run test:e2e
```
