param(
  [Parameter(Mandatory=$true)][string]$RunId
)

gh run view $RunId --json databaseId,headSha,headBranch,displayTitle,status,conclusion,url