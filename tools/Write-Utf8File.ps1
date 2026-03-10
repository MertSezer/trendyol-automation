param(
  [Parameter(Mandatory=$true)][string]$Path,
  [Parameter(Mandatory=$true)][string]$Content
)

$fullPath = Resolve-Path . | ForEach-Object { Join-Path $_ $Path }
$dir = Split-Path $fullPath -Parent

if (-not (Test-Path $dir)) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

[System.IO.File]::WriteAllText(
  $fullPath,
  $Content,
  [System.Text.UTF8Encoding]::new($false)
)

Write-Host "WRITTEN=$fullPath"