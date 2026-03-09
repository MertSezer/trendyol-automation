$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (-not $env:BROWSER) { $env:BROWSER = "chrome" }
if (-not $env:DATASET) { $env:DATASET = "datasets/all_candidates.txt" }
if (-not $env:TESTS) { $env:TESTS = "tests/e2e/probe_then_run_test.js" }

Write-Host "BROWSER=$env:BROWSER"
Write-Host "DATASET=$env:DATASET"
Write-Host "TESTS=$env:TESTS"

$cmd = "npx codeceptjs run $env:TESTS --config .\codecept.ci.conf.js --steps --verbose"
Write-Host "Running: $cmd`n"

Invoke-Expression $cmd 2>&1 |
  Where-Object {
    $_ -notmatch "No connection to WebDriver Bidi was established" -and
    $_ -notmatch "Error \(Non-Terminated\).*WebDriver Bidi"
  }

exit $LASTEXITCODE
