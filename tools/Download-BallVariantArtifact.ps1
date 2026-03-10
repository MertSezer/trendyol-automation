param(
  [Parameter(Mandatory=$true)][string]$RunId,
  [string]$ArtifactName = "ball-variant-output",
  [string]$TargetDir = ".\artifacts\ball-variant-download"
)

gh run download $RunId -n $ArtifactName -D $TargetDir

if (Test-Path "$TargetDir\summary.md") {
  Get-Content "$TargetDir\summary.md" -Encoding UTF8
} else {
  Write-Host "SUMMARY_NOT_FOUND=$TargetDir\summary.md"
}