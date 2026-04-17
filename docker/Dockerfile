# Stage 1: Build stage (if needed for frontend build)
FROM node:18-alpine AS builder

WORKDIR /app

# Copy and install dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --production

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY backend/package*.json ./backend/

# Install production dependencies
WORKDIR /app/backend
RUN npm ci --production && \
    npm cache clean --force

# Copy source code
COPY backend/ ./

# Create uploads directory
RUN mkdir -p uploads/videos uploads/subtitles uploads/transcripts && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1);})

# Start the server
CMD ["node", "server.js"]