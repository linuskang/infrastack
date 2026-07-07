# Infrastack Demo App

A minimal Vite + React app used to demonstrate Infrastack deployments.

## Running locally

```bash
cd apps/demo
npm install
npm run dev
```

Open http://localhost:3000.

## Deploying with Infrastack

Make sure your Infrastack control plane is running, then:

```bash
cd apps/demo
INFRASTACK_API_URL=http://your-control-plane:8787 npx infrastack deploy
```

The CLI prints a live URL once the deployment is ready.

## Files of note

- `infrastack.config.mjs` — declares the app name, service, port, and health check.
- `Dockerfile` — builds the static site and serves it with a tiny Node server.
- `src/App.tsx` — fetches `/health.json` to show the deployment status on screen.
