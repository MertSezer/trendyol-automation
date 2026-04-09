param(
  [string]$Action,
  [string]$Name
)

function Backup-File {
  param([string]$Path)
  Copy-Item $Path "$Path.bak" -Force
}

function Replace-InFile {
  param(
    [string]$Path,
    [string]$Pattern,
    [string]$Replacement
  )

  $content = Get-Content $Path -Raw
  $newContent = [regex]::Replace($content, $Pattern, $Replacement)

  if ($newContent -eq $content) {
    Write-Host "No match found in $Path" -ForegroundColor Yellow
    return $false
  }

  Set-Content $Path $newContent -Encoding UTF8
  Write-Host "Patched: $Path" -ForegroundColor Green
  return $true
}

function Test-ProductPage {
  node -c .\pages\ProductPage.js
  if ($LASTEXITCODE -ne 0) { return }

  npx codeceptjs run .\tests\colors_add_remove_test.js --steps
}

function Patch-RemoveColorDomFallback {
  $path = ".\pages\ProductPage.js"
  Backup-File $path

  $changed = Replace-InFile `
    $path `
    '(?s)\n\s*// 2\) Visible candidate elements - strict.*?\n\s*return out\.slice\(0, limit\);' `
    "`n      return out.slice(0, limit);"

  Select-String -Path $path -Pattern 'Visible candidate elements|addColor\(cn, "dom"\)' | Out-Host

  node -c $path
  if ($LASTEXITCODE -ne 0) { return }

  if (-not $changed) {
    Write-Host "Patch skipped, test not run." -ForegroundColor Yellow
    return
  }

  Test-ProductPage
}

function Restore-ProductPageBackup {
  $path = ".\pages\ProductPage.js"
  $bak = ".\pages\ProductPage.js.bak"

  if (-not (Test-Path $bak)) {
    Write-Host "Backup not found: $bak" -ForegroundColor Yellow
    return
  }

  Copy-Item $bak $path -Force
  Write-Host "Restored from backup." -ForegroundColor Green

  node -c $path
}

function Show-PatchList {
  Write-Host "Available patches:" -ForegroundColor Yellow
  Write-Host "  remove-color-dom-fallback"
  Write-Host ""
  Write-Host "Available restore targets:" -ForegroundColor Yellow
  Write-Host "  productpage"
}

function Invoke-ProjectPatch {
  param(
    [string]$Action,
    [string]$Name
  )

  switch ($Action) {
    "list" {
      Show-PatchList
    }

    "apply" {
      switch ($Name) {
        "remove-color-dom-fallback" { Patch-RemoveColorDomFallback }
        default {
          Write-Host "Unknown patch: $Name" -ForegroundColor Red
          Show-PatchList
        }
      }
    }

    "restore" {
      switch ($Name) {
        "productpage" { Restore-ProductPageBackup }
        default {
          Write-Host "Unknown restore target: $Name" -ForegroundColor Red
          Show-PatchList
        }
      }
    }

    "remove-color-dom-fallback" {
      Patch-RemoveColorDomFallback
    }

    "restore-productpage" {
      Restore-ProductPageBackup
    }

    default {
      Show-PatchList
    }
  }
}

if ($MyInvocation.InvocationName -ne '.') {
  Invoke-ProjectPatch -Action $Action -Name $Name
}
