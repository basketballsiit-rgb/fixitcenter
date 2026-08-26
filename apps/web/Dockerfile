FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat
# Use pnpm v9 (stable, no binary identity verification issues)
RUN npm install -g pnpm@9

# 1. Install dependencies based on lockfile
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml* ./
COPY packages/shared ./packages/shared
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --no-frozen-lockfile

# 2. Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
# Unset NEXT_PUBLIC_API_URL so it falls back to relative /api in browser
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_WS_URL=""
RUN pnpm --filter @npc/web build

# 3. Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app ./

WORKDIR /app/apps/web
EXPOSE 3000
ENV PORT 3000
CMD ["pnpm", "start"]
