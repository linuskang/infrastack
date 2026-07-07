# Getting started with Infrastack

Infrastack is a code-first deployment platform. You declare your app in
`infrastack.config.mjs`, then `npx infrastack deploy` builds a container and
returns a live URL.

This guide gets you from zero to a deployed app.

## 1. Deploy the control plane

The fastest way to run the backend is Docker Compose on a Linux host or
Proxmox LXC container.

### Requirements

- A host with Docker and Docker Compose
- Ports `80`, `443`, and `8787` available
- A domain with a wildcard DNS record `*.yourdomain.com` pointing to the host

### Start the backend

```bash
git clone https://github.com/linuskang/infrastack.git
cd infrastack

# Set your domain
echo "INFRASTACK_DOMAIN_SUFFIX=yourdomain.com" > .env

# Pull and run the pre-built images from GitHub Container Registry
docker compose pull
docker compose up -d
```

Verify the control plane is healthy:

```bash
curl http://localhost:8787/health
```

For Proxmox-specific instructions, see [Deploy on Proxmox VE](./deploy/proxmox.md).
For more Compose options, see [Deploy with Docker Compose](./deploy/docker-compose.md).

## 2. Deploy the demo app

The repo includes a ready-to-deploy demo app at `apps/demo`.

```bash
cd apps/demo

# Point the CLI at your control plane
export INFRASTACK_API_URL=http://your-host-ip:8787

# Deploy
npx infrastack deploy
```

The CLI prints a URL like `https://infrastack-demo.yourdomain.com` once the
deployment is ready.

## 3. Deploy your own app

In your own project:

```bash
npm install infrastack
npx infrastack init
```

Edit `infrastack.config.mjs` for your app, make sure you have a `Dockerfile`,
then run:

```bash
npx infrastack deploy --api http://your-host-ip:8787
```

See [Use Infrastack in your app](./use-in-your-app.md) for the full config
reference.

## Next steps

- Read the [architecture overview](./architecture.md)
- Check the [Docker Compose guide](./deploy/docker-compose.md) for GHCR and update options
- Look at the demo app in `apps/demo`
