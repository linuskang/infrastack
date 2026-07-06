import { exec } from "node:child_process"
import { promisify } from "node:util"
import { Hono } from "hono"
import { getDeploy } from "../db.js"

const execAsync = promisify(exec)

const deploys = new Hono()

deploys.get("/:id", (c) => {
  const deploy = getDeploy(c.req.param("id"))
  if (!deploy) return c.json({ error: "Deploy not found" }, 404)
  return c.json(deploy)
})

deploys.get("/:id/logs", async (c) => {
  const deploy = getDeploy(c.req.param("id"))
  if (!deploy) return c.json({ error: "Deploy not found" }, 404)
  if (!deploy.containerId) {
    return c.json({ error: "Container not running" }, 400)
  }

  try {
    const { stdout } = await execAsync(
      `docker logs --tail 200 ${deploy.containerId}`
    )
    return c.text(stdout)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

export default deploys
