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
  buildLog?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export class InfrastackClient {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, init)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Request failed: ${res.status} ${text}`)
    }
    return res.json() as Promise<T>
  }

  async createApp(body: {
    name: string
    slug: string
    config: unknown
  }): Promise<App> {
    return this.request<App>("/v1/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  async createDeploy(slug: string, tarballPath: string): Promise<Deploy> {
    const { readFile } = await import("node:fs/promises")
    const bytes = await readFile(tarballPath)
    const body = new FormData()
    body.set(
      "context",
      new File([bytes], "context.tar.gz", { type: "application/gzip" })
    )
    return this.request<Deploy>(`/v1/apps/${slug}/deploys`, {
      method: "POST",
      body,
    })
  }

  async getDeploy(id: string): Promise<Deploy> {
    return this.request<Deploy>(`/v1/deploys/${id}`)
  }

  async listDeploys(slug: string): Promise<Deploy[]> {
    return this.request<Deploy[]>(`/v1/apps/${slug}/deploys`)
  }

  async getDeployLogs(id: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/v1/deploys/${id}/logs`)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Request failed: ${res.status} ${text}`)
    }
    return res.text()
  }
}
