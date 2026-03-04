Set-Location -LiteralPath $PSScriptRoot

# UTF-8 output (PowerShell-native)
$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8

$env:RUN_MODE = 'e2e'
$env:TESTS = 'tests/e2e/multi_url_add_remove_test.js'
$env:BROWSER = 'chrome'
$env:SELENIUM_HOST = 'localhost'
$env:SELENIUM_PORT = '4444'
$env:SELENIUM_PATH = $null

cmd /c "npx codeceptjs run --config .\codecept.conf.js --steps --verbose"

