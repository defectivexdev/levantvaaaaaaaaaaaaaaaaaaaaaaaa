# ── Levant VA — Automated Git Tag & Push ──────────────────────────────
# Usage: .\push.ps1 "Your commit message here"
# If no message is provided, a default is used.
# Auto-increments patch version from the latest v*.*.* tag.

param(
    [string]$Message = "fix: Map & ACARS sync improvements"
)

# 1. Resolve latest version tag (vMAJOR.MINOR.PATCH)
$latestTag = git tag --list "v*" --sort=-v:refname | Select-Object -First 1

if ($latestTag -match '^v(\d+)\.(\d+)\.(\d+)$') {
    $major = [int]$Matches[1]
    $minor = [int]$Matches[2]
    $patch = [int]$Matches[3] + 1
} else {
    # No valid tag found — start at v1.0.0
    $major = 1; $minor = 0; $patch = 0
}

$version = "v$major.$minor.$patch"

# 2. Stage, commit, tag, push
git add .
git commit -m "$Message"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Nothing to commit." -ForegroundColor Yellow
    exit 0
}

git tag -a $version -m "Release $version"
git push origin main $version 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSuccessfully pushed and tagged as $version" -ForegroundColor Green
} else {
    Write-Host "`nPush completed (check output above for warnings)" -ForegroundColor Yellow
}
