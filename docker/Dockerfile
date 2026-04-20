# Burme Transcript - Multi-stage Dockerfile

# Stage 1: Base
FROM node:18-alpine AS base
RUN apk add --no-cache tini curl
WORKDIR /app

# Stage 2: Dependencies
FROM base AS deps
RUN mkdir -p /app/backend
COPY backend/package.json /app/backend/package-lock.json* /app/backend/
WORKDIR /app/backend
RUN npm ci --production

# Stage 3: Builder
FROM base AS builder
RUN mkdir -p /app/backend
COPY backend/package.json /app/backend/package-lock.json* /app/backend/
WORKDIR /app/backend
RUN npm ci && \
    npm cache clean --force

# Stage 4: Production
FROM base AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies from deps stage
COPY --from=deps /app/backend/node_modules /app/backend/node_modules

# Copy source code
COPY backend/ /app/backend/

# Create uploads directory with proper permissions
RUN mkdir -p /app/backend/uploads/{videos,subtitles,transcripts} && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1);})" || exit 1

# Use tini as init system
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start the server
CMD ["node", "server.js"]