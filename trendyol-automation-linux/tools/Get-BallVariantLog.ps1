param(
  [Parameter(Mandatory=$true)][string]$RunId
)

$patterns = @(
  "BALL_VARIANT_RUN_START",
  "BALL_VARIANT_RUN_FAILED",
  "BALL_VARIANT_RUN_SKIPPED",
  "SELECT_COLOR",
  "VERIFY_SELECTED",
  "COLOR_CANDIDATES",
  "SELECT_COLOR_TOP_CANDIDATES",
  "COLOR_VARIANT_NOT_FOUND",
  "ADD_TO_CART_BUTTON_NOT_FOUND"
)

gh run view $RunId --log | Select-String -Pattern ($patterns -join "|")