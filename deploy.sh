#!/bin/bash
set -e

# Detect docker compose v2 (CentOS 9 / Ubuntu) vs v1 (docker-compose)
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Error: Docker Compose is not installed."
    exit 1
fi

echo "=================================================="
echo "🚀 NPC FixIt Center — Production Deploy / Update"
echo "🔧 Compose Engine: $COMPOSE_CMD"
echo "=================================================="

echo "📥 1. Pulling latest code from GitHub..."
git pull origin main

echo "📦 2. Building & restarting Docker containers..."
$COMPOSE_CMD up -d --build

echo "🔄 3. Running database migrations..."
$COMPOSE_CMD exec -T api pnpm db:migrate

echo "✅ 4. Verifying container health..."
$COMPOSE_CMD ps

echo "=================================================="
echo "🎉 Deployment completed successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 API:      http://localhost:3001"
echo "=================================================="
