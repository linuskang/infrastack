import { randomUUID } from "node:crypto"
import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import Database from "better-sqlite3"

const dataDir = process.env.INFRASTACK_DATA_DIR
  ? resolve(process.env.INFRASTACK_DATA_DIR)
  : resolve("data")

mkdirSync(dataDir, { recursive: true })

const db = new Database(resolve(dataDir, "infrastack.db"))
db.pragma("journal_mode = WAL")

db.exec(`
  CREATE TABLE IF NOT EXISTS apps (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    config_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS deploys (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES apps(id),
    status TEXT NOT NULL,
    url TEXT,
    image_tag TEXT,
    container_id TEXT,
    host_port TEXT,
    build_log TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_deploys_app_id ON deploys(app_id);
  CREATE INDEX IF NOT EXISTS idx_deploys_status ON deploys(status);
`)

export interface App {
  id: string
  name: string
  slug: string
  config: unknown
  createdAt: string
}

export interface Deploy {
  id: string
  appId: string
  status: "queued" | "building" | "running" | "ready" | "failed"
  url?: string
  imageTag?: string
  containerId?: string
  hostPort?: string
  buildLog?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

interface AppRow {
  id: string
  name: string
  slug: string
  config_json: string
  created_at: string
}

interface DeployRow {
  id: string
  app_id: string
  status: string
  url: string | null
  image_tag: string | null
  container_id: string | null
  host_port: string | null
  build_log: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

function rowToApp(row: AppRow): App {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    config: JSON.parse(row.config_json) as unknown,
    createdAt: row.created_at,
  }
}

function rowToDeploy(row: DeployRow): Deploy {
  return {
    id: row.id,
    appId: row.app_id,
    status: row.status as Deploy["status"],
    url: row.url ?? undefined,
    imageTag: row.image_tag ?? undefined,
    containerId: row.container_id ?? undefined,
    hostPort: row.host_port ?? undefined,
    buildLog: row.build_log ?? undefined,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createApp(input: {
  name: string
  slug: string
  config: unknown
}): App {
  const id = randomUUID()
  const stmt = db.prepare(
    "INSERT INTO apps (id, name, slug, config_json) VALUES (?, ?, ?, ?)"
  )
  stmt.run(id, input.name, input.slug, JSON.stringify(input.config))
  const app = getAppById(id)
  if (!app) throw new Error("Failed to create app")
  return app
}

export function getAppById(id: string): App | null {
  const row = db
    .prepare("SELECT * FROM apps WHERE id = ?")
    .get(id) as AppRow | undefined
  return row ? rowToApp(row) : null
}

export function getAppBySlug(slug: string): App | null {
  const row = db
    .prepare("SELECT * FROM apps WHERE slug = ?")
    .get(slug) as AppRow | undefined
  return row ? rowToApp(row) : null
}

export function createDeploy(appId: string): string {
  const id = randomUUID()
  const stmt = db.prepare(
    "INSERT INTO deploys (id, app_id, status) VALUES (?, ?, ?)"
  )
  stmt.run(id, appId, "queued")
  return id
}

export function getDeploy(id: string): Deploy | null {
  const row = db
    .prepare("SELECT * FROM deploys WHERE id = ?")
    .get(id) as DeployRow | undefined
  return row ? rowToDeploy(row) : null
}

export function listDeploys(appId: string): Deploy[] {
  const rows = db
    .prepare("SELECT * FROM deploys WHERE app_id = ? ORDER BY created_at DESC")
    .all(appId) as DeployRow[]
  return rows.map(rowToDeploy)
}

export function listReadyDeploys(): Deploy[] {
  const rows = db
    .prepare(
      "SELECT * FROM deploys WHERE status = ? ORDER BY created_at DESC"
    )
    .all("ready") as DeployRow[]
  return rows.map(rowToDeploy)
}

export function listQueuedDeploys(limit = 10): Deploy[] {
  const rows = db
    .prepare(
      "SELECT * FROM deploys WHERE status = ? ORDER BY created_at ASC LIMIT ?"
    )
    .all("queued", limit) as DeployRow[]
  return rows.map(rowToDeploy)
}

export function isDomainAllowed(host: string): boolean {
  const expected = `https://${host}`
  const row = db
    .prepare("SELECT 1 FROM deploys WHERE status = ? AND url = ?")
    .get("ready", expected) as { 1: number } | undefined
  return Boolean(row)
}

export function updateDeploy(
  id: string,
  fields: Partial<Deploy>
): Deploy | null {
  const sets: string[] = []
  const values: (string | null | undefined)[] = []

  if (fields.status !== undefined) {
    sets.push("status = ?")
    values.push(fields.status)
  }
  if (fields.url !== undefined) {
    sets.push("url = ?")
    values.push(fields.url ?? null)
  }
  if (fields.imageTag !== undefined) {
    sets.push("image_tag = ?")
    values.push(fields.imageTag ?? null)
  }
  if (fields.containerId !== undefined) {
    sets.push("container_id = ?")
    values.push(fields.containerId ?? null)
  }
  if (fields.hostPort !== undefined) {
    sets.push("host_port = ?")
    values.push(fields.hostPort ?? null)
  }
  if (fields.buildLog !== undefined) {
    sets.push("build_log = ?")
    values.push(fields.buildLog ?? null)
  }
  if (fields.errorMessage !== undefined) {
    sets.push("error_message = ?")
    values.push(fields.errorMessage ?? null)
  }

  if (sets.length === 0) return getDeploy(id)

  sets.push("updated_at = CURRENT_TIMESTAMP")
  values.push(id)

  const stmt = db.prepare(`UPDATE deploys SET ${sets.join(", ")} WHERE id = ?`)
  stmt.run(...values)
  return getDeploy(id)
}
