import { existsSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { createJiti } from "jiti"
import * as tar from "tar"
import type { InfrastackConfig } from "./config.js"

const CONFIG_NAMES = [
  "infrastack.config.ts",
  "infrastack.config.mjs",
  "infrastack.config.js",
]

const EXCLUDE_PATTERNS = [
  /^node_modules\//,
  /^\.git\//,
  /^dist\//,
  /^\.turbo\//,
  /^\.env/,
  /\.tsbuildinfo$/,
  /^\.next\//,
  /^coverage\//,
  /^\.infrastack\//,
  /^build\//,
  /^out\//,
]

export function findConfig(cwd: string): string {
  for (const name of CONFIG_NAMES) {
    const path = resolve(cwd, name)
    if (existsSync(path)) return path
  }
  throw new Error(
    `No infrastack config found in ${cwd}. Run \`npx infrastack init\`.`
  )
}

export async function loadConfig(path: string): Promise<InfrastackConfig> {
  const jiti = createJiti(import.meta.url)
  const mod = (await jiti.import(path)) as { default?: InfrastackConfig }
  const config = mod.default ?? (mod as unknown as InfrastackConfig)
  if (!config || typeof config !== "object") {
    throw new Error(`Config file ${path} must export a default config object.`)
  }
  return config as InfrastackConfig
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function getApiUrl(flags: { api?: string }): string {
  return flags.api ?? process.env.INFRASTACK_API_URL ?? "http://localhost:8787"
}

export async function createContextTarball(
  cwd: string,
  outPath: string
): Promise<void> {
  await mkdir(dirname(outPath), { recursive: true })
  await tar.create(
    {
      gzip: true,
      file: outPath,
      cwd,
      filter: (path: string) =>
        !EXCLUDE_PATTERNS.some((pattern) => pattern.test(path)),
    },
    ["."]
  )
}

export async function writeInitialConfig(cwd: string): Promise<void> {
  const path = resolve(cwd, "infrastack.config.mjs")
  const content = `import { defineConfig, service } from "infrastack";

export default defineConfig({
  name: "my-app",
  target: "managed",
  services: [
    service("web", {
      port: 3000,
      healthcheck: {
        path: "/health",
      },
    }),
  ],
});
`
  await writeFile(path, content)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
