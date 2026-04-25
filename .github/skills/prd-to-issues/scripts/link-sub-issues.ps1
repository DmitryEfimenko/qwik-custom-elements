param(
  [Parameter(Mandatory = $true)]
  [string]$Owner,

  [Parameter(Mandatory = $true)]
  [string]$Repo,

  [Parameter(Mandatory = $true)]
  [int]$ParentIssueNumber,

  [Parameter(Mandatory = $true)]
  [int[]]$ChildIssueNumbers,

  [switch]$Strict
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-IssueNodeId {
  param(
    [Parameter(Mandatory = $true)]
    [int]$IssueNumber
  )

  $query = "query(`$owner:String!,`$repo:String!,`$num:Int!){ repository(owner:`$owner,name:`$repo){ issue(number:`$num){ id number title } } }"
  $result = gh api graphql -f query=$query -f owner=$Owner -f repo=$Repo -F num=$IssueNumber | ConvertFrom-Json

  if ($null -eq $result.data.repository.issue.id) {
    throw "Failed to resolve node ID for issue #$IssueNumber in $Owner/$Repo."
  }

  return $result.data.repository.issue.id
}

$parentId = Get-IssueNodeId -IssueNumber $ParentIssueNumber

foreach ($childIssueNumber in $ChildIssueNumbers) {
  try {
    $childId = Get-IssueNodeId -IssueNumber $childIssueNumber

    $mutation = "mutation(`$issueId:ID!,`$subIssueId:ID!){ addSubIssue(input:{issueId:`$issueId, subIssueId:`$subIssueId}){ issue { number } subIssue { number } } }"
    gh api graphql -f query=$mutation -f issueId=$parentId -f subIssueId=$childId | Out-Null

    Write-Output "Linked child issue #$childIssueNumber -> parent #$ParentIssueNumber"
  }
  catch {
    Write-Warning "Failed linking child issue #$childIssueNumber -> parent #$ParentIssueNumber. $($_.Exception.Message)"

    if ($Strict.IsPresent) {
      throw
    }
  }
}
