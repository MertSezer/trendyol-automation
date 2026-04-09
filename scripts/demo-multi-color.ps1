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
  Remove-FilesByPattern ".\output" "single-product-multi-color-evidence.html"
  Remove-FilesByPattern ".\output" "single-product-multi-color-package.zip"

  if (Test-Path ".\output\logs\multi-color-run.log") {
    Remove-Item ".\output\logs\multi-color-run.log" -Force
  }

  Write-Host "Output ready." -ForegroundColor Green
}

function Test-Syntax {
  Write-Section "Syntax check"

  node -c .\pages\ProductPage.js
  if ($LASTEXITCODE -ne 0) { throw "Syntax failed: .\pages\ProductPage.js" }

  node -c .\tests\single_product_multi_color_test.js
  if ($LASTEXITCODE -ne 0) { throw "Syntax failed: .\tests\single_product_multi_color_test.js" }

  Write-Host "Syntax OK" -ForegroundColor Green
}

function Run-Test {
  Write-Section "Running single-product multi-color scenario"

  $env:TESTS = "./tests/single_product_multi_color_test.js"

  if (-not $env:MAX_COLORS) { $env:MAX_COLORS = "3" }
  if (-not $env:MIN_COLORS) { $env:MIN_COLORS = "2" }

  npx codeceptjs run --steps 2>&1 |
    Tee-Object -FilePath ".\output\logs\multi-color-run.log"

  $exitCode = $LASTEXITCODE

  Remove-Item Env:TESTS -ErrorAction SilentlyContinue
  Remove-Item Env:MAX_COLORS -ErrorAction SilentlyContinue
  Remove-Item Env:MIN_COLORS -ErrorAction SilentlyContinue

  if ($exitCode -ne 0) {
    throw "Single-product multi-color demo failed."
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
    Write-Host "  .\scripts\demo-multi-color.ps1 run"
    Write-Host "  .\scripts\demo-multi-color.ps1 open"
  }
}
