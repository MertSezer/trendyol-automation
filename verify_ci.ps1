$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repo = "MertSezer/trendyol-automation"
$artifactName = "output"
$scan = 20

Write-Host "=== Trendyol Automation: CI Verify (artifact-aware) ==="

# Get last N runs
$runs = gh run list --repo $repo --limit $scan --json databaseId,displayTitle,createdAt -q ".[] | @json" |
  ForEach-Object { $_ | ConvertFrom-Json }

if (-not $runs -or $runs.Count -eq 0) { throw "No runs found" }

$target = $null
foreach ($r in $runs) {
  $id = $r.databaseId
  $j = gh run view $id --repo $repo --json artifacts -q ".artifacts[].name" 2>$null
  if ($LASTEXITCODE -ne 0) { continue }

  $names = @()
  if ($j) { $names = $j -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ } }

  if ($names -contains $artifactName) {
    $target = $id
    break
  }
}

if (-not $target) {
  throw "No run with artifact '$artifactName' found in last $scan runs."
}

Write-Host "Using run id: $target (has artifact '$artifactName')"

$dest = ".\_ci_artifacts\output_$target"
Remove-Item -Recurse -Force $dest -ErrorAction SilentlyContinue

gh run download $target --repo $repo -n $artifactName -D $dest | Out-Null
Write-Host "Downloaded artifact to: $dest"

$summaryPath = Join-Path $dest "summary.json"
if (!(Test-Path $summaryPath)) { throw "Missing $summaryPath" }

$summary = Get-Content $summaryPath -Raw | ConvertFrom-Json

if (-not $summary.finishedAt) { throw "summary.json missing finishedAt" }
if (-not $summary.runs) { throw "summary.json missing runs[]" }
if (-not $summary.totals) { throw "summary.json missing totals{}" }

Write-Host "`n=== CI SUMMARY CHECK ==="
Write-Host ("Runs: " + $summary.runs.Count)
Write-Host ("Totals.count: " + $summary.totals.count)
Write-Host ("Totals.totalMs: " + $summary.totals.totalMs)
Write-Host ("FinishedAt: " + $summary.finishedAt)

Write-Host "`nOK: CI verify passed"
