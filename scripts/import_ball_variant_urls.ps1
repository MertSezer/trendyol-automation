param(
  [Parameter(Mandatory = $true)]
  [string[]]$Urls,

  [string]$Color1 = "Kirmizi",
  [string]$Color2 = "Mavi",
  [string]$OutputPath = ".\datasets\trendyol_ball_variant_urls.json"
)

$result = @()
$index = 1

foreach ($url in $Urls) {
    if ([string]::IsNullOrWhiteSpace($url)) {
        continue
    }

    $result += [pscustomobject]@{
        id = ("ball_variant_{0:d3}" -f $index)
        platform = "trendyol"
        category = "ball"
        classification = "multi_color_variant"
        url = $url.Trim()
        metadata = [pscustomobject]@{
            variantType = "color"
            expectedColors = @($Color1, $Color2)
        }
    }

    $index++
}

$json = $result | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText((Resolve-Path ".").Path + "\" + ($OutputPath -replace '^\.\[\\/]', ''), $json, [System.Text.UTF8Encoding]::new($false))

Write-Host "WROTE=$OutputPath"
Write-Host "ITEM_COUNT=$(@($result).Count)"
