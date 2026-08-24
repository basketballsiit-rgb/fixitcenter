#!/usr/bin/env pwsh
# ================================================================
# NPC FixIt Center — Database Setup Script
# รันหลังจากติดตั้ง PostgreSQL เสร็จแล้ว
# Usage: .\db-setup.ps1
# ================================================================

param(
    [string]$PgPassword = "npc_secret_2024",
    [string]$PgSuperPassword = "postgres"
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  ✗ $msg" -ForegroundColor Red }

# ── Find psql ─────────────────────────────────────────────────────────────────
Write-Step "หา psql.exe..."

$pgPaths = @(
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe"
)

$psql = $null
foreach ($p in $pgPaths) {
    if (Test-Path $p) { $psql = $p; break }
}

if (-not $psql) {
    # Try PATH
    $psql = (Get-Command psql -ErrorAction SilentlyContinue)?.Source
}

if (-not $psql) {
    Write-Fail "ไม่พบ psql.exe — กรุณาเพิ่ม PostgreSQL bin ใน PATH"
    Write-Host "  เช่น: C:\Program Files\PostgreSQL\15\bin" -ForegroundColor Yellow
    exit 1
}

Write-Success "พบ psql: $psql"

# ── Add to PATH for this session ───────────────────────────────────────────────
$pgBin = Split-Path $psql
$env:PATH = "$pgBin;$env:PATH"
$env:PGPASSWORD = $PgSuperPassword

# ── Create role and database ───────────────────────────────────────────────────
Write-Step "สร้าง user และ database..."

$sql = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'npc_user') THEN
    CREATE ROLE npc_user WITH LOGIN PASSWORD '$PgPassword';
  END IF;
END
`$`$;

SELECT 'CREATE DATABASE npc_fixitcenter OWNER npc_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'npc_fixitcenter')`gexec

GRANT ALL PRIVILEGES ON DATABASE npc_fixitcenter TO npc_user;
"@

$sql | & $psql -U postgres -h localhost -p 5432

if ($LASTEXITCODE -eq 0) {
    Write-Success "สร้าง user 'npc_user' และ database 'npc_fixitcenter' เรียบร้อย"
} else {
    Write-Fail "เกิดข้อผิดพลาด — ตรวจสอบ password ของ postgres user"
    Write-Host ""
    Write-Host "  ลองรันด้วย: .\db-setup.ps1 -PgSuperPassword 'รหัสผ่านของคุณ'" -ForegroundColor Yellow
    exit 1
}

# ── Run Prisma migrations ──────────────────────────────────────────────────────
Write-Step "รัน Prisma migrations..."
npx prisma migrate dev --name init --skip-seed
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Migration ล้มเหลว"
    exit 1
}
Write-Success "สร้างตารางทั้งหมดเรียบร้อย"

# ── Generate Prisma client ────────────────────────────────────────────────────
Write-Step "Generate Prisma Client..."
npx prisma generate
Write-Success "Prisma Client พร้อมใช้งาน"

# ── Run seed ──────────────────────────────────────────────────────────────────
Write-Step "ใส่ข้อมูลตัวอย่าง (seed)..."
npx ts-node --project tsconfig.json prisma/seed.ts
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Seed ล้มเหลว"
    exit 1
}
Write-Success "ข้อมูลตัวอย่างพร้อมแล้ว"

# ── Done ───────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  ✅  Database setup เสร็จสมบูรณ์!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  ขั้นตอนถัดไป:" -ForegroundColor White
Write-Host "  1. ติดตั้ง Redis (ดูคำแนะนำด้านล่าง)" -ForegroundColor White
Write-Host "  2. รัน: pnpm dev" -ForegroundColor White
Write-Host ""
Write-Host "  ติดตั้ง Redis บน Windows:" -ForegroundColor Yellow
Write-Host "  winget install -e --id Redis.Redis" -ForegroundColor Yellow
Write-Host ""
