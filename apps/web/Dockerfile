# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.15.1 --activate
WORKDIR /app
ENV CI=true

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --filter @premsight/web... --frozen-lockfile

FROM base AS dev
COPY --from=deps /app /app
COPY apps/web ./apps/web
COPY packages/shared-types ./packages/shared-types
WORKDIR /app/apps/web
EXPOSE 3000
ENV PORT=3000 \
    HOSTNAME=0.0.0.0
CMD ["pnpm", "exec", "next", "dev", "-H", "0.0.0.0", "-p", "3000"]

FROM base AS builder
COPY --from=deps /app /app
COPY apps/web ./apps/web
COPY packages/shared-types ./packages/shared-types
WORKDIR /app/apps/web
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
ENV PORT=3000 \
    HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
