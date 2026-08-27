#!/bin/bash
# ==============================================================================
# 🚀 NPC FixIt Center — Auto-Deploy Cron Script (Smart Build)
# - Only rebuilds services that actually changed (web/api/both)
# - Uses Docker BuildKit cache → pnpm packages cached between builds
# - Runs every 5 minutes via cron
# ==============================================================================

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"
export DOCKER_BUILDKIT=1    # Enable BuildKit cache mounts
export COMPOSE_DOCKER_CLI_BUILD=1

DIR="/var/www/fixitcenter"
LOG="/var/log/fixit_deploy.log"

cd "$DIR" || exit 1

# Detect docker compose
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif docker-compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
elif /usr/local/bin/docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="/usr/local/bin/docker compose"
fi

# Fetch remote changes
git fetch origin main >/dev/null 2>&1

LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/main 2>/dev/null)
API_STATUS=$(docker ps --filter "name=npc_api" --filter "status=running" -q 2>/dev/null)

if [ "$LOCAL" = "$REMOTE" ] && [ -n "$API_STATUS" ] && [ "$1" != "--force" ]; then
    # No changes, skip
    exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 Changes detected ($LOCAL -> $REMOTE). Deploying..." >> "$LOG"

# Clean pull without conflicts
git reset --hard origin/main >> "$LOG" 2>&1
git pull origin main >> "$LOG" 2>&1

if [ -z "$COMPOSE_CMD" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Error: Docker Compose not found" >> "$LOG"
    exit 1
fi

# ─── Smart Build: detect which services changed ───────────────────────────────
CHANGED_FILES=$(git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null || echo "all")

BUILD_API=0
BUILD_WEB=0

if echo "$CHANGED_FILES" | grep -qE "^(apps/api/|prisma/|packages/)"; then
    BUILD_API=1
fi
if echo "$CHANGED_FILES" | grep -qE "^(apps/web/|packages/)"; then
    BUILD_WEB=1
fi
# If docker-compose, auto-deploy script, or env changed → rebuild both
if echo "$CHANGED_FILES" | grep -qE "^(docker-compose|\.env|auto-deploy)"; then
    BUILD_API=1
    BUILD_WEB=1
fi
# Fallback: if can't detect or first run → build both
if [ "$LOCAL" = "$REMOTE" ] || [ -z "$CHANGED_FILES" ] || [ "$CHANGED_FILES" = "all" ]; then
    BUILD_API=1
    BUILD_WEB=1
fi

# ─── Build only what changed ──────────────────────────────────────────────────
if [ "$BUILD_API" = "1" ] && [ "$BUILD_WEB" = "1" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔨 Building API + Web (changes in both)..." >> "$LOG"
    $COMPOSE_CMD build api web >> "$LOG" 2>&1
elif [ "$BUILD_API" = "1" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔨 Building API only..." >> "$LOG"
    $COMPOSE_CMD build api >> "$LOG" 2>&1
elif [ "$BUILD_WEB" = "1" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔨 Building Web only..." >> "$LOG"
    $COMPOSE_CMD build web >> "$LOG" 2>&1
fi

$COMPOSE_CMD up -d >> "$LOG" 2>&1

# Run DB migrations (safe to run repeatedly)
sleep 5
$COMPOSE_CMD exec -T api pnpm exec prisma migrate deploy --schema /app/prisma/schema.prisma >> "$LOG" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Auto-deploy complete! FixIt Center is ONLINE." >> "$LOG"
