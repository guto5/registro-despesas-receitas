# syntax=docker/dockerfile:1

# ── Frontend (Vite + React) ─────────────────────────────────────────────────
FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Backend (Express + Prisma) ────────────────────────────────────────────────
FROM node:20-bookworm-slim AS backend-build
WORKDIR /app/backend
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate && npm run build && npm prune --omit=dev

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/prisma ./prisma
COPY --from=frontend-build /app/frontend/dist ./dist/public

EXPOSE 3001
ENV PORT=3001

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/server.js"]
