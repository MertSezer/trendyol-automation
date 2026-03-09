param(
  [string]$GoldenJson = ".\output\case_report.multi.json",
  [string]$IntermittentJson = ".\output\probe_then_run_report.json",
  [string]$OutputJson = ".\output\mobivisor_run.json"
)

$ErrorActionPreference = "Stop"

function Read-JsonFile {
  param([string]$Path)

  $raw = Get-Content $Path -Raw -Encoding UTF8
  if ($raw.Length -gt 0 -and $raw[0] -eq [char]0xFEFF) {
    $raw = $raw.Substring(1)
  }
  return ($raw | ConvertFrom-Json)
}

function Normalize-FlowStatus {
  param($Flow)

  if ($null -eq $Flow) { return "failed" }

  $status = [string]$Flow.status
  switch ($status.ToLowerInvariant()) {
    "passed"  { return "passed" }
    "skipped" { return "skipped" }
    "failed"  { return "failed" }
    default {
      $flowOk = 0
      try { $flowOk = [int]$Flow.totals.flowOk } catch {}
      if ($flowOk -ge 1) { return "passed" }
      return "failed"
    }
  }
}

function Get-ArtifactInfo {
  param([string]$Path)

  if (Test-Path $Path) {
    $item = Get-Item $Path
    return [pscustomobject]@{
      path = $Path
      exists = $true
      size = [int64]$item.Length
    }
  }

  return [pscustomobject]@{
    path = $Path
    exists = $false
    size = 0
  }
}

$golden = Read-JsonFile $GoldenJson
$intermittent = Read-JsonFile $IntermittentJson

$goldenStatus = Normalize-FlowStatus $golden
$intermittentStatus = Normalize-FlowStatus $intermittent

if ($goldenStatus -eq "passed" -and ($intermittentStatus -eq "passed" -or $intermittentStatus -eq "skipped")) {
  $overallStatus = "healthy"
} elseif ($goldenStatus -eq "passed") {
  $overallStatus = "degraded"
} else {
  $overallStatus = "failed"
}

$artifacts = @(
  (Get-ArtifactInfo ".\output\case_report.multi.json"),
  (Get-ArtifactInfo ".\output\probe_then_run_report.json"),
  (Get-ArtifactInfo ".\\output\\mobivisor_summary.md"),
  (Get-ArtifactInfo ".\output\pdp_1.png"),
  (Get-ArtifactInfo ".\output\cart_1.png"),
  (Get-ArtifactInfo ".\output\after_remove_1.png"),
  (Get-ArtifactInfo ".\output\probe_then_run_pdp.png"),
  (Get-ArtifactInfo ".\output\probe_then_run_cart.png"),
  (Get-ArtifactInfo ".\output\probe_then_run_after_remove.png")
)

$data = [ordered]@{
  project = "trendyol-automation"
  schemaVersion = "1.0.0"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  overallStatus = $overallStatus
  environment = [ordered]@{
    cwd = (Get-Location).Path
    node = "unknown"
    npm = "unknown"
    dockerServer = "unknown"
    os = [System.Runtime.InteropServices.RuntimeInformation]::OSDescription
    machine = $env:COMPUTERNAME
  }
  flows = [ordered]@{
    golden = [ordered]@{
      status = $goldenStatus
      dataset = $golden.dataset
      startedAt = $golden.startedAt
      finishedAt = $golden.finishedAt
      totals = $golden.totals
    }
    intermittent = [ordered]@{
      status = $intermittentStatus
      dataset = $intermittent.dataset
      startedAt = $intermittent.startedAt
      finishedAt = $intermittent.finishedAt
      totals = $intermittent.totals
      selected = $intermittent.selected
      diagnostics = $intermittent.diagnostics
    }
  }
  artifacts = $artifacts
}

$json = $data | ConvertTo-Json -Depth 20
Set-Content -Path $OutputJson -Value $json -Encoding UTF8
Write-Host "WROTE=$OutputJson"



