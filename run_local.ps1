$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (-not $env:TESTS) { $env:TESTS = "tests/e2e/multi_url_add_remove_test.js" }

$cmd = "npx codeceptjs run $env:TESTS --config .\codecept.ci.conf.js --steps --verbose"
Write-Host "Running: $cmd`n"

Invoke-Expression $cmd 2>&1 |
  Where-Object {
    $_ -notmatch "No connection to WebDriver Bidi was established" -and
    $_ -notmatch "Error \(Non-Terminated\).*WebDriver Bidi"
  }

exit $LASTEXITCODE
