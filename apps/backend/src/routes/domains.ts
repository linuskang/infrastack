import { Hono } from "hono"
import { isDomainAllowed } from "../db.js"

const domains = new Hono()

domains.get("/allowed", (c) => {
  const domain = c.req.query("domain")
  if (!domain) return c.json({ allowed: false }, 400)

  const allowed = isDomainAllowed(domain)
  return c.json({ allowed }, allowed ? 200 : 403)
})

export default domains
