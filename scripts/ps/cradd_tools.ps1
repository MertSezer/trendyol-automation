Set-StrictMode -Version Latest

# Default regex patterns (global, so they exist in the session after dot-sourcing)
$global:re   = 'this\._crAdd\("url:skip",[\s\S]*?\)\s*;'
$global:reOk = 'this\._crAdd\("url:ok",[\s\S]*?\)\s*;'

function Assert-VarNotEmpty([string]$Name) {
  $v = Get-Variable -Name $Name -Scope Global -ErrorAction SilentlyContinue
  if (-not $v -or [string]::IsNullOrWhiteSpace([string]$v.Value)) {
    throw "`$$Name is empty/null. Did you dot-source scripts/ps/cradd_tools.ps1 ?"
  }
}

function Get-JsCall {
  param(
    [Parameter(Mandatory)] [string] $Path,
    [Parameter(Mandatory)] [string] $Needle,
    [string] $OutFile
  )

  $txt = Get-Content $Path -Raw
  $i = 0
  $n = 0
  $out = New-Object System.Collections.Generic.List[string]

  while (($i = $txt.IndexOf($Needle, $i)) -ge 0) {
    $j = $txt.IndexOf('(', $i)
    if ($j -lt 0) { break }

    $depth = 0
    $k = $j
    for (; $k -lt $txt.Length; $k++) {
      $ch = $txt[$k]
      if ($ch -eq '(') { $depth++ }
      elseif ($ch -eq ')') { $depth--; if ($depth -eq 0) { break } }
    }

    $call = $txt.Substring($i, ($k - $i + 1))
    $n++
    $out.Add("`n--- MATCH #$n ---`n$call`n") | Out-Null
    $i = $k + 1
  }

  if ($OutFile) { $out -join "" | Set-Content -Encoding UTF8 $OutFile }
  $out -join ""
}

function Dump-CrAddCalls {
  param([string]$Path = ".\src\flows\TopColorsAddRemoveFlow.js")
  Get-JsCall -Path $Path -Needle 'this._crAdd("url:skip"' -OutFile .\output\cradd_skip_calls.txt | Out-Null
  Get-JsCall -Path $Path -Needle 'this._crAdd("url:ok"'   -OutFile .\output\cradd_ok_calls.txt   | Out-Null
  "Wrote output\cradd_skip_calls.txt and output\cradd_ok_calls.txt"
}
