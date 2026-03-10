$datasetPath = ".\datasets\trendyol_ball_variant_urls.json"

if (-not (Test-Path $datasetPath)) {
    Write-Host "BALL_VARIANT_DATASET_MISSING=$datasetPath"
    exit 0
}

$data = Get-Content $datasetPath -Raw | ConvertFrom-Json

if (-not $data -or @($data).Count -eq 0) {
    Write-Host "BALL_VARIANT_DATASET_EMPTY=TRUE"
    exit 0
}

$item = @($data)[0]

if (-not $item.url -or [string]::IsNullOrWhiteSpace($item.url)) {
    Write-Host "BALL_VARIANT_RUN_SKIPPED=NO_URL"
    exit 0
}

$url = [string]$item.url

if ($url -match 'ornek-urun') {
    Write-Host "BALL_VARIANT_RUN_SKIPPED=PLACEHOLDER_URL"
    Write-Host "URL=$url"
    exit 0
}

if ($url -notmatch '^https://www\.trendyol\.com/.+-p-\d+(\?.*)?$') {
    Write-Host "BALL_VARIANT_RUN_SKIPPED=INVALID_TRENDYOL_PDP_URL"
    Write-Host "URL=$url"
    exit 0
}

$wdOpen = $false
try {
    $tcp = Test-NetConnection -ComputerName "localhost" -Port 4444 -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) {
        $wdOpen = $true
    }
} catch {}

if (-not $wdOpen) {
    Write-Host "BALL_VARIANT_RUN_SKIPPED=WEBDRIVER_OFFLINE"
    Write-Host "WEBDRIVER=http://localhost:4444"
    exit 0
}

Write-Host "BALL_VARIANT_RUN_START=$url"
npx codeceptjs run tests/ball_color_variant_test.js --steps
exit $LASTEXITCODE
