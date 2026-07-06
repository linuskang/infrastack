# Use Infrastack in your app

## Quick start

1. Install the CLI in your project:

```bash
npm install infrastack
```

While Infrastack is not yet published to npm, install it from your local monorepo or from your private registry.

2. Create a config file:

```bash
npx infrastack init
```

This writes `infrastack.config.mjs`.

3. Edit the config for your app:

```js
import { defineConfig, service } from "infrastack"

export default defineConfig({
  name: "my-app",
  target: "managed",
  services: [
    service("web", {
      port: 3000,
      build: { dockerfile: "Dockerfile" },
      env: {
        NODE_ENV: "production",
      },
      healthcheck: {
        path: "/health",
      },
    }),
  ],
})
```

4. Make sure your app has a `Dockerfile` at the project root.

5. Deploy:

```bash
npx infrastack deploy --api http://your-proxmox-host:8787
```

The CLI prints a URL when the deploy is ready.

## Config reference

### `defineConfig(options)`

- `name` (string, required) — app name, used to generate the subdomain slug
- `target` (string) — `"managed"` is the only option in v0
- `services` (array) — list of services to run
- `domains` (string[]) — custom domains (not implemented in v0)

### `service(name, options)`

- `name` (string) — service name
- `port` (number, required) — port your app listens on inside the container
- `build` (object)
  - `dockerfile` (string) — path to Dockerfile, defaults to `"Dockerfile"`
- `env` (Record<string, string>) — environment variables passed to the container
- `healthcheck` (object)
  - `path` (string) — HTTP path to probe, defaults to `"/"`
- `resources` (object) — not implemented in v0
- `scaling` (object) — not implemented in v0

## CLI reference

### Global flags

- `--api <url>` — control plane URL. Can also be set with `INFRASTACK_API_URL` env var.
- `--json` — output machine-readable JSON

### Commands

- `npx infrastack init` — scaffold `infrastack.config.mjs`
- `npx infrastack deploy` — deploy the current project
- `npx infrastack status [deploy-id]` — show latest deploy status, or a specific deploy
- `npx infrastack logs <deploy-id>` — show container logs
- `npx infrastack version` — print version
- `npx infrastack help` — show help

## Requirements

- Your app must listen on the `port` declared in the config.
- Your app must respond with HTTP 200 on the `healthcheck.path`.
- Either provide a `Dockerfile`, or install Nixpacks on the Infrastack backend host so it can auto-build your app.

## Example Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```
