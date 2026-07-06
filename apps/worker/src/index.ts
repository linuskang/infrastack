import { listQueuedDeploys } from "@infrastack/backend/db"
import { processDeploy } from "./deploy.js"

const POLL_INTERVAL_MS = 2000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main(): Promise<void> {
  console.log("Infrastack worker started")
  while (true) {
    try {
      const deploys = listQueuedDeploys(1)
      if (deploys.length === 0) {
        await sleep(POLL_INTERVAL_MS)
        continue
      }
      const deploy = deploys[0]!
      console.log(`Processing deploy ${deploy.id}`)
      await processDeploy(deploy.id).catch((err) => {
        console.error(`Deploy ${deploy.id} failed:`, err)
      })
    } catch (err) {
      console.error("Worker error:", err)
      await sleep(POLL_INTERVAL_MS)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
