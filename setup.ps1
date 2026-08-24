#!/usr/bin/env pwsh
# ================================================================
# NPC FixIt Center — Windows Setup Script
# Run from project root: .\setup.ps1
# ================================================================

param(
    [switch]$SkipInstall,
    [switch]$SkipMigrate,
    [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
    Write-Host "`n>>> $msg" -ForegroundColor Cyan
}

function Write-Success($msg) {
    Write-Host "  ✓ $msg" -ForegroundColor Green
}

function Write-Warning($msg) {
    Write-Host "  ⚠ $msg" -ForegroundColor Yellow
}

# ── Check prerequisites ──────────────────────────────────────────────────────
Write-Step "Checking prerequisites..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}
$nodeVersion = (node --version)
Write-Success "Node.js $nodeVersion"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "  Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}
Write-Success "pnpm $(pnpm --version)"

# ── Check PostgreSQL ──────────────────────────────────────────────────────────
Write-Step "Checking services..."

$pgRunning = Get-Process -Name postgres -ErrorAction SilentlyContinue
if (-not $pgRunning) {
    Write-Warning "PostgreSQL does not appear to be running."
    Write-Warning "Start it via XAMPP or as a Windows service before running db:migrate."
} else {
    Write-Success "PostgreSQL is running"
}

$redisRunning = Get-Process -Name redis-server -ErrorAction SilentlyContinue
if (-not $redisRunning) {
    Write-Warning "Redis does not appear to be running."
    Write-Warning "Install Redis for Windows: https://github.com/tporadowski/redis/releases"
    Write-Warning "Or use Docker: docker run -d -p 6379:6379 redis:7-alpine"
} else {
    Write-Success "Redis is running"
}

# ── Install dependencies ──────────────────────────────────────────────────────
if (-not $SkipInstall) {
    Write-Step "Installing dependencies..."
    pnpm install
    Write-Success "Dependencies installed"
}

# ── Prisma ────────────────────────────────────────────────────────────────────
Write-Step "Generating Prisma client..."
pnpm db:generate
Write-Success "Prisma client generated"

if (-not $SkipMigrate) {
    Write-Step "Running database migrations..."
    pnpm db:migrate
    Write-Success "Migrations complete"
}

if (-not $SkipSeed) {
    Write-Step "Seeding database with demo data..."
    pnpm db:seed
    Write-Success "Database seeded"
}

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host "`n" -NoNewline
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  ✅  Setup complete!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Start dev servers:  pnpm dev" -ForegroundColor White
Write-Host "  Frontend:           http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API:        http://localhost:3001" -ForegroundColor White
Write-Host "  Swagger Docs:       http://localhost:3001/api/docs" -ForegroundColor White
Write-Host "  Prisma Studio:      pnpm db:studio" -ForegroundColor White
Write-Host ""
Write-Host "  Default login:  admin / NPC@2024!" -ForegroundColor Yellow
Write-Host ""
