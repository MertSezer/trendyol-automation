Set-Location "C:\Users\merts\Desktop\trendyol-automation"

New-Item -ItemType Directory -Force -Path .\output | Out-Null
New-Item -ItemType Directory -Force -Path .\output\runs | Out-Null

function Resolve-NpxCmd {
  $cmd = Get-Command "npx.cmd" -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source -and (Test-Path -LiteralPath $cmd.Source)) { return $cmd.Source }

  $p1 = Join-Path $env:APPDATA "npm\npx.cmd"
  if (Test-Path -LiteralPath $p1) { return $p1 }

  $p2 = Join-Path $env:ProgramFiles "nodejs\npx.cmd"
  if (Test-Path -LiteralPath $p2) { return $p2 }

  return $null
}

function Get-UrlsCount {
  $productsPath = Join-Path (Get-Location) "products.txt"
  if (!(Test-Path $productsPath)) { return 0 }
  $urls = Get-Content $productsPath | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith("#") }
  return $urls.Count
}

function Clean-OutputFolder {
  Get-ChildItem .\output -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne "chromedriver.log" -and $_.Name -ne "runs" } |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}

function Run-One($name, $testPath, $destRoot) {
  Write-Host "`n===== RUN: $name ====="
  Clean-OutputFolder

  $outLog = Join-Path (Get-Location) "output\last_run.out.log"
  $errLog = Join-Path (Get-Location) "output\last_run.err.log"
  $allLog = Join-Path (Get-Location) "output\last_run.log"

  foreach ($fp in @($outLog,$errLog,$allLog)) {
    if ($fp -and (Test-Path -LiteralPath $fp)) { Remove-Item -LiteralPath $fp -Force -ErrorAction SilentlyContinue }
  }

  New-Item -ItemType File -Force -Path $outLog | Out-Null
  New-Item -ItemType File -Force -Path $errLog | Out-Null
  New-Item -ItemType File -Force -Path $allLog | Out-Null

  $npxCmd = Resolve-NpxCmd
  $npxShown = $npxCmd
  if (-not $npxShown) { $npxShown = "(NOT FOUND)" }

  Add-Content $allLog "=== DEBUG ==="
  Add-Content $allLog ("PSVersion: " + $PSVersionTable.PSVersion)
  Add-Content $allLog ("PWD: " + (Get-Location))
  Add-Content $allLog ("Test: " + $testPath)
  Add-Content $allLog ("Resolved npx.cmd: " + $npxShown)

  if (-not $npxCmd) {
    Add-Content $allLog "ERROR: npx.cmd not found."
    Write-Host "ExitCode: -10  DurationSec: 0  FailedByLog: True"
    Write-Host "---- last_run.log (tail 200) ----"
    Get-Content $allLog -Tail 200
    return @{ folder=""; exit_code=-10; duration_sec=0; failed_by_log=$true }
  }

  $args = @("codeceptjs","run",$testPath,"--config",".\codecept.conf.js","--steps","--verbose")
  Add-Content $allLog ("ARGS: " + ($args -join " "))

  $timeoutSec = 900   # 15 dakika
  $start = Get-Date
  $exitCode = -1
  $timedOut = $false

  try {
    $proc = Start-Process -FilePath $npxCmd -ArgumentList $args -WorkingDirectory (Get-Location) -NoNewWindow -PassThru `
      -RedirectStandardOutput $outLog -RedirectStandardError $errLog

    $lastPrint = Get-Date
    while (-not $proc.HasExited) {
      $elapsed = (Get-Date) - $start
      if ($elapsed.TotalSeconds -ge $timeoutSec) {
        $timedOut = $true
        break
      }

      # Her 10 sn’de bir stderr tail göster
      if (((Get-Date) - $lastPrint).TotalSeconds -ge 10) {
        $lastPrint = Get-Date
        Write-Host ("...running " + [math]::Round($elapsed.TotalSeconds) + "s | tail err.log:")
        if (Test-Path -LiteralPath $errLog) { Get-Content $errLog -Tail 12 -ErrorAction SilentlyContinue }
      }

      Start-Sleep -Seconds 2
    }

    if ($timedOut) {
      Add-Content $allLog ("TIMEOUT after " + $timeoutSec + " seconds. Killing process tree.")
      try { taskkill /F /T /PID $proc.Id | Out-Null } catch {}
      $exitCode = -20
    } else {
      $exitCode = [int]$proc.ExitCode
    }
  } catch {
    Add-Content $allLog ("Start-Process failed: " + $_.Exception.Message)
    $exitCode = -2
  }

  $durationSec = [math]::Round(((Get-Date) - $start).TotalSeconds, 1)

  Add-Content $allLog ""
  Add-Content $allLog "=== STDOUT (out.log) ==="
  Get-Content $outLog -ErrorAction SilentlyContinue | Add-Content $allLog
  Add-Content $allLog ""
  Add-Content $allLog "=== STDERR (err.log) ==="
  Get-Content $errLog -ErrorAction SilentlyContinue | Add-Content $allLog

  $failedByLog = $false
  if (Test-Path -LiteralPath $allLog) {
    $failedByLog = (Select-String -Path $allLog -Pattern "FAILED| FAIL |Error:|npm ERR|ENOENT" -Quiet)
  }

  Write-Host ("ExitCode: " + $exitCode + "  DurationSec: " + $durationSec + "  FailedByLog: " + $failedByLog)
  Write-Host "---- last_run.log (tail 120) ----"
  Get-Content $allLog -Tail 120

  $dest = Join-Path $destRoot $name
  New-Item -ItemType Directory -Force -Path $dest | Out-Null

  Get-ChildItem .\output -ErrorAction SilentlyContinue |
    Where-Object { -not $_.PSIsContainer -and $_.Name -ne "chromedriver.log" } |
    Move-Item -Destination $dest -Force -ErrorAction SilentlyContinue

  return @{ folder=$dest; exit_code=$exitCode; duration_sec=$durationSec; failed_by_log=$failedByLog }
}

function Summarize-Folder($name, $folder) {
  if (-not $folder) { return @{ total_files = 0; checkout_screens = 0; add_to_cart_not_found = 0; failed = 0 } }
  if ([string]::IsNullOrWhiteSpace([string]$folder)) { return @{ total_files = 0; checkout_screens = 0; add_to_cart_not_found = 0; failed = 0 } }
  if (!(Test-Path -LiteralPath $folder)) { return @{ total_files = 0; checkout_screens = 0; add_to_cart_not_found = 0; failed = 0 } }

  $files = Get-ChildItem -LiteralPath $folder -ErrorAction SilentlyContinue | Where-Object { -not $_.PSIsContainer }
  $checkout = ($files | Where-Object { $_.Name -eq "03_checkout_page.png" -or $_.Name -like "03_checkout__*.png" }).Count
  $addMiss  = ($files | Where-Object { $_.Name -like "add_to_cart_not_found_*.png" -or $_.Name -like "SKIP_add_to_cart_not_found__*.png" }).Count
  $fails    = ($files | Where-Object { $_.Name -like "*.failed.png" -or $_.Name -like "FAIL__*.png" }).Count

  return @{ total_files = $files.Count; checkout_screens = $checkout; add_to_cart_not_found = $addMiss; failed = $fails }
}

$stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$destRoot = Join-Path .\output\runs $stamp
New-Item -ItemType Directory -Force -Path $destRoot | Out-Null

$urlsCount = Get-UrlsCount
$multiRun = Run-One "multi_url" "tests\multi_url_add_remove_test.js" $destRoot
$varRun   = Run-One "variants"  "tests\variants_add_remove_test.js"  $destRoot

"`n===== SUMMARY ====="
"products.txt URLs: $urlsCount"

$multiStats = Summarize-Folder "multi_url" $multiRun.folder
$varStats   = Summarize-Folder "variants"  $varRun.folder

$summaryObj = [ordered]@{
  timestamp = $stamp
  products_count = $urlsCount
  multi_url = [ordered]@{ run = $multiRun; stats = $multiStats }
  variants  = [ordered]@{ run = $varRun; stats = $varStats }
  saved_to = $destRoot
}

$summaryPath = Join-Path $destRoot "summary.json"
$summaryObj | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $summaryPath
"Summary JSON saved to: $summaryPath"
"ALL SAVED TO: $destRoot"
