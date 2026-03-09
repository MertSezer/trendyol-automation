param(
  [string]$RunJson = ".\output\mobivisor_run.json",
  [string]$SummaryMd = ".\output\mobivisor_summary.md"
)

$ErrorActionPreference = "Stop"

function Read-JsonFile {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    throw "JSON file not found: $Path"
  }

  $raw = Get-Content $Path -Raw -Encoding UTF8
  if ($raw.Length -gt 0 -and $raw[0] -eq [char]0xFEFF) {
    $raw = $raw.Substring(1)
  }

  return ($raw | ConvertFrom-Json)
}

function Show-Line($label, $value) {
  Write-Host ("{0,-22}: {1}" -f $label, $value)
}

$data = Read-JsonFile $RunJson

$golden = $data.flows.golden
$intermittent = $data.flows.intermittent
$artifacts = @($data.artifacts)
$artifactsOk = @($artifacts | Where-Object { $_.exists -eq $true }).Count
$artifactsTotal = $artifacts.Count

Write-Host ""
Write-Host "=== MOBIVISOR STATUS ==="
Write-Host ""

Show-Line "Overall Status" $data.overallStatus
Show-Line "Generated At" $data.generatedAt
Show-Line "Golden Status" $golden.status
Show-Line "Intermittent Status" $intermittent.status
Show-Line "Artifacts" "$artifactsOk/$artifactsTotal"

if ($null -ne $intermittent.selected) {
  Show-Line "Selected URL" $intermittent.selected.url
  Show-Line "Selected Title" $intermittent.selected.title
}

Write-Host ""
Write-Host "--- Artifact Check ---"

foreach ($a in $artifacts) {
  $mark = if ($a.exists) { "OK" } else { "MISSING" }
  Write-Host ("[{0}] {1}" -f $mark, $a.path)
}

if (Test-Path $SummaryMd) {
  Write-Host ""
  Write-Host "--- Summary File ---"
  Write-Host $SummaryMd
} else {
  Write-Host ""
  Write-Host "--- Summary File ---"
  Write-Host "Missing: $SummaryMd"
}

Write-Host ""
