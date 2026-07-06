import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { createServerRouter } from "infrastack/server"

const app = new Hono()

app.get("/", (c) => {
    return c.json({
        ok: true,
        message: "Hello from Infrastack backend",
        service: "infrastack-backend",
    })
})

app.route("/server", createServerRouter())

const port = 3000

serve({
    fetch: app.fetch,
    port,
})

console.log(`Infrastack backend running on http://localhost:${port}`)
