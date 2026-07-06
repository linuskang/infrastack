import { exec } from "node:child_process"
import { access, mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { promisify } from "node:util"
import {
  getAppById,
  getDeploy,
  listReadyDeploys,
  updateDeploy,
} from "@infrastack/backend/db"
import { syncRoutes } from "@infrastack/caddy"
import { extract } from "tar"

const execAsync = promisify(exec)

interface ServiceConfig {
  name: string
  port: number
  build?: { dockerfile?: string }
  env?: Record<string, string>
  healthcheck?: { path?: string }
}

interface InfrastackConfig {
  name: string
  services: ServiceConfig[]
}

export async function processDeploy(deployId: string): Promise<void> {
  const deploy = getDeploy(deployId)
  if (!deploy) throw new Error(`Deploy ${deployId} not found`)

  updateDeploy(deployId, { status: "building" })

  const app = getAppById(deploy.appId)
  if (!app) throw new Error(`App ${deploy.appId} not found`)

  const config = app.config as InfrastackConfig
  const service = config.services[0]
  if (!service) throw new Error("No services defined in config")

  const dataDir = process.env.INFRASTACK_DATA_DIR
    ? resolve(process.env.INFRASTACK_DATA_DIR)
    : resolve("data")
  const buildDir = resolve(dataDir, "builds", deployId)
  const contextPath = resolve(dataDir, "contexts", `${deployId}.tar.gz`)

  let buildLog = ""

  try {
    await mkdir(buildDir, { recursive: true })
    await extract({ file: contextPath, cwd: buildDir })

    const imageTag = `infrastack/${app.slug}:${deployId}`
    const dockerfile = service.build?.dockerfile ?? "Dockerfile"
    const dockerfilePath = resolve(buildDir, dockerfile)

    if (await fileExists(dockerfilePath)) {
      const { stdout, stderr } = await execAsync(
        `docker build -t ${imageTag} -f ${dockerfile} .`,
        { cwd: buildDir }
      )
      buildLog = stdout + stderr
    } else {
      const { stdout, stderr } = await execAsync(
        `nixpacks build . --name ${imageTag}`,
        { cwd: buildDir }
      )
      buildLog = stdout + stderr
    }

    updateDeploy(deployId, { status: "running", imageTag, buildLog })

    await stopOldContainers(app.slug, deployId)

    const containerName = `${app.slug}-${deployId}`
    const envFilePath = resolve(buildDir, ".infrastack.env")
    await writeFile(
      envFilePath,
      Object.entries(service.env ?? {})
        .map(([k, v]) => `${k}=${v}`)
        .join("\n")
    )

    const { stdout: runStdout } = await execAsync(
      `docker run -d --name ${containerName} -p 0:${service.port} --env-file .infrastack.env --label infrastack_app=${app.slug} --label infrastack_deploy=${deployId} ${imageTag}`,
      { cwd: buildDir }
    )
    const containerId = runStdout.trim()

    const { stdout: portStdout } = await execAsync(
      `docker port ${containerId} ${service.port}`
    )
    const hostPort = portStdout.trim().split(":").pop()
    if (!hostPort) throw new Error("Could not determine host port")

    const dockerHost = process.env.DOCKER_HOST_NAME ?? "localhost"
    const healthPath = service.healthcheck?.path ?? "/"
    const healthUrl = `http://${dockerHost}:${hostPort}${healthPath}`
    await probeHealth(healthUrl)

    const url = buildDeployUrl(app.slug)
    updateDeploy(deployId, {
      status: "ready",
      url,
      containerId,
      hostPort,
      buildLog,
    })

    await syncCaddyRoutes()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    updateDeploy(deployId, {
      status: "failed",
      errorMessage: message,
      buildLog,
    })
    throw err
  }
}

async function stopOldContainers(
  slug: string,
  excludeDeployId: string
): Promise<void> {
  try {
    const { stdout } = await execAsync(
      `docker ps -q --filter label=infrastack_app=${slug}`
    )
    const ids = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
    for (const id of ids) {
      const { stdout: labelStdout } = await execAsync(
        `docker inspect --format={{.Config.Labels.infrastack_deploy}} ${id}`
      )
      if (labelStdout.trim() === excludeDeployId) continue
      await execAsync(`docker stop ${id}`).catch(() => {})
      await execAsync(`docker rm ${id}`).catch(() => {})
    }
  } catch {
    // ignore cleanup errors
  }
}

async function probeHealth(url: string, retries = 30): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`Health probe failed for ${url}`)
}

async function syncCaddyRoutes(): Promise<void> {
  const dockerHost = process.env.DOCKER_HOST_NAME ?? "localhost"
  const deploys = listReadyDeploys()
  const routes = deploys
    .filter((d) => d.url && d.hostPort)
    .map((d) => ({
      host: new URL(d.url as string).hostname,
      dial: `${dockerHost}:${d.hostPort as string}`,
    }))
  await syncRoutes(routes)
}

function buildDeployUrl(slug: string): string {
  const scheme = process.env.INFRASTACK_URL_SCHEME ?? "https"
  const suffix = process.env.INFRASTACK_DOMAIN_SUFFIX ?? "infrastack.app"
  return `${scheme}://${slug}.${suffix}`
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
