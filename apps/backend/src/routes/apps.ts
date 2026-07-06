import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { Hono } from "hono"
import { z } from "zod"
import { createApp, createDeploy, getAppBySlug, listDeploys } from "../db.js"

const appSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  config: z.unknown(),
})

const apps = new Hono()

apps.post("/", async (c) => {
  const body = await c.req.json()
  const parsed = appSchema.parse(body) as {
    name: string
    slug: string
    config: unknown
  }

  const existing = getAppBySlug(parsed.slug)
  if (existing) {
    return c.json(existing, 200)
  }

  const app = createApp(parsed)
  return c.json(app, 201)
})

apps.get("/:slug/deploys", (c) => {
  const slug = c.req.param("slug")
  const app = getAppBySlug(slug)
  if (!app) return c.json({ error: "App not found" }, 404)
  return c.json(listDeploys(app.id))
})

apps.post("/:slug/deploys", async (c) => {
  const slug = c.req.param("slug")
  const app = getAppBySlug(slug)
  if (!app) return c.json({ error: "App not found" }, 404)

  const body = await c.req.parseBody({ all: true })
  const file = body.context
  if (!(file instanceof File)) {
    return c.json({ error: "Missing context file" }, 400)
  }

  const deployId = createDeploy(app.id)

  const dataDir = process.env.INFRASTACK_DATA_DIR
    ? resolve(process.env.INFRASTACK_DATA_DIR)
    : resolve("data")
  const contextPath = resolve(dataDir, "contexts", `${deployId}.tar.gz`)
  await mkdir(dirname(contextPath), { recursive: true })
  await writeFile(contextPath, Buffer.from(await file.arrayBuffer()))

  const { getDeploy } = await import("../db.js")
  const deploy = getDeploy(deployId)
  return c.json(deploy, 202)
})

export default apps
