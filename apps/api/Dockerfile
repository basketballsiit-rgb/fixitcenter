FROM node:20-alpine AS base
# Install openssl and libc6-compat for Prisma compatibility
RUN apk add --no-cache openssl libc6-compat
# Use pnpm v9 (stable, no binary identity verification issues)
RUN npm install -g pnpm@9

# 1. Install dependencies based on lockfile
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml* ./
COPY packages/shared ./packages/shared
COPY apps/api/package.json ./apps/api/package.json
COPY prisma ./prisma
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @npc/api exec prisma generate

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
