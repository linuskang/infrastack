export interface Route {
  host: string
  dial: string
}

export async function syncRoutes(routes: Route[]): Promise<void> {
  const caddyAdmin = process.env.CADDY_ADMIN_URL ?? "http://localhost:2019"
  const config = {
    admin: { listen: "localhost:2019" },
    apps: {
      http: {
        servers: {
          srv0: {
            listen: [":80"],
            routes: routes.map((route) => ({
              match: [{ host: [route.host] }],
              handle: [
                {
                  handler: "reverse_proxy",
                  upstreams: [{ dial: route.dial }],
                },
              ],
            })),
          },
        },
      },
    },
  }

  const res = await fetch(`${caddyAdmin}/config/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Caddy sync failed: ${res.status} ${text}`)
  }
}
