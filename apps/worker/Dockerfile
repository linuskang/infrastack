FROM node:20-alpine
WORKDIR /app

# docker CLI to spawn app containers; build tools for better-sqlite3
RUN apk add --no-cache docker-cli python3 make g++

# Copy all workspace package.json files so npm ci can resolve workspaces
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/worker/package.json ./apps/worker/
COPY apps/marketing/package.json ./apps/marketing/
COPY packages/infrastack/package.json ./packages/infrastack/
COPY packages/caddy/package.json ./packages/caddy/
COPY packages/ui/package.json ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/

RUN npm ci

# Copy source and build
COPY . .
RUN npx turbo build --filter=@infrastack/caddy --filter=@infrastack/backend --filter=@infrastack/worker

ENV INFRASTACK_DATA_DIR=/data
ENV INFRASTACK_URL_SCHEME=https
ENV INFRASTACK_DOMAIN_SUFFIX=yourdomain.com
ENV CADDY_ADMIN_URL=http://caddy:2019
ENV DOCKER_HOST_NAME=host.docker.internal

CMD ["node", "apps/worker/dist/index.js"]
