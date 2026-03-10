git add .
git commit -m "Demo-ready update" 2>$null
git push

Write-Host "=== RUNS ==="
gh run list --branch feat/ci-and-reporting --workflow "ball-variants-e2e" --limit 3