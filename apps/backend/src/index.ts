import { serve } from "@hono/node-server"
import { Hono } from "hono"
import apps from "./routes/apps.js"
import deploys from "./routes/deploys.js"
import domains from "./routes/domains.js"
import health from "./routes/health.js"

const app = new Hono()

app.route("/v1/apps", apps)
app.route("/v1/deploys", deploys)
app.route("/v1/domains", domains)
app.route("/health", health)

const port = Number(process.env.PORT ?? "8787")

serve({
  fetch: app.fetch,
  port,
})

console.log(`Infrastack control plane running on http://localhost:${port}`)
