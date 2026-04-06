param(
  [Parameter(Mandatory = $true)]
  [string]$Repo,

  [Parameter(Mandatory = $true)]
  [int]$ParentIssueNumber,

  [Parameter(Mandatory = $false)]
  [int]$Limit = 200
)

$ErrorActionPreference = 'Stop'

$raw = gh issue list --repo $Repo --state all --limit $Limit --json number,title,state,body,url
$issues = $raw | ConvertFrom-Json

$issueMap = @{}
foreach ($issue in $issues) {
  $issueMap[[int]$issue.number] = $issue
}

$parentRefPattern = '(?im)#' + [regex]::Escape([string]$ParentIssueNumber) + '\b|issues/' + [regex]::Escape([string]$ParentIssueNumber) + '\b'

$children = @()

foreach ($issue in $issues) {
  if ([int]$issue.number -eq $ParentIssueNumber) {
    continue
  }

  $body = [string]$issue.body
  $hasParentHeader = [regex]::IsMatch($body, '(?im)^##\s*Parent\s*PRD\s*$')
  $referencesParent = [regex]::IsMatch($body, $parentRefPattern)

  if (-not $hasParentHeader -or -not $referencesParent) {
    continue
  }

  $blockedByMatch = [regex]::Match($body, '(?is)##\s*Blocked\s*by\s*(?<content>.*?)(\r?\n##\s|\z)')
  $blockedByContent = $blockedByMatch.Groups['content'].Value

  $blockerNumbers = [regex]::Matches($blockedByContent, '#(\d+)') |
    ForEach-Object { [int]$_.Groups[1].Value } |
    Select-Object -Unique |
    Sort-Object

  $blockerStates = @()
  $isUnblocked = $true

  foreach ($blockerNumber in $blockerNumbers) {
    if (-not $issueMap.ContainsKey($blockerNumber)) {
      $blockerStates += [pscustomobject]@{
        number = $blockerNumber
        state = 'MISSING'
      }
      $isUnblocked = $false
      continue
    }

    $blockerIssue = $issueMap[$blockerNumber]
    $blockerStates += [pscustomobject]@{
      number = $blockerNumber
      state = $blockerIssue.state
    }

    if ([string]$blockerIssue.state -ne 'CLOSED') {
      $isUnblocked = $false
    }
  }

  $children += [pscustomobject]@{
    number = [int]$issue.number
    title = [string]$issue.title
    state = [string]$issue.state
    url = [string]$issue.url
    blockerNumbers = $blockerNumbers
    blockerStates = $blockerStates
    unblocked = $isUnblocked
  }
}

$openChildren = $children |
  Where-Object { $_.state -eq 'OPEN' } |
  Sort-Object number

$unblockedOpenChildren = $openChildren |
  Where-Object { $_.unblocked } |
  Sort-Object number

$next = $unblockedOpenChildren | Select-Object -First 1

$result = [pscustomobject]@{
  parentIssueNumber = $ParentIssueNumber
  openChildren = $openChildren
  unblockedOpenChildren = $unblockedOpenChildren
  next = $next
}

$result | ConvertTo-Json -Depth 8

if ($null -eq $next) {
  exit 2
}

exit 0
