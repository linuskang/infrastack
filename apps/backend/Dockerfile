FROM node:20-alpine
WORKDIR /app

# better-sqlite3 needs build tools
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx turbo build --filter=@infrastack/backend

ENV INFRASTACK_DATA_DIR=/data
ENV PORT=8787

EXPOSE 8787

CMD ["node", "apps/backend/dist/index.js"]
