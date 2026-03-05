param(
  [Parameter(Mandatory=$false)]
  [string]$Repo = "MertSezer/trendyol-automation",

  [Parameter(Mandatory=$false)]
  [int]$RunId = 0,

  [Parameter(Mandatory=$false)]
  [switch]$Clean,

  [Parameter(Mandatory=$false)]
  [switch]$Timestamp
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-LatestRunId([string]$repo) {
  return gh run list --repo $repo --limit 1 --json databaseId -q ".[0].databaseId"
}

if ($RunId -eq 0) {
  $RunId = [int](Get-LatestRunId $Repo)
}

$base = Join-Path (Get-Location) "_ci_artifacts"

if ($Timestamp) {
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $dir = Join-Path $base ("run_{0}_{1}" -f $RunId, $stamp)
} else {
  $dir = Join-Path $base ("run_{0}" -f $RunId)
}

New-Item -ItemType Directory -Force $dir | Out-Null

if ($Clean -and (Test-Path $dir)) {
  Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force $dir | Out-Null
}

Write-Host "Downloading artifacts..."
Write-Host "Repo:  $Repo"
Write-Host "RunId: $RunId"
Write-Host "Dir:   $dir"
gh run download $RunId --repo $Repo --dir $dir

$sum = Join-Path $dir "output\summary.md"
if (Test-Path $sum) {
  Write-Host "`n--- output/summary.md ---`n"
  Get-Content $sum
} else {
  Write-Host "WARN: summary.md not found at $sum"
}
