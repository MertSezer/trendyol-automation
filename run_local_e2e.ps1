$ErrorActionPreference = "Stop"

# Ensure UTF-8 output so Turkish chars and Codecept symbols render correctly
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"

$cmd = "npx codeceptjs run tests/e2e/multi_url_add_remove_test.js --config .\codecept.ci.conf.js --steps --verbose"
Write-Host "Running: $cmd`n"

# Run in the SAME shell and filter only the known BiDi noise lines
Invoke-Expression $cmd 2>&1 |
  Where-Object {
    $_ -notmatch "No connection to WebDriver Bidi was established" -and
    $_ -notmatch "Error \(Non-Terminated\).*WebDriver Bidi"
  }

exit $LASTEXITCODE
