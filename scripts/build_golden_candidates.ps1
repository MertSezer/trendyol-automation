$datasetPath = ".\datasets\trendyol_coverage_urls.json"
$outputPath = ".\datasets\golden_candidates.txt"

if (-not (Test-Path $datasetPath)) {
    Write-Error "DATASET_NOT_FOUND=$datasetPath"
    exit 1
}

$items = Get-Content $datasetPath -Raw | ConvertFrom-Json
$golden = @($items | Where-Object { $_.classification -eq "golden_safe" })

if ($golden.Count -eq 0) {
    Write-Error "NO_GOLDEN_SAFE_URLS_FOUND"
    exit 1
}

$golden.url | Set-Content $outputPath -Encoding UTF8

Write-Host "WROTE=$outputPath"
Write-Host "GOLDEN_COUNT=$($golden.Count)"
