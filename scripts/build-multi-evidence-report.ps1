$ErrorActionPreference = "Stop"

$outputDir = Join-Path $PWD "output"
$reportPath = Join-Path $outputDir "multi-evidence.html"

$steps = @(
  @{ Id = "01"; Files = @("01_product_opened.png","01_added_to_cart.png","01_cart_after_add.png","01_product_opened.txt","01_added_to_cart.txt","01_cart_state.txt") },
  @{ Id = "02"; Files = @("02_product_opened.png","02_added_to_cart.png","02_cart_after_add.png","02_product_opened.txt","02_added_to_cart.txt","02_cart_state.txt") },
  @{ Id = "03"; Files = @("03_product_opened.png","03_added_to_cart.png","03_cart_after_add.png","03_product_opened.txt","03_added_to_cart.txt","03_cart_state.txt") },
  @{ Id = "04"; Files = @("04_product_opened.png","04_added_to_cart.png","04_cart_after_add.png","04_oldest_removed.png","04_product_opened.txt","04_added_to_cart.txt","04_oldest_removed.txt","04_cart_state.txt") }
)

function HtmlEncode([string]$Text) {
  if ($null -eq $Text) { return "" }
  return [System.Net.WebUtility]::HtmlEncode($Text)
}

function ReadText([string]$Path) {
  if (Test-Path $Path) { return Get-Content $Path -Raw }
  return "missing"
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("<!doctype html><html lang='tr'><head><meta charset='utf-8'><title>Multi Evidence</title>")
[void]$sb.AppendLine("<style>body{font-family:Arial;margin:24px;background:#f6f8fb} .card{background:#fff;border:1px solid #ddd;border-radius:10px;padding:16px;margin-bottom:24px} img{max-width:100%;border:1px solid #ccc;border-radius:8px;margin-bottom:12px} pre{background:#111827;color:#e5e7eb;padding:12px;border-radius:8px;white-space:pre-wrap}</style>")
[void]$sb.AppendLine("</head><body>")
[void]$sb.AppendLine("<h1>Multi Product FIFO Evidence</h1>")

foreach ($step in $steps) {
  [void]$sb.AppendLine("<div class='card'>")
  [void]$sb.AppendLine("<h2>Step $($step.Id)</h2>")

  foreach ($file in $step.Files) {
    $full = Join-Path $outputDir $file
    if (-not (Test-Path $full)) { continue }

    if ($file -like "*.png") {
      [void]$sb.AppendLine("<div><h3>$file</h3><img src='$file' alt='$file'></div>")
    }
    elseif ($file -like "*.txt") {
      $content = HtmlEncode (ReadText $full)
      [void]$sb.AppendLine("<div><h3>$file</h3><pre>$content</pre></div>")
    }
  }

  [void]$sb.AppendLine("</div>")
}

[void]$sb.AppendLine("</body></html>")

Set-Content -Path $reportPath -Value $sb.ToString() -Encoding UTF8
Start-Process $reportPath
Write-Host "Created: $reportPath" -ForegroundColor Green
