param(
  [Parameter(Mandatory = $true)]
  [string]$Repo,

  [Parameter(Mandatory = $true)]
  [int]$Issue,

  [Parameter(Mandatory = $true)]
  [string]$SourceBodyFile,

  [string]$VerifyUncheckedPattern,

  [switch]$KeepTempFile
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-CommandAvailable {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Assert-FileExists {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "File not found: $Path"
  }
}

Assert-CommandAvailable -Name 'gh'
Assert-FileExists -Path $SourceBodyFile

$raw = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $SourceBodyFile), [System.Text.Encoding]::UTF8)
$lines = @($raw -split "`r?`n")

if ($lines.Count -eq 0) {
  throw 'Body file is empty.'
}

$sourceHeadingCount = @($lines | Where-Object { $_ -match '^## ' }).Count
$sourceChecklistCount = @($lines | Where-Object { $_ -match '^- \[( |x)\] ' }).Count

# Normalize trailing whitespace while preserving intentional blank lines.
$normalizedLines = @(foreach ($line in $lines) {
  $line.TrimEnd()
})

$content = [string]::Join("`n", $normalizedLines)

$tmp = Join-Path $PWD (".tmp-issue-{0}-body-work.md" -f $Issue)
[System.IO.File]::WriteAllText($tmp, $content, [System.Text.UTF8Encoding]::new($false))

try {
  gh issue edit $Issue --repo $Repo --body-file $tmp | Out-Null

  $verify = gh api ("repos/{0}/issues/{1}" -f $Repo, $Issue) --jq '.body'
  $verifyLines = @($verify -split "`r?`n")

  $headingCount = @($verifyLines | Where-Object { $_ -match '^## ' }).Count
  $checklistCount = @($verifyLines | Where-Object { $_ -match '^- \[( |x)\] ' }).Count

  if ($sourceHeadingCount -gt 0 -and $headingCount -lt 1) {
    throw 'Verification failed: source contained markdown headings, but none were found after update.'
  }

  if ($sourceChecklistCount -gt 0 -and $checklistCount -lt 1) {
    throw 'Verification failed: source contained checklist lines, but none were found after update.'
  }

  if ($VerifyUncheckedPattern) {
    $unchecked = @($verifyLines | Where-Object { $_ -match '^- \[ \] ' }).Count
    if ($unchecked -gt 0 -and $verify -notmatch $VerifyUncheckedPattern) {
      throw "Verification failed: unchecked items remain but expected pattern '$VerifyUncheckedPattern' was not found."
    }
  }

  Write-Output ("Updated issue #{0} in {1}" -f $Issue, $Repo)
  Write-Output ("HEADINGS={0}" -f $headingCount)
  Write-Output ("CHECKLIST_LINES={0}" -f $checklistCount)
}
finally {
  if (-not $KeepTempFile) {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }
}
