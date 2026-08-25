#!/bin/bash
# ==============================================================================
# 🚀 NPC FixIt Center — Auto-Deploy Cron Script
# Checks GitHub every 5 minutes, pulls new changes & rebuilds automatically
# ==============================================================================

DIR="/var/www/fixitcenter"
LOG="/var/log/fixit_deploy.log"

cd "$DIR" || exit 1

# Check remote changes
git fetch origin main > /dev/null 2>&1

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 New commits detected on GitHub. Auto-deploying..." >> "$LOG"
    
    git pull origin main >> "$LOG" 2>&1

    # Detect docker compose v2 vs v1
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    fi

    if [ -n "$COMPOSE_CMD" ]; then
        $COMPOSE_CMD up -d --build >> "$LOG" 2>&1
        $COMPOSE_CMD exec -T api pnpm db:migrate >> "$LOG" 2>&1
    fi

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Auto-deploy finished successfully!" >> "$LOG"
fi
