param(
  [Parameter(Mandatory = $false)]
  [string]$Repo = "MertSezer/trendyol-automation",

  [Parameter(Mandatory = $false)]
  [long]$RunId = 0,

  [Parameter(Mandatory = $false)]
  [switch]$Clean,

  [Parameter(Mandatory = $false)]
  [switch]$Timestamp
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-LatestRunId([string]$repo) {
  [long](gh run list --repo $repo --limit 1 --json databaseId -q ".[0].databaseId")
}

function Get-RunStatus([string]$repo, [long]$runId) {
  $json = gh run view $runId --repo $repo --json status,conclusion
  $obj = $json | ConvertFrom-Json
  return $obj
}

if ($RunId -eq 0) {
  $RunId = Get-LatestRunId $Repo
}

$st = Get-RunStatus $Repo $RunId
Write-Host ("Run status: {0} / {1}" -f $st.status, $st.conclusion)

if ($st.status -ne "completed") {
  Write-Host "Run is not completed yet; skipping download."
  exit 2
}

$base = Join-Path (Get-Location) "_ci_artifacts"

if ($Timestamp) {
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $dir = Join-Path $base ("run_{0}_{1}" -f $RunId, $stamp)
} else {
  $dir = Join-Path $base ("run_{0}" -f $RunId)
}

if ($Clean -and (Test-Path $dir)) {
  Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Force $dir | Out-Null

Write-Host "Downloading artifacts..."
Write-Host "Repo:  $Repo"
Write-Host "RunId: $RunId"
Write-Host "Dir:   $dir"

gh run download $RunId --repo $Repo --dir $dir

$sum = Join-Path $dir "output\summary.md"
if (Test-Path $sum) {
  Write-Host ""
  Write-Host "--- output/summary.md ---"
  Write-Host ""
  Get-Content $sum
} else {
  Write-Host ("WARN: summary.md not found at {0}" -f $sum)
}
