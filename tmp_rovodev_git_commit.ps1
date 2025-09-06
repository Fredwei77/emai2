$ErrorActionPreference = 'Stop'
# Ensure repo and identity
$inside = $false
try { git rev-parse --is-inside-work-tree >$null 2>&1; if ($LASTEXITCODE -eq 0) { $inside = $true } } catch {}
if (-not $inside) {
  git init | Out-Null
  git config user.name "Rovo Dev"
  git config user.email "rovodev@example.com"
}
# Stage changes
git add -A
# Commit if staged changes exist
$staged = git diff --cached --name-only
if (-not [string]::IsNullOrWhiteSpace($staged)) {
  git commit -m "chore: enforce Node >=18 via engines; remove unused dep; upgrade Vite to v7; fix audit vulnerabilities; update README" | Out-Null
  $result = "Committed files:`n$staged"
} else {
  $result = "No staged changes to commit."
}
$last = git -c core.pager=cat --no-pager log -n 1 --oneline
$status = git status --porcelain
@(
  "RESULT:",
  $result,
  "",
  "LAST:",
  $last,
  "",
  "STATUS:",
  $status
) | Set-Content -Path "tmp_rovodev_git_output.txt" -Encoding UTF8
