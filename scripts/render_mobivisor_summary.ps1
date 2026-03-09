param(
  [string]$InputJson = ".\output\mobivisor_run.json",
  [string]$OutputMd  = ".\output\mobivisor_summary.md"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $InputJson)) {
  Write-Error "Input JSON not found: $InputJson"
  exit 1
}

$raw = Get-Content $InputJson -Raw -Encoding UTF8
if ($raw.Length -gt 0 -and $raw[0] -eq [char]0xFEFF) {
  $raw = $raw.Substring(1)
}

$data = $raw | ConvertFrom-Json

$golden = $data.flows.golden
$intermittent = $data.flows.intermittent
$artifacts = @($data.artifacts)

$selectedUrl = "-"
$selectedTitle = "-"
if ($null -ne $intermittent.selected) {
  if ($intermittent.selected.url) { $selectedUrl = $intermittent.selected.url }
  if ($intermittent.selected.title) { $selectedTitle = $intermittent.selected.title }
}

$diagnostics = @()
if ($null -ne $intermittent.diagnostics) {
  $diagnostics = @($intermittent.diagnostics)
}

$skipDiagnostics = @($diagnostics | Where-Object { $_.skipReason })
$selectedDiagnostics = @($diagnostics | Where-Object { $_.selected -eq $true })
$artifactExisting = @($artifacts | Where-Object { $_.exists -eq $true })

$artifactLines = @()
foreach ($a in $artifacts) {
  $artifactLines += "- $($a.path) | exists=$($a.exists) | size=$($a.size)"
}

$skipLines = @()
foreach ($d in $skipDiagnostics) {
  $skipLines += "- idx=$($d.idx) | reason=$($d.skipReason) | url=$($d.probeUrl)"
}

if ($skipLines.Count -eq 0) {
  $skipLines += "- none"
}

$selectedDiagLines = @()
foreach ($d in $selectedDiagnostics) {
  $selectedDiagLines += "- idx=$($d.idx) | pageKind=$($d.pageKind) | addVerified=$($d.addVerified) | cartReached=$($d.cartReached) | removeVerified=$($d.removeVerified)"
}

if ($selectedDiagLines.Count -eq 0) {
  $selectedDiagLines += "- none"
}

$decisionText = switch ($data.overallStatus) {
  "healthy"  { "Pipeline healthy. Golden flow passed and intermittent flow ended in an allowed state." }
  "degraded" { "Pipeline degraded. Golden flow passed but intermittent flow did not end in the preferred state." }
  "failed"   { "Pipeline failed. Golden flow and/or intermittent flow is outside the allowed quality gate." }
  default    { "Pipeline status could not be interpreted." }
}

$md = @"
# Mobivisor Run Summary

## Executive Summary
- Overall Status: $($data.overallStatus)
- Decision: $decisionText
- Golden Status: $($golden.status)
- Intermittent Status: $($intermittent.status)
- Artifacts Present: $($artifactExisting.Count)/$($artifacts.Count)

## Overall
- Project: $($data.project)
- Schema: $($data.schemaVersion)
- Generated At: $($data.generatedAt)

## Environment
- CWD: $($data.environment.cwd)
- Node: $($data.environment.node)
- NPM: $($data.environment.npm)
- Docker Server: $($data.environment.dockerServer)
- OS: $($data.environment.os)
- Machine: $($data.environment.machine)

## Golden Flow
- Status: $($golden.status)
- Dataset: $($golden.dataset)
- Started: $($golden.startedAt)
- Finished: $($golden.finishedAt)
- URLs: $($golden.totals.urls)
- Opened: $($golden.totals.opened)
- OK: $($golden.totals.ok)
- Skipped: $($golden.totals.skipped)
- Add OK: $($golden.totals.addOk)
- Cart Open OK: $($golden.totals.cartOpenOk)
- Remove OK: $($golden.totals.removeOk)
- Flow OK: $($golden.totals.flowOk)

## Intermittent Flow
- Status: $($intermittent.status)
- Dataset: $($intermittent.dataset)
- Started: $($intermittent.startedAt)
- Finished: $($intermittent.finishedAt)
- URLs: $($intermittent.totals.urls)
- Selected: $($intermittent.totals.selected)
- Skipped: $($intermittent.totals.skipped)
- Add OK: $($intermittent.totals.addOk)
- Cart Open OK: $($intermittent.totals.cartOpenOk)
- Remove OK: $($intermittent.totals.removeOk)
- Flow OK: $($intermittent.totals.flowOk)

## Intermittent Selected Candidate
- URL: $selectedUrl
- Title: $selectedTitle
- Diagnostics Count: $($diagnostics.Count)

## Intermittent Selected Diagnostics
$($selectedDiagLines -join "`r`n")

## Intermittent Skip Reasons
$($skipLines -join "`r`n")

## Interpretation
- Golden flow is expected to pass end-to-end.
- Intermittent flow is expected to pass or skip depending on candidate quality and final page type.
- Current result is healthy when golden=passed and intermittent=passed or skipped.

## Artifacts
$($artifactLines -join "`r`n")
"@

Set-Content -Path $OutputMd -Value $md -Encoding UTF8
Write-Host "WROTE=$OutputMd"



