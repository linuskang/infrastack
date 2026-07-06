FROM node:20-alpine
WORKDIR /app

# better-sqlite3 needs build tools
RUN apk add --no-cache python3 make g++

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
RUN npx turbo build --filter=@infrastack/backend

ENV INFRASTACK_DATA_DIR=/data
ENV PORT=8787

EXPOSE 8787

CMD ["node", "apps/backend/dist/index.js"]
