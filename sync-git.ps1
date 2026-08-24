param(
    [string]$msg = "chore: auto-sync update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host "📦 Staging all changed files..." -ForegroundColor Cyan
git add .

Write-Host "💾 Committing changes: '$msg'..." -ForegroundColor Cyan
git commit -m "$msg"

Write-Host "🚀 Pushing to GitHub (origin main)..." -ForegroundColor Cyan
git push origin main

Write-Host "✅ Push to GitHub complete!" -ForegroundColor Green
