#!/usr/bin/env node
import { resolve } from "node:path"
import pc from "picocolors"
import { version } from "./index.js"
import { InfrastackClient } from "./sdk.js"
import {
  createContextTarball,
  findConfig,
  getApiUrl,
  loadConfig,
  slugify,
  sleep,
  writeInitialConfig,
} from "./utils.js"

interface Flags {
  api?: string
  json?: boolean
}

function parseFlags(args: string[]): Flags {
  const flags: Flags = {}
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--api" || arg === "-a") {
      flags.api = args[++i]
    } else if (arg === "--json" || arg === "-j") {
      flags.json = true
    }
  }
  return flags
}

function showHelp(): void {
  console.log(`infrastack v${version}`)
  console.log("")
  console.log("Usage: infrastack <command> [options]")
  console.log("")
  console.log("Commands:")
  console.log("  init                  Scaffold infrastack.config.mjs")
  console.log("  deploy                Deploy the current project")
  console.log("  status [deploy-id]    Show deploy status")
  console.log("  logs [deploy-id]      Show deploy logs")
  console.log("  version               Print version")
  console.log("  help                  Show this message")
  console.log("")
  console.log("Options:")
  console.log("  --api <url>           Control plane URL")
  console.log("  --json                Output JSON")
}

async function init(): Promise<void> {
  const cwd = process.cwd()
  try {
    findConfig(cwd)
    console.log(pc.yellow("infrastack.config already exists."))
    return
  } catch {
    // continue to create
  }
  await writeInitialConfig(cwd)
  console.log(pc.green("Created infrastack.config.mjs"))
}

async function deploy(flags: Flags): Promise<void> {
  const cwd = process.cwd()
  const configPath = findConfig(cwd)
  const config = await loadConfig(configPath)
  const slug = slugify(config.name)
  const client = new InfrastackClient(getApiUrl(flags))

  if (!flags.json) {
    console.log(`Deploying ${pc.cyan(config.name)}...`)
  }

  await client.createApp({ name: config.name, slug, config })

  const tarballPath = resolve(cwd, ".infrastack", "context.tar.gz")
  await createContextTarball(cwd, tarballPath)

  const deploy = await client.createDeploy(slug, tarballPath)

  if (flags.json) {
    console.log(JSON.stringify({ deployId: deploy.id, status: deploy.status }))
    return
  }

  console.log(`Deploy ${pc.dim(deploy.id)} ${deploy.status}`)

  while (true) {
    const state = await client.getDeploy(deploy.id)
    if (state.status === "ready") {
      console.log(pc.green(`Deployed to ${state.url}`))
      break
    }
    if (state.status === "failed") {
      console.error(pc.red(`Deploy failed: ${state.errorMessage ?? "unknown"}`))
      if (state.buildLog) {
        console.error(pc.gray(state.buildLog))
      }
      process.exit(1)
    }
    process.stdout.write(".")
    await sleep(2000)
  }
}

async function status(flags: Flags, deployId?: string): Promise<void> {
  const cwd = process.cwd()
  const configPath = findConfig(cwd)
  const config = await loadConfig(configPath)
  const slug = slugify(config.name)
  const client = new InfrastackClient(getApiUrl(flags))

  let deploy
  if (deployId) {
    deploy = await client.getDeploy(deployId)
  } else {
    const deploys = await client.listDeploys(slug)
    deploy = deploys[0]
    if (!deploy) {
      console.log("No deploys found.")
      return
    }
  }

  if (flags.json) {
    console.log(JSON.stringify(deploy))
    return
  }

  console.log(`Status: ${deploy.status}`)
  if (deploy.url) console.log(`URL: ${deploy.url}`)
  if (deploy.errorMessage) console.log(pc.red(`Error: ${deploy.errorMessage}`))
}

async function logs(flags: Flags, deployId?: string): Promise<void> {
  if (!deployId) {
    console.error("Usage: infrastack logs <deploy-id>")
    process.exit(1)
  }
  const client = new InfrastackClient(getApiUrl(flags))
  const text = await client.getDeployLogs(deployId)
  process.stdout.write(text)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0] ?? "help"
  const flags = parseFlags(args)

  switch (command) {
    case "init":
      return init()
    case "deploy":
      return deploy(flags)
    case "status":
      return status(flags, args[1])
    case "logs":
      return logs(flags, args[1])
    case "version":
    case "--version":
    case "-v":
      console.log(version)
      return
    case "help":
    case "--help":
    case "-h":
    default:
      showHelp()
  }
}

main().catch((err) => {
  console.error(pc.red(err instanceof Error ? err.message : String(err)))
  process.exit(1)
})
