$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repo = "MertSezer/trendyol-automation"

Write-Host "=== Trendyol Automation: CI Verify ==="

$rid = gh run list --repo $repo --limit 1 --json databaseId -q ".[0].databaseId"
if (-not $rid) { throw "Could not get latest run id" }
Write-Host "Latest run id: $rid"

$dest = ".\_ci_artifacts\output_$rid"
Remove-Item -Recurse -Force $dest -ErrorAction SilentlyContinue

gh run download $rid --repo $repo -n output -D $dest | Out-Null
Write-Host "Downloaded artifact to: $dest"

$summaryPath = Join-Path $dest "summary.json"
if (!(Test-Path $summaryPath)) { throw "Missing $summaryPath" }

$summary = Get-Content $summaryPath -Raw | ConvertFrom-Json

if (-not $summary.finishedAt) { throw "summary.json missing finishedAt" }
if (-not $summary.runs) { throw "summary.json missing runs[]" }
if (-not $summary.totals) { throw "summary.json missing totals{}" }

Write-Host "`n=== CI SUMMARY CHECK ==="
Write-Host ("Runs: " + $summary.runs.Count)
Write-Host ("Totals.count: " + $summary.totals.count)
Write-Host ("Totals.totalMs: " + $summary.totals.totalMs)
Write-Host ("FinishedAt: " + $summary.finishedAt)

Write-Host "`nOK: CI verify passed"
