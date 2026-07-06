# Deploy the Infrastack backend on Proxmox VE

This guide sets up the Infrastack control plane, worker, and Caddy router inside a Proxmox VE LXC container using systemd services.

For a simpler Docker Compose deployment, see [`deploy-with-docker-compose.md`](./deploy-with-docker-compose.md).

## Prerequisites

- Proxmox VE 8+ with a working network
- A Debian/Ubuntu LXC container with:
  - Node.js 20+
  - npm
  - Docker (see Docker in LXC notes below)
  - Caddy 2+
  - (optional) Nixpacks, if you want auto-builds without Dockerfiles

## 1. Create the LXC container

Create a privileged container or an unprivileged container with Docker cgroup access. For v0, a privileged container is simplest:

```bash
pct create 100 local:vztmpl/debian-12-standard_12.x-x_amd64.tar.zst \
  --hostname infrastack \
  --cores 4 \
  --memory 8192 \
  --rootfs local-lvm:32 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp
pct start 100
```

Adjust CPU, memory, disk, and network to your needs.

## 2. Install dependencies inside the container

```bash
pct enter 100

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# Install Caddy
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

# Install Nixpacks (optional)
curl -sSL https://nixpacks.com/install.sh | bash
```

## 3. Clone and build Infrastack

```bash
git clone <your-repo-url> /root/infrastack
cd /root/infrastack
npm install
npx turbo build
```

## 4. Create a data directory

```bash
mkdir -p /var/infrastack/data
```

This holds the SQLite database, uploaded tarballs, and extracted build contexts.

## 5. Configure Caddy

The production Caddy config is already in the repo at `/root/infrastack/packages/caddy/caddy.production.json`. It enables on-demand TLS and asks the control plane which domains are allowed.

Start Caddy:

```bash
caddy run --config /root/infrastack/packages/caddy/caddy.production.json
```

For local testing without TLS, use the included `packages/caddy/caddy.json`.

## 6. Run the control plane and worker

### With systemd

Service files are in the repo at `scripts/systemd/`. Copy them and edit the worker service to set your domain:

```bash
cp /root/infrastack/scripts/systemd/infrastack-*.service /etc/systemd/system/
# Edit INFRASTACK_DOMAIN_SUFFIX in the worker service
nano /etc/systemd/system/infrastack-worker.service
```

Reload and start all three services:

```bash
systemctl daemon-reload
systemctl enable --now infrastack-backend
systemctl enable --now infrastack-worker
systemctl enable --now infrastack-caddy
```

## 7. Network and DNS

- Point a wildcard DNS record `*.yourdomain.com` to the container's IP, or create an A record per app.
- Open ports 80, 443, and 8787 on the Proxmox firewall and any upstream router/firewall.
- Port 8787 only needs to be reachable from where you run the CLI. Keep it off the public internet if possible; v0 has no authentication.

## 8. Deploy an app

From your app directory:

```bash
export INFRASTACK_API_URL=http://your-proxmox-container-ip:8787
npx infrastack deploy
```

The CLI prints a URL like `https://my-app.yourdomain.com`.

## Updating the backend

Pull changes, rebuild, and restart:

```bash
cd /root/infrastack
git pull
npm install
npx turbo build
systemctl restart infrastack-backend
systemctl restart infrastack-worker
```

## Docker in LXC notes

If you use an unprivileged container, you need to allow cgroup access for Docker. The easiest path for v0 is a privileged container. If you want unprivileged, map host IDs and enable nesting/features in the container options.
