# SkillSync Payment Service Dockerfile
# Multi-stage build for optimized production image

# ==========================================
# STAGE 1: Development
# ==========================================
FROM node:20-alpine AS development

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    wget \
    postgresql-client

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Expose port and debugger port
EXPOSE 3004 9229

# Development command (with nodemon for hot reload)
CMD ["npm", "run", "dev"]

# ==========================================
# STAGE 2: Build
# ==========================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# ==========================================
# STAGE 3: Production
# ==========================================
FROM node:20-alpine AS production

# Metadata
LABEL maintainer="SkillSync Team"
LABEL service="payment-service"
LABEL version="1.0"

# Set NODE_ENV
ENV NODE_ENV=production

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    wget \
    postgresql-client && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies and source from build stage
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app .

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3004/api/health || exit 1

# Start application
CMD ["node", "src/server.js"]
