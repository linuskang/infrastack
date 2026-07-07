# Deploy with Docker Compose

This is the simplest way to run the whole Infrastack backend: backend, worker,
and Caddy all run as Docker containers.

## Requirements

- A Linux host with Docker and Docker Compose installed
- Ports 80, 443, and 8787 available
- A domain with a wildcard DNS record `*.yourdomain.com` pointing to the host

## 1. Clone the repo

```bash
git clone https://github.com/linuskang/infrastack.git /root/infrastack
cd /root/infrastack
```

## 2. Set your domain

```bash
export INFRASTACK_DOMAIN_SUFFIX=yourdomain.com
```

Or create a `.env` file:

```bash
echo "INFRASTACK_DOMAIN_SUFFIX=yourdomain.com" > .env
```

## 3. Start everything

```bash
docker compose up -d
```

This starts:

- `infrastack-backend` on port `8787`
- `infrastack-worker` with access to the host Docker socket
- `infrastack-caddy` on ports `80` and `443`

## 4. Check status

```bash
curl http://localhost:8787/health
docker compose logs -f
```

## 5. Deploy an app

From your local machine:

```bash
export INFRASTACK_API_URL=http://your-host-ip:8787
npx infrastack deploy
```

## How it works

- The worker container mounts `/var/run/docker.sock` so it can build and run
  your app containers directly on the host.
- App containers publish ports on the host; Caddy reaches them via
  `host.docker.internal`.
- Backend and worker share a Docker volume at `/data` for the SQLite database
  and uploaded tarballs.

## Deploy from GHCR instead of building on the host

The repo includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that
builds and pushes images to GitHub Container Registry:

- `ghcr.io/<your-github-username>/infrastack-backend:latest`
- `ghcr.io/<your-github-username>/infrastack-worker:latest`
- `ghcr.io/<your-github-username>/infrastack-caddy:latest`

On your host, set the image prefix and pull instead of building:

```bash
cd /root/infrastack

# Create .env with your GitHub username/org and domain
cat > .env <<EOF
INFRASTACK_DOMAIN_SUFFIX=yourdomain.com
INFRASTACK_IMAGE_PREFIX=ghcr.io/your-github-username
EOF

# Pull and run the pre-built images
docker compose pull
docker compose up -d
```

If the GHCR images are private, log in first:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u your-github-username --password-stdin
```

## Updating

### Pull latest GHCR images

```bash
cd /root/infrastack
git pull
docker compose pull
docker compose up -d
```

### Build locally

```bash
cd /root/infrastack
git pull
docker compose up -d --build
```

## Notes

- The worker service defaults to `yourdomain.com` if `INFRASTACK_DOMAIN_SUFFIX`
  is not set. Make sure to change it.
- Port 8787 should be reachable from where you run the CLI. Keep it off the
  public internet if possible; v0 has no authentication.
