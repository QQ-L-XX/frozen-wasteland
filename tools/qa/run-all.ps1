$ErrorActionPreference = "Stop"

Write-Host "== TypeScript check =="
& (Join-Path $PSScriptRoot "run-tsc.ps1")

Write-Host ""
Write-Host "== P0 smoke test =="
& (Join-Path $PSScriptRoot "run-p0-smoke.ps1")

Write-Host ""
Write-Host "All release QA checks passed."
