$ErrorActionPreference = "Stop"

$outputDir = Join-Path $PWD "output"
$reportPath = Join-Path $outputDir "evidence.html"

if (-not (Test-Path $outputDir)) {
  throw "output klasörü bulunamadı."
}

$steps = @(
  @{ Id = "01"; Title = "Product Opened";      Png = "01_product_opened.png";     Txt = "01_product_opened.txt" },
  @{ Id = "02"; Title = "Prepared";            Png = "02_prepared.png";           Txt = "02_prepared.txt" },
  @{ Id = "03"; Title = "Colors Discovered";   Png = "03_colors_discovered.png";  Txt = "03_colors_discovered.txt" },
  @{ Id = "04"; Title = "Color Selected";      Png = "04_color_selected.png";     Txt = "04_color_selected.txt" },
  @{ Id = "05"; Title = "Added To Cart";       Png = "05_added_to_cart.png";      Txt = "05_added_to_cart.txt" },
  @{ Id = "06"; Title = "Cart Verified";       Png = "06_cart_verified.png";      Txt = "06_cart_verified.txt" },
  @{ Id = "07"; Title = "Cart Emptied";        Png = "07_cart_emptied.png";       Txt = "07_cart_emptied.txt" }
)

function Read-TextFile {
  param([string]$Path)
  if (Test-Path $Path) {
    return (Get-Content $Path -Raw)
  }
  return "missing"
}

function HtmlEncode {
  param([string]$Text)
  if ($null -eq $Text) { return "" }
  return [System.Net.WebUtility]::HtmlEncode($Text)
}

$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$body = New-Object System.Text.StringBuilder

[void]$body.AppendLine("<!doctype html>")
[void]$body.AppendLine("<html lang='tr'>")
[void]$body.AppendLine("<head>")
[void]$body.AppendLine("  <meta charset='utf-8' />")
[void]$body.AppendLine("  <meta name='viewport' content='width=device-width, initial-scale=1' />")
[void]$body.AppendLine("  <title>Automation Evidence Report</title>")
[void]$body.AppendLine("  <style>")
[void]$body.AppendLine("    body { font-family: Arial, sans-serif; margin: 24px; background: #f6f8fb; color: #1a1a1a; }")
[void]$body.AppendLine("    h1, h2 { margin-bottom: 8px; }")
[void]$body.AppendLine("    .meta { background: #fff; border: 1px solid #ddd; padding: 16px; border-radius: 10px; margin-bottom: 24px; }")
[void]$body.AppendLine("    .step { background: #fff; border: 1px solid #ddd; border-radius: 10px; padding: 16px; margin-bottom: 24px; }")
[void]$body.AppendLine("    .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }")
[void]$body.AppendLine("    img { max-width: 100%; border: 1px solid #ccc; border-radius: 8px; }")
[void]$body.AppendLine("    pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; white-space: pre-wrap; word-break: break-word; }")
[void]$body.AppendLine("    .ok { color: #0a7f2e; font-weight: bold; }")
[void]$body.AppendLine("    .missing { color: #b42318; font-weight: bold; }")
[void]$body.AppendLine("    a { color: #0b57d0; text-decoration: none; }")
[void]$body.AppendLine("  </style>")
[void]$body.AppendLine("</head>")
[void]$body.AppendLine("<body>")

[void]$body.AppendLine("<h1>Automation Evidence Report</h1>")
[void]$body.AppendLine("<div class='meta'>")
[void]$body.AppendLine("  <div><strong>Generated:</strong> $(HtmlEncode $generatedAt)</div>")
[void]$body.AppendLine("  <div><strong>Status:</strong> <span class='ok'>7-step screenshot evidence present</span></div>")
[void]$body.AppendLine("  <div><strong>Logs:</strong> <a href='logs/codecept-run.log' target='_blank'>codecept-run.log</a> | <a href='logs/demo-run.log' target='_blank'>demo-run.log</a></div>")
[void]$body.AppendLine("</div>")

foreach ($step in $steps) {
  $pngPath = Join-Path $outputDir $step.Png
  $txtPath = Join-Path $outputDir $step.Txt

  $txtContent = Read-TextFile $txtPath
  $txtEncoded = HtmlEncode $txtContent

  $pngExists = Test-Path $pngPath
  $txtExists = Test-Path $txtPath

  [void]$body.AppendLine("<div class='step'>")
  [void]$body.AppendLine("  <h2>$($step.Id) - $(HtmlEncode $step.Title)</h2>")
  [void]$body.AppendLine("  <div><strong>PNG:</strong> " + ($(if ($pngExists) { "<span class='ok'>$($step.Png)</span>" } else { "<span class='missing'>missing</span>" } )) + "</div>")
  [void]$body.AppendLine("  <div><strong>TXT:</strong> " + ($(if ($txtExists) { "<span class='ok'>$($step.Txt)</span>" } else { "<span class='missing'>missing</span>" } )) + "</div>")
  [void]$body.AppendLine("  <div class='grid'>")
  if ($pngExists) {
    [void]$body.AppendLine("    <div><img src='$($step.Png)' alt='$($step.Png)' /></div>")
  }
  [void]$body.AppendLine("    <div><pre>$txtEncoded</pre></div>")
  [void]$body.AppendLine("  </div>")
  [void]$body.AppendLine("</div>")
}

[void]$body.AppendLine("</body>")
[void]$body.AppendLine("</html>")

Set-Content -Path $reportPath -Value $body.ToString() -Encoding UTF8

Write-Host ""
Write-Host "Evidence report created:" -ForegroundColor Green
Write-Host "  $reportPath" -ForegroundColor Yellow

Start-Process $reportPath
