$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=== Trendyol Automation: Local Verify ==="

# 1) Ensure products.txt exists
if (!(Test-Path ".\products.txt") -and (Test-Path ".\products.example.txt")) {
  Copy-Item ".\products.example.txt" ".\products.txt"
  Write-Host "Created products.txt from products.example.txt"
}

# 2) Clean output
if (Test-Path ".\output") {
  Remove-Item ".\output" -Recurse -Force
}
New-Item -ItemType Directory -Force ".\output" | Out-Null
Write-Host "Output cleaned."

# 3) Run test (filter benign BiDi noise)
$cmd = "npx codeceptjs run tests/e2e/multi_url_add_remove_test.js --config .\codecept.ci.conf.js --steps --verbose"
Write-Host "`nRunning: $cmd`n"

Invoke-Expression $cmd 2>&1 |
  Where-Object {
    $_ -notmatch "No connection to WebDriver Bidi was established" -and
    $_ -notmatch "Error \(Non-Terminated\).*WebDriver Bidi"
  }

if ($LASTEXITCODE -ne 0) {
  throw "Test run failed with exit code $LASTEXITCODE"
}

# 4) Verify artifacts exist
$summaryPath = ".\output\summary.json"
$mdPath = ".\output\summary.md"

if (!(Test-Path $summaryPath)) { throw "Missing $summaryPath" }
if (!(Test-Path $mdPath)) { throw "Missing $mdPath" }

$summary = Get-Content $summaryPath -Raw | ConvertFrom-Json

# 5) Validate extended fields
if (-not $summary.runs)   { throw "summary.json missing runs[]" }
if (-not $summary.totals) { throw "summary.json missing totals{}" }

Write-Host "`n=== SUMMARY CHECK ==="
Write-Host ("Runs: " + $summary.runs.Count)
Write-Host ("Totals.count: " + $summary.totals.count)
Write-Host ("Totals.totalMs: " + $summary.totals.totalMs)

# 6) Screenshots (at least product shot should exist for first URL)
$shots = Get-ChildItem ".\output" -Filter "*_product.png" -ErrorAction SilentlyContinue
Write-Host ("Product screenshots: " + ($shots | Measure-Object).Count)

Write-Host "`n✅ Local verify OK"
