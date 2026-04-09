param(
  [string]$Action = "run"
)

$ErrorActionPreference = "Stop"

function Write-Section {
  param([string]$Text)
  Write-Host ""
  Write-Host "=== $Text ===" -ForegroundColor Cyan
}

function Ensure-Directory {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Remove-FilesByPattern {
  param(
    [string]$Folder,
    [string]$Pattern
  )
  if (Test-Path $Folder) {
    Get-ChildItem $Folder -Filter $Pattern -File -ErrorAction SilentlyContinue |
      Remove-Item -Force -ErrorAction SilentlyContinue
  }
}

function Prepare-Output {
  Write-Section "Preparing output"

  Ensure-Directory ".\output"
  Ensure-Directory ".\output\logs"

  Remove-FilesByPattern ".\output" "*.png"
  Remove-FilesByPattern ".\output" "*.txt"
  Remove-FilesByPattern ".\output" "fifo-evidence.html"
  Remove-FilesByPattern ".\output" "fifo-evidence-package.zip"

  if (Test-Path ".\output\logs\fifo-evidence-run.log") {
    Remove-Item ".\output\logs\fifo-evidence-run.log" -Force
  }

  Write-Host "Output ready." -ForegroundColor Green
}

function Test-Syntax {
  Write-Section "Syntax check"

  node -c .\tests\multi_product_fifo_evidence_test.js
  if ($LASTEXITCODE -ne 0) {
    throw "Syntax failed: .\tests\multi_product_fifo_evidence_test.js"
  }

  Write-Host "Syntax OK" -ForegroundColor Green
}

function Run-Test {
  Write-Section "Running FIFO evidence scenario"

  $env:TESTS = "./tests/multi_product_fifo_evidence_test.js"
  $env:CART_LIMIT = "3"

  npx codeceptjs run --steps 2>&1 |
    Tee-Object -FilePath ".\output\logs\fifo-evidence-run.log"

  $exitCode = $LASTEXITCODE

  Remove-Item Env:TESTS -ErrorAction SilentlyContinue
  Remove-Item Env:CART_LIMIT -ErrorAction SilentlyContinue

  if ($exitCode -ne 0) {
    throw "FIFO evidence scenario failed."
  }

  Write-Host "Scenario completed successfully." -ForegroundColor Green
}

function Show-Artifacts {
  Write-Section "Artifacts"

  Get-ChildItem ".\output" -File |
    Sort-Object Name |
    ForEach-Object { Write-Host "  $($_.FullName)" }

  Write-Host ""
  Write-Host "Logs:" -ForegroundColor Yellow
  Get-ChildItem ".\output\logs" -File -ErrorAction SilentlyContinue |
    ForEach-Object { Write-Host "  $($_.FullName)" }
}

switch ($Action) {
  "run" {
    Prepare-Output
    Test-Syntax
    Run-Test
    Show-Artifacts
  }
  "open" {
    if (Test-Path ".\output") { ii ".\output" }
    if (Test-Path ".\output\logs") { ii ".\output\logs" }
  }
  default {
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\scripts\demo-fifo-evidence.ps1 run"
    Write-Host "  .\scripts\demo-fifo-evidence.ps1 open"
  }
}
