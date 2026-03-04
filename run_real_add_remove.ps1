Set-Location "C:\Users\merts\Desktop\trendyol-automation"

# ensure output
New-Item -ItemType Directory -Force -Path .\output | Out-Null
New-Item -ItemType Directory -Force -Path .\output\runs | Out-Null

# run
Remove-Item .\output\* -Exclude "chromedriver.log","runs" -ErrorAction SilentlyContinue

npx codeceptjs run tests/real_add_remove_test.js --config .\codecept.conf.js --steps --verbose 2>&1 |
  Tee-Object -FilePath .\output\last_run.log

# archive
$stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$dest = Join-Path .\output\runs $stamp
New-Item -ItemType Directory -Force -Path $dest | Out-Null

Get-ChildItem .\output -File |
  Where-Object { $_.Name -ne "chromedriver.log" } |
  Move-Item -Destination $dest -Force

"== ARTIFACTS =="
Get-ChildItem $dest | Sort-Object LastWriteTime | Select-Object Name,Length,LastWriteTime | Format-Table -Auto
"Saved to: $dest"
