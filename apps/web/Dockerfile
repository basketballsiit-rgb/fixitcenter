FROM node:20-alpine AS base
RUN npm install -g pnpm

# 1. Install dependencies based on lockfile
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY packages/shared ./packages/shared
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install

# 2. Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
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
