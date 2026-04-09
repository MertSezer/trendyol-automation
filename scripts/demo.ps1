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

function Remove-IfExists {
  param([string]$Path)
  if (Test-Path $Path) {
    Remove-Item $Path -Recurse -Force
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

function Test-NodeSyntax {
  Write-Section "Node syntax check"
  node -c .\pages\ProductPage.js
  if ($LASTEXITCODE -ne 0) {
    throw "Syntax check failed: .\pages\ProductPage.js"
  }

  node -c .\tests\colors_add_remove_test.js
  if ($LASTEXITCODE -ne 0) {
    throw "Syntax check failed: .\tests\colors_add_remove_test.js"
  }

  Write-Host "Syntax OK" -ForegroundColor Green
}

function Prepare-DemoOutput {
  Write-Section "Preparing output folders"

  Ensure-Directory ".\output"
  Ensure-Directory ".\output\logs"

  $patterns = @(
    "01_*.png","01_*.txt",
    "02_*.png","02_*.txt",
    "03_*.png","03_*.txt",
    "04_*.png","04_*.txt",
    "05_*.png","05_*.txt",
    "06_*.png","06_*.txt",
    "07_*.png","07_*.txt"
  )

  foreach ($pattern in $patterns) {
    Remove-FilesByPattern ".\output" $pattern
  }

  if (Test-Path ".\output\logs\codecept-run.log") {
    Remove-Item ".\output\logs\codecept-run.log" -Force
  }

  if (Test-Path ".\output\logs\demo-run.log") {
    Remove-Item ".\output\logs\demo-run.log" -Force
  }

  Write-Host "Output folders ready." -ForegroundColor Green
}

function Get-DemoArtifacts {
  $patterns = @(
    "01_*.png","01_*.txt",
    "02_*.png","02_*.txt",
    "03_*.png","03_*.txt",
    "04_*.png","04_*.txt",
    "05_*.png","05_*.txt",
    "06_*.png","06_*.txt",
    "07_*.png","07_*.txt"
  )

  $files = @()
  foreach ($pattern in $patterns) {
    $files += Get-ChildItem ".\output" -Filter $pattern -File -ErrorAction SilentlyContinue
  }

  $files | Sort-Object Name
}

function Run-DemoTest {
  Write-Section "Running working demo scenario"

  $env:TESTS = "./tests/colors_add_remove_test.js"

  npx codeceptjs run --steps 2>&1 |
    Tee-Object -FilePath ".\output\logs\codecept-run.log"

  $exitCode = $LASTEXITCODE
  Remove-Item Env:TESTS -ErrorAction SilentlyContinue

  if ($exitCode -ne 0) {
    throw "Demo test failed."
  }

  "Demo run completed at $(Get-Date -Format s)" | Out-File ".\output\logs\demo-run.log" -Encoding utf8
  Write-Host "Demo test completed successfully." -ForegroundColor Green
}

function Assert-DemoProducedArtifacts {
  Write-Section "Validating demo artifacts"

  $demoFiles = Get-DemoArtifacts
  if (-not $demoFiles -or $demoFiles.Count -eq 0) {
    throw "No demo artifacts found in .\output"
  }

  Write-Host "Demo artifacts created: $($demoFiles.Count)" -ForegroundColor Green
}

function Show-DemoArtifacts {
  Write-Section "Artifacts"

  Write-Host "Demo artifacts:" -ForegroundColor Yellow
  Get-DemoArtifacts | ForEach-Object {
    Write-Host "  $($_.FullName)"
  }

  Write-Host ""
  Write-Host "Logs:" -ForegroundColor Yellow
  Get-ChildItem ".\output\logs" -File -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  $($_.FullName)"
  }
}

function Open-OutputFolders {
  if (Test-Path ".\output") {
    ii ".\output"
  }
  if (Test-Path ".\output\logs") {
    ii ".\output\logs"
  }
}

function Show-Usage {
  Write-Host "Available commands:" -ForegroundColor Yellow
  Write-Host "  .\scripts\demo.ps1 run"
  Write-Host "  .\scripts\demo.ps1 open"
  Write-Host "  .\scripts\demo.ps1 clean"
}

switch ($Action) {
  "run" {
    Prepare-DemoOutput
    Test-NodeSyntax
    Run-DemoTest
    Assert-DemoProducedArtifacts
    Show-DemoArtifacts
  }
  "open" {
    Open-OutputFolders
  }
  "clean" {
    Write-Section "Cleaning output"
    Remove-IfExists ".\output"
    Write-Host "Output removed." -ForegroundColor Green
  }
  default {
    Show-Usage
  }
}
