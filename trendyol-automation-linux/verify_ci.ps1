$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repo = "MertSezer/trendyol-automation"
$artifactName = "output"
$scan = 30

Write-Host "=== Trendyol Automation: CI Verify (download-probe, resilient) ==="

$ids = gh run list --repo $repo --limit $scan --json databaseId -q ".[].databaseId"
if (-not $ids) { throw "No runs found" }

$target = $null
$dest = $null

foreach ($id in $ids) {
  $tryDest = ".\_ci_artifacts\output_$id"
  Remove-Item -Recurse -Force $tryDest -ErrorAction SilentlyContinue

  $text = ""
  try {
    # Run download, capture BOTH streams
    $out = & gh run download $id --repo $repo -n $artifactName -D $tryDest 2>&1
    $text = ($out | Out-String)
  } catch {
    # gh throws on "no valid artifacts" in some versions; continue scanning
    $text = (($_ | Out-String) + "`n")
  }

  # If download did not produce summary.json, move on
  if (!(Test-Path (Join-Path $tryDest "summary.json"))) {
    continue
  }

  $target = $id
  $dest = $tryDest
  break
}

if (-not $target) {
  throw "No run with artifact '$artifactName' found in last $scan runs."
}

Write-Host "Using run id: $target"
Write-Host "Downloaded artifact to: $dest"

$summaryPath = Join-Path $dest "summary.json"
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
