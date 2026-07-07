<div align="center">

# Infrastack

A code-first deployment platform for self-hosting your apps.

[Getting started](./docs/getting-started.md) ·
[Architecture](./docs/architecture.md) ·
[Docker Compose](./docs/deploy/docker-compose.md) ·
[Proxmox](./docs/deploy/proxmox.md)

</div>

## What is Infrastack?

Infrastack lets you deploy containerized apps from a single config file. You
write `infrastack.config.mjs`, run `npx infrastack deploy`, and get a live URL.

No complex manifests, no cloud lock-in, no per-seat pricing. The control plane
runs on your own hardware (we like Proxmox VE) and builds your apps with Docker.

## Features

- **Config-first** — declare services, ports, env vars, and health checks in
  TypeScript.
- **Self-hosted** — run the control plane on your own Proxmox container or
  Docker host.
- **Automatic HTTPS** — Caddy provisions TLS for `*.yourdomain.com` out of the
  box.
- **Simple CLI** — `init`, `deploy`, `status`, and `logs` commands.
- **Fast local iteration** — backend, worker, and Caddy run locally for
  development.

## Quick start

### 1. Run the control plane

On a Linux host or Proxmox LXC container:

```bash
git clone https://github.com/linuskang/infrastack.git
cd infrastack

echo "INFRASTACK_DOMAIN_SUFFIX=yourdomain.com" > .env

docker compose pull
docker compose up -d
```

### 2. Deploy the included demo

```bash
cd apps/demo
export INFRASTACK_API_URL=http://your-host-ip:8787
npx infrastack deploy
```

The CLI prints a URL like `https://infrastack-demo.yourdomain.com`.

### 3. Deploy your own app

```bash
npm install infrastack
npx infrastack init
npx infrastack deploy --api http://your-host-ip:8787
```

See the [full docs](./docs/README.md) for config options and deployment guides.

## Example config

```js
// infrastack.config.mjs
import { defineConfig, service } from "infrastack"

export default defineConfig({
    name: "my-app",
    target: "managed",
    services: [
        service("web", {
            port: 3000,
            build: { dockerfile: "Dockerfile" },
            env: { NODE_ENV: "production" },
            healthcheck: { path: "/health" },
        }),
    ],
})
```

## Repository structure

```
apps/
  backend/        # Hono control plane (SQLite, REST API)
  worker/         # Builder + runner (Docker, Caddy sync)
  marketing/      # Public marketing site
  demo/           # Example Vite app for deployments
packages/
  infrastack/     # CLI, config DSL, and SDK
  caddy/          # Caddy admin API helper
  eslint-config/  # Shared ESLint config
  typescript-config/  # Shared TypeScript configs
  ui/             # Shared UI components
docs/             # Documentation
```

## Status

Infrastack is in early development (v0). It is intentionally simple: no auth,
no multi-tenancy, and a trusted-network control plane. Use it for personal
projects, homelabs, and small teams.

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and
[SECURITY.md](./SECURITY.md) to get started.

## License

[MIT](./LICENSE)
