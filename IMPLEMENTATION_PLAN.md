# Infrastack Implementation Plan

## v0 Goal
A code-first deployment platform. A project declares its infrastructure in `infrastack.config.ts`, then `npx infrastack deploy` builds and runs it as a container on the managed host and prints a live URL.

## Hosting model for v0
- The control plane runs inside a Proxmox container operated by the project owner.
- No user accounts, auth, or multi-tenancy. The CLI connects to the control plane over the trusted network.
- CLI target: `INFRASTACK_API_URL` env var or `--api <url>` flag. Default `http://localhost:8787` for local development.

## Architecture

```
User repo
  ├─ infrastack.config.ts
  ├─ src/
  └─ Dockerfile (optional)

npx infrastack deploy
        │
        ▼
packages/infrastack CLI
  - load infrastack.config.ts
  - bundle repo context (tar, respecting .gitignore)
  - POST /v1/deploys to control plane
  - poll until ready
  - print URL

        │
        ▼
apps/backend (control plane, Hono)
  - SQLite DB for apps/deploys
  - store uploaded context tarball
  - enqueue deploy (status: queued)
  - serve status + URL

        │
        ▼
apps/worker (builder + runner)
  - poll deploys table for status=queued
  - build image (Dockerfile > Nixpacks auto-detect)
  - docker run container
  - write Caddy route: <slug>.infrastack.app -> container:port
  - healthcheck; mark status=ready

        │
        ▼
packages/caddy + Caddy server
  - on-demand TLS for *.infrastack.app
  - reverse proxy per deploy slug
```

## Data model (SQLite)

### apps
- `id` TEXT PRIMARY KEY
- `name` TEXT UNIQUE
- `slug` TEXT UNIQUE
- `config_json` TEXT
- `created_at` DATETIME

### deploys
- `id` TEXT PRIMARY KEY
- `app_id` TEXT -> apps.id
- `status` TEXT: queued | building | running | ready | failed
- `url` TEXT
- `image_tag` TEXT
- `container_id` TEXT
- `host_port` TEXT
- `build_log` TEXT
- `error_message` TEXT
- `created_at` DATETIME
- `updated_at` DATETIME

## API routes

- `POST /v1/apps` — create app from config
  Body: `{ name, slug, config }`
- `POST /v1/apps/:slug/deploys` — create deploy, upload tarball
  Form: `context` file
- `GET /v1/deploys/:id` — status + URL
- `GET /v1/apps/:slug/deploys` — list deploys
- `GET /v1/domains/allowed?domain=<host>` — Caddy on-demand TLS validation
- `GET /health` — control plane health

## CLI commands

- `npx infrastack init` — scaffold `infrastack.config.ts`
- `npx infrastack deploy` — deploy current project
- `npx infrastack status [deploy-id]` — show deploy status (`--json`)
- `npx infrastack logs [deploy-id]` — tail container logs
- Global flags: `--api <url>`, `--json`, `--help`

## Deploy flow

1. CLI reads `infrastack.config.ts` from cwd.
2. If no matching app exists, CLI calls `POST /v1/apps` to register it.
3. CLI creates a gzipped tar of the project (excluding node_modules, .git, dist, .turbo, .env*).
4. CLI calls `POST /v1/apps/:slug/deploys` with the tarball.
5. Backend inserts a `deploys` row with `status=queued` and stores the tarball.
6. Worker picks it up, extracts tarball, builds image.
7. Worker runs container with env/port from config.
8. Worker runs container with `-p 0:<service_port>` and reads the mapped host port.
9. Worker probes health endpoint at `http://localhost:<host_port><healthcheck.path>`.
10. On success, worker updates `status=ready`, stores `container_id` + `host_port`, computes `url`, and syncs all ready deploy routes to Caddy via its admin API (`localhost:2019`).
11. CLI polls `GET /v1/deploys/:id` and prints URL.

## File plan

### packages/infrastack
- `src/config.ts` — v0 config types + `defineConfig` + `service`
- `src/index.ts` — public API exports
- `src/sdk.ts` — control plane HTTP client
- `src/cli.ts` — CLI implementation
- `src/utils.ts` — tar/context helpers + config loader (`jiti`)
- `package.json` — add deps: `jiti`, `tar`, `picocolors`

### apps/backend
- `src/db.ts` — SQLite client + migrations
- `src/routes/apps.ts` — app/deploy routes
- `src/routes/health.ts` — healthcheck
- `src/index.ts` — wire routes, start server
- `package.json` — add deps: `better-sqlite3`, `hono`, `@hono/node-server`, `zod`

### apps/worker
- `src/index.ts` — poll loop
- `src/deploy.ts` — full deploy lifecycle: extract tarball, build (Dockerfile > Nixpacks), run container, health probe, Caddy sync
- `package.json` — deps: `@infrastack/backend`, `@infrastack/caddy`, `tar`
- The worker imports the DB module from `@infrastack/backend/db` so both processes share the same SQLite schema.

### packages/caddy
- `caddy.json` — base JSON config (HTTP-only for v0; add TLS in production)
- `src/index.ts` — `syncRoutes(routes)` helper that POSTs the full Caddy JSON config to the admin API

## Environment variables

- `INFRASTACK_API_URL` — control plane URL for the CLI (`http://localhost:8787`)
- `INFRASTACK_DATA_DIR` — shared SQLite DB + tarballs + build dirs (`./data`)
- `INFRASTACK_URL_SCHEME` — URL scheme for deploys (`https`)
- `INFRASTACK_DOMAIN_SUFFIX` — domain suffix for deploys (`infrastack.app`)
- `CADDY_ADMIN_URL` — Caddy admin API URL (`http://localhost:2019`)
- `PORT` — control plane port (`8787`)

## Local development harness
Run backend + worker + Caddy on the laptop:
- backend on `8787`
- worker polls same SQLite DB
- Caddy with base `caddy.json` config, routes synced by worker
- Use `lvh.me` or `nip.io` for subdomains without DNS setup

This lets you iterate without a Proxmox VM.

## Later phases

- Phase 2: Postgres, secrets/volumes, `link`, runtime `Resource` SDK, zero-downtime rolling deploys.
- Phase 3: Multi-node orchestrator (Nomad/k3s/Cloudflare Containers), preview envs, `logs`/`inspect`/`exec`, `--json` everywhere, `npx infrastack new --template`.
- Phase 4: Multi-target adapters (`managed` / `docker` / `fly` / `aws` via Pulumi bridge) on the same DSL.
