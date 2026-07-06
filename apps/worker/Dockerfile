FROM node:20-alpine
WORKDIR /app

# docker CLI to spawn app containers; build tools for better-sqlite3
RUN apk add --no-cache docker-cli python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx turbo build --filter=@infrastack/caddy --filter=@infrastack/backend --filter=@infrastack/worker

ENV INFRASTACK_DATA_DIR=/data
ENV INFRASTACK_URL_SCHEME=https
ENV INFRASTACK_DOMAIN_SUFFIX=yourdomain.com
ENV CADDY_ADMIN_URL=http://caddy:2019
ENV DOCKER_HOST_NAME=host.docker.internal

CMD ["node", "apps/worker/dist/index.js"]
