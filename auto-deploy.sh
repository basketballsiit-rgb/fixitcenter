#!/bin/bash
# ==============================================================================
# 🚀 NPC FixIt Center — Auto-Deploy Cron Script (Production Hardened)
# ==============================================================================

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

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
git fetch origin main > /dev/null 2>&1

LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/main 2>/dev/null)

API_STATUS=$(docker ps --filter "name=npc_api" --filter "status=running" -q 2>/dev/null)

if [ "$LOCAL" != "$REMOTE" ] || [ -z "$API_STATUS" ] || [ "$1" == "--force" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 Changes detected ($LOCAL -> $REMOTE). Deploying..." >> "$LOG"
    
    # Ensure clean pull without conflicts
    git reset --hard origin/main >> "$LOG" 2>&1
    git pull origin main >> "$LOG" 2>&1

    if [ -n "$COMPOSE_CMD" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔨 Building and starting all containers..." >> "$LOG"
        $COMPOSE_CMD build --no-cache web api >> "$LOG" 2>&1
        $COMPOSE_CMD up -d >> "$LOG" 2>&1
        $COMPOSE_CMD exec -T api pnpm db:migrate >> "$LOG" 2>&1
        $COMPOSE_CMD exec -T api pnpm db:seed >> "$LOG" 2>&1
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Auto-deploy complete! FixIt Center is ONLINE." >> "$LOG"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Error: Docker Compose not found" >> "$LOG"
    fi
fi
