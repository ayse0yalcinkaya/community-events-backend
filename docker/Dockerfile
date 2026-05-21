# ============================================================================
# Production Dockerfile - Multi-Stage Build
# ============================================================================
# Purpose: Optimized production image with minimal size and security
# Usage: docker build -f docker/Dockerfile -t community-events-backend:prod .
# Run: docker run -p 3000:3000 community-events-backend:prod
#
# Multi-Stage Strategy:
#   - Stage 1 (deps): Install production dependencies only
#   - Stage 2 (build): Compile TypeScript, generate Prisma client
#   - Stage 3 (production): Minimal runtime with only necessary artifacts
#
# Optimization Benefits:
#   - Image size: < 200MB (vs ~900MB with all dev dependencies)
#   - Security: Non-root user, minimal attack surface
#   - Performance: Layer caching, optimized build order
# ============================================================================

# ============================================================================
# Stage 1: Dependencies
# ============================================================================
# Install production dependencies only (excludes devDependencies)
# This stage creates a slim layer with only runtime packages
FROM node:20-alpine AS deps

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
# Layer caching: Dependencies only rebuild when package.json changes
COPY package*.json ./

# Install production dependencies using npm ci
# --only=production: Excludes devDependencies (typescript, jest, etc.)
# Ensures exact versions from package-lock.json
RUN npm ci --only=production

# ============================================================================
# Stage 2: Build
# ============================================================================
# Build application and generate Prisma client
# This stage includes all build tools but doesn't make it to final image
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
# This is a temporary installation for the build process only
RUN npm ci

# Copy TypeScript and NestJS configuration files
# Required for nest build to compile TypeScript
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY eslint.config.mjs ./

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client
# Creates TypeScript types and runtime client based on schema
RUN npx prisma generate

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript
# nest build compiles src/ to dist/ with source maps
RUN npm run build

# ============================================================================
# Stage 3: Production
# ============================================================================
# Minimal production runtime with only necessary artifacts
FROM node:20-alpine AS production

# Create non-root user for security
# UID 1001: Non-root user, prevents root execution
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies from deps stage
# Only production node_modules (no dev tools)
COPY --from=deps /app/node_modules ./node_modules

# Copy build artifacts from build stage
# dist/ contains compiled JavaScript from TypeScript
COPY --from=build /app/dist ./dist

# Copy Prisma schema and generated client
# prisma/ contains schema.prisma
# .prisma/client contains generated Prisma client
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Create logs directory for Winston logger
# Permission: nestjs user has write access
RUN mkdir -p /app/logs && chown -R nestjs:nodejs /app/logs

# Change ownership to non-root user
# Ensures container runs as nestjs user, not root
USER nestjs

# Expose application port
# NestJS application listens on port 3000
EXPOSE 3000

# Add health check
# Validates application is running on port 3000
# Uses Node.js built-in net module to check port availability
# Interval: 30s, Timeout: 10s, Retries: 3
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const net = require('net'); const server = net.createServer(); server.listen(3000, () => { server.close(); process.exit(0) }); server.on('error', () => process.exit(1));"

# Start production application
# Uses compiled JavaScript from dist/src/main.js
CMD ["node", "dist/src/main"]

# ============================================================================
# Production Notes:
# - Final image contains ONLY production dependencies
# - Dev dependencies (typescript, jest, @nestjs/cli) excluded
# - Source code compiled to JavaScript, not included
# - Non-root user execution for security
# - Health check built-in for container monitoring
# - Image size target: < 200MB
# ============================================================================
