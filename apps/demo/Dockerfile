# Multi-stage Dockerfile for the Infrastack Vite demo app.
# The production stage uses a tiny static-file server on port 3000
# and exposes /health for the Infrastack health probe.

# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
# The demo is part of an npm workspace, so it does not have its own lock file.
# `npm install` is used here so the Dockerfile works with the tarball the
# Infrastack worker uploads.
COPY package.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:20-alpine
WORKDIR /app

# Install a minimal static file server
RUN npm install -g serve@14

# Copy built assets from the builder stage
COPY --from=builder /app/dist ./dist

# Add a tiny health endpoint responder alongside the static assets
RUN echo '{"ok":true}' > ./dist/health.json

EXPOSE 3000

# Serve static files; /health.json is handled by serve automatically
CMD ["serve", "-s", "dist", "-l", "3000"]
