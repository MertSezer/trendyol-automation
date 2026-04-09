$ErrorActionPreference = "Stop"

$outputDir = Join-Path $PWD "output"
$reportPath = Join-Path $outputDir "single-product-multi-color-evidence.html"

function HtmlEncode([string]$Text) {
  if ($null -eq $Text) { return "" }
  return [System.Net.WebUtility]::HtmlEncode($Text)
}

function ReadText([string]$Path) {
  if (Test-Path $Path) { return Get-Content $Path -Raw }
  return "missing"
}

$files = Get-ChildItem $outputDir -File |
  Where-Object { $_.Extension -in ".png", ".txt" } |
  Sort-Object Name

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("<!doctype html><html lang='tr'><head><meta charset='utf-8'><title>Single Product Multi Color Evidence</title>")
[void]$sb.AppendLine("<style>body{font-family:Arial;margin:24px;background:#f6f8fb}.card{background:#fff;border:1px solid #ddd;border-radius:10px;padding:16px;margin-bottom:24px}img{max-width:100%;border:1px solid #ccc;border-radius:8px;margin-bottom:12px}pre{background:#111827;color:#e5e7eb;padding:12px;border-radius:8px;white-space:pre-wrap}</style>")
[void]$sb.AppendLine("</head><body>")
[void]$sb.AppendLine("<h1>Single Product Multi Color Evidence</h1>")

foreach ($file in $files) {
  [void]$sb.AppendLine("<div class='card'>")
  [void]$sb.AppendLine("<h2>$($file.Name)</h2>")

  if ($file.Extension -eq ".png") {
    [void]$sb.AppendLine("<img src='$($file.Name)' alt='$($file.Name)'>")
  }
  elseif ($file.Extension -eq ".txt") {
    $content = HtmlEncode (ReadText $file.FullName)
    [void]$sb.AppendLine("<pre>$content</pre>")
  }

  [void]$sb.AppendLine("</div>")
}

[void]$sb.AppendLine("</body></html>")

Set-Content -Path $reportPath -Value $sb.ToString() -Encoding UTF8
Start-Process $reportPath
Write-Host "Created: $reportPath" -ForegroundColor Green
