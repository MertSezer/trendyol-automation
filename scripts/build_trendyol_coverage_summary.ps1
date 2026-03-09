$datasetPath = ".\datasets\trendyol_coverage_urls.json"
$outputPath = ".\output\trendyol_coverage_summary.md"

if (-not (Test-Path $datasetPath)) {
    Write-Error "DATASET_NOT_FOUND=$datasetPath"
    exit 1
}

New-Item -ItemType Directory -Force .\output | Out-Null

$items = Get-Content $datasetPath -Raw | ConvertFrom-Json

$total = @($items).Count
$categoryGroups = $items | Group-Object category | Sort-Object Name
$brandGroups = $items | Group-Object brand | Sort-Object Name
$generatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")

$lines = @()
$lines += "# Trendyol Coverage Summary"
$lines += ""
$lines += "## Dataset"
$lines += "- Source: $datasetPath"
$lines += "- Generated At: $generatedAt"
$lines += "- Total URLs: $total"
$lines += ""
$lines += "## Category Breakdown"

foreach ($g in $categoryGroups) {
    $lines += "- $($g.Name): $($g.Count)"
}

$lines += ""
$lines += "## Brand Breakdown"

foreach ($g in $brandGroups) {
    $lines += "- $($g.Name): $($g.Count)"
}

$lines += ""
$lines += "## Notes"
$lines += "- This summary describes dataset coverage only."
$lines += "- It does not yet include execution outcomes."

$lines | Set-Content $outputPath -Encoding UTF8

Write-Host "WROTE=$outputPath"
Write-Host "TOTAL_URLS=$total"
