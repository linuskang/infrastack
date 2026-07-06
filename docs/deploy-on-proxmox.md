# Deploy the Infrastack backend on Proxmox VE

This guide sets up the Infrastack control plane, worker, and Caddy router inside a Proxmox VE LXC container.

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
git clone <your-repo-url> /opt/infrastack
cd /opt/infrastack
npm install
npx turbo build
```

## 4. Create a data directory

```bash
mkdir -p /var/infrastack/data
```

This holds the SQLite database, uploaded tarballs, and extracted build contexts.

## 5. Configure Caddy

Use this base production config at `/opt/infrastack/packages/caddy/caddy.production.json`:

```json
{
  "admin": { "listen": "localhost:2019" },
  "apps": {
    "http": {
      "servers": {
        "srv0": {
          "listen": [":80", ":443"],
          "routes": [],
          "tls_connection_policies": [{}]
        }
      }
    },
    "tls": {
      "automation": {
        "on_demand": {
          "ask": "http://localhost:8787/v1/domains/allowed"
        }
      }
    }
  }
}
```

Start Caddy:

```bash
caddy run --config /opt/infrastack/packages/caddy/caddy.production.json
```

For local testing without TLS, use the included `packages/caddy/caddy.json`.

## 6. Run the control plane and worker

### With systemd

Create `/etc/systemd/system/infrastack-backend.service`:

```ini
[Unit]
Description=Infrastack control plane
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/infrastack
Environment=INFRASTACK_DATA_DIR=/var/infrastack/data
Environment=PORT=8787
ExecStart=/usr/bin/node /opt/infrastack/apps/backend/dist/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/infrastack-worker.service`:

```ini
[Unit]
Description=Infrastack worker
After=network.target docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/infrastack
Environment=INFRASTACK_DATA_DIR=/var/infrastack/data
Environment=INFRASTACK_URL_SCHEME=https
Environment=INFRASTACK_DOMAIN_SUFFIX=yourdomain.com
ExecStart=/usr/bin/node /opt/infrastack/apps/worker/dist/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Reload and start:

```bash
systemctl daemon-reload
systemctl enable --now infrastack-backend
systemctl enable --now infrastack-worker
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
cd /opt/infrastack
git pull
npm install
npx turbo build
systemctl restart infrastack-backend
systemctl restart infrastack-worker
```

## Docker in LXC notes

If you use an unprivileged container, you need to allow cgroup access for Docker. The easiest path for v0 is a privileged container. If you want unprivileged, map host IDs and enable nesting/features in the container options.
