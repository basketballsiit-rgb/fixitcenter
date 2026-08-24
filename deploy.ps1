Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🚀 NPC FixIt Center — Windows Server Deploy" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Write-Host "📥 1. Pulling latest code from GitHub..." -ForegroundColor Yellow
git pull origin main

Write-Host "📦 2. Installing dependencies & building..." -ForegroundColor Yellow
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm build

Write-Host "🔄 3. Restarting production processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
Start-Process -FilePath "pnpm" -ArgumentList "start" -NoNewWindow

Write-Host "==================================================" -ForegroundColor Green
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
