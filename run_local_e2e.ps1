$ErrorActionPreference = "Stop"

$cmd = "npx codeceptjs run tests/e2e/multi_url_add_remove_test.js --config .\codecept.ci.conf.js --steps --verbose"
Write-Host "Running: $cmd`n"

# Run and filter only the known BiDi noise lines
& powershell -NoProfile -Command $cmd 2>&1 |
  Where-Object {
    $_ -notmatch "No connection to WebDriver Bidi was established" -and
    $_ -notmatch "Error \(Non-Terminated\).*WebDriver Bidi"
  }

exit $LASTEXITCODE
