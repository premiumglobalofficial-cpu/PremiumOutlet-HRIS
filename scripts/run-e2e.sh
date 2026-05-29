#!/usr/bin/env bash
# Premium Outlets HRIS — E2E test runner (Unix)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "${SKIP_INSTALL:-}" != "1" ]]; then
  echo "Installing Playwright Chromium..."
  npx playwright install chromium
fi

if [[ "${1:-}" == "--ui" ]]; then
  npm run test:e2e:ui
else
  npm run test:e2e
fi

echo "E2E suite finished. Open report: npm run test:e2e:report"
