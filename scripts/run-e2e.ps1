# Premium Outlets HRIS — E2E test runner (Windows)
# Usage: .\scripts\run-e2e.ps1 [-Ui] [-SkipInstall]

param(
    [switch]$Ui,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not $SkipInstall) {
    Write-Host "Installing Playwright Chromium..."
    npx playwright install chromium
}

if ($Ui) {
    npm run test:e2e:ui
} else {
    npm run test:e2e
}

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "E2E suite finished. Open report: npm run test:e2e:report"
