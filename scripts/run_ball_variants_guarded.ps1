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

$placeholderPatterns = @(
    'ornek-urun',
    'URL_BURAYA',
    'BURAYA_GERCEK_TRENDYOL_URUN_LINKI'
)

$hasPlaceholderUrl = $false
foreach ($pattern in $placeholderPatterns) {
    if ($url -match $pattern) {
        $hasPlaceholderUrl = $true
        break
    }
}

if ($hasPlaceholderUrl) {
    Write-Host "BALL_VARIANT_RUN_FAILED=PLACEHOLDER_URL"
    Write-Host "URL=$url"
    exit 1
}

$colors = @()
if ($item.metadata -and $item.metadata.expectedColors) {
    $colors = @($item.metadata.expectedColors)
}

if ($colors.Count -lt 2) {
    Write-Host "BALL_VARIANT_RUN_FAILED=EXPECTED_COLORS_MISSING_OR_INSUFFICIENT"
    exit 1
}

$placeholderColors = @(
    'RENK1',
    'RENK2',
    'BURAYA_1_RENK',
    'BURAYA_2_RENK'
)

$hasPlaceholderColor = $false
foreach ($color in $colors) {
    if ($placeholderColors -contains [string]$color) {
        $hasPlaceholderColor = $true
        break
    }
}

if ($hasPlaceholderColor) {
    Write-Host "BALL_VARIANT_RUN_FAILED=PLACEHOLDER_COLOR"
    Write-Host "COLORS=$($colors -join ',')"
    exit 1
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
