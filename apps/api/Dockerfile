# syntax=docker/dockerfile:1.4
FROM node:20-alpine AS base
# Install openssl and libc6-compat for Prisma compatibility
RUN apk add --no-cache openssl libc6-compat
# Use pnpm v9 (stable, no binary identity verification issues)
RUN npm install -g pnpm@9

# 1. Install dependencies (cache pnpm store between builds)
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml* ./
COPY packages/shared ./packages/shared
COPY apps/api/package.json ./apps/api/package.json
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm-api,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile
# Run prisma generate from workspace root where schema.prisma lives
RUN pnpm exec prisma generate --schema ./prisma/schema.prisma

# 2. Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY . .
RUN pnpm --filter @npc/api build

# 3. Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app ./

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main"]
