# Deploy the Infrastack backend on Proxmox VE

This guide runs the Infrastack backend on a Proxmox VE LXC container using
Docker Compose.

For the generic Docker Compose instructions, see
[Docker Compose](./docker-compose.md).

For a manual systemd setup instead of Docker Compose, use the service files in
`scripts/systemd/`.

## Prerequisites

- Proxmox VE 8+ with a working network
- A privileged Debian/Ubuntu LXC container with Docker and Docker Compose
  installed

## 1. Create the LXC container

A privileged container is simplest because the worker needs to spawn sibling
Docker containers:

```bash
pct create 100 local:vztmpl/debian-12-standard_12.x-x_amd64.tar.zst \
  --hostname infrastack \
  --cores 4 \
  --memory 8192 \
  --rootfs local-lvm:32 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp
pct start 100
pct enter 100
```

Adjust CPU, memory, disk, and network to your needs.

## 2. Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# Install Docker Compose plugin
apt-get update
apt-get install -y docker-compose-plugin
```

## 3. Clone the repo

```bash
git clone https://github.com/linuskang/infrastack.git /root/infrastack
cd /root/infrastack
```

## 4. Start Infrastack

```bash
export INFRASTACK_DOMAIN_SUFFIX=yourdomain.com
docker compose up -d
```

This pulls and starts the backend, worker, and Caddy containers.

To use pre-built images from GitHub Container Registry instead of building on
the container, see the GHCR section in
[Docker Compose](./docker-compose.md).

## 5. Check status

```bash
curl http://localhost:8787/health
docker compose logs -f
```

## 6. Network and DNS

- Point a wildcard DNS record `*.yourdomain.com` to the container's IP, or
  create an A record per app.
- Open ports 80, 443, and 8787 on the Proxmox firewall and any upstream
  router/firewall.
- Port 8787 only needs to be reachable from where you run the CLI. Keep it off
  the public internet if possible; v0 has no authentication.

## 7. Deploy an app

From your app directory:

```bash
export INFRASTACK_API_URL=http://your-proxmox-container-ip:8787
npx infrastack deploy
```

The CLI prints a URL like `https://my-app.yourdomain.com`.

## Updating the backend

```bash
cd /root/infrastack
git pull
docker compose pull
docker compose up -d
```

## Optional: manual systemd setup

If you prefer not to use Docker Compose, copy the service files and start them
manually:

```bash
cp /root/infrastack/scripts/systemd/infrastack-*.service /etc/systemd/system/
nano /etc/systemd/system/infrastack-worker.service  # set INFRASTACK_DOMAIN_SUFFIX
systemctl daemon-reload
systemctl enable --now infrastack-backend infrastack-worker infrastack-caddy
```

## Docker in LXC notes

If you use an unprivileged container, you need to allow cgroup access for
Docker. The easiest path for v0 is a privileged container. If you want
unprivileged, map host IDs and enable nesting/features in the container options.
