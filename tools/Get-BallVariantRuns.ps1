param(
  [string]$Workflow = "ball-variants-e2e",
  [string]$Branch = "feat/ci-and-reporting",
  [int]$Limit = 5
)

gh run list --branch $Branch --workflow $Workflow --limit $Limit