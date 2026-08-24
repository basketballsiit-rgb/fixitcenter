#!/bin/bash
set -e

echo "=================================================="
echo "🚀 NPC FixIt Center — Production Deploy / Update"
echo "=================================================="

echo "📥 1. Pulling latest code from GitHub..."
git pull origin main

echo "📦 2. Building & restarting Docker containers..."
docker-compose up -d --build

echo "🔄 3. Running database migrations..."
docker-compose exec -T api pnpm db:migrate

echo "✅ 4. Verifying container health..."
docker-compose ps

echo "=================================================="
echo "🎉 Deployment completed successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 API:      http://localhost:3001"
echo "=================================================="
