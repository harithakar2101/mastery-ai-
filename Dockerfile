# ==============================================================================
# Multi-stage Dockerfile for Mastery.ai Autonomous Pedagogical Engine
# Cloud Run & Production Containerization
# ==============================================================================

# Stage 1: Build Frontend Assets
FROM node:22-alpine AS builder

WORKDIR /app

# Install native compilation toolchain for SQLite & C bindings
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

# Compile production Vite SPA assets into /app/dist
RUN npm run build

# Stage 2: Production Distroless/Unprivileged Runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Install curl for container orchestration health checks
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies
COPY package*.json ./
RUN apk add --no-cache python3 make g++ && \
    npm ci --omit=dev && \
    npm install tsx && \
    apk del python3 make g++

# Copy built SPA bundle from builder
COPY --from=builder /app/dist ./dist

# Copy backend server modules and database migration scripts
COPY server ./server
COPY server.ts ./server.ts
COPY index.html ./index.html
COPY vite.config.ts ./vite.config.ts

# Prepare writable data directory for SQLite WAL databases
RUN mkdir -p /app/data && chown -R node:node /app

# Enforce non-root execution per security guidelines
USER node

EXPOSE 3000

# Health probe aligned with Kubernetes and Cloud Run standards
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/healthz || exit 1

# Start Mastery.ai Pedagogical Server
CMD ["npx", "tsx", "server.ts"]
