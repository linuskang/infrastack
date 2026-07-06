export type Environment = "development" | "staging" | "production"

export interface HealthcheckConfig {
  path?: string
  interval?: string
  timeout?: string
  retries?: number
}

export interface BuildConfig {
  context?: string
  dockerfile?: string
}

export interface ServiceConfig {
  name: string
  build?: BuildConfig
  port: number
  env?: Record<string, string>
  secrets?: string[]
  resources?: {
    cpu?: string
    memory?: string
  }
  healthcheck?: HealthcheckConfig
  scaling?: {
    min?: number
    max?: number
  }
}

export interface InfrastackConfig {
  name: string
  target?: "managed"
  services: ServiceConfig[]
  domains?: string[]
}

export function service(
  name: string,
  config: Omit<ServiceConfig, "name">
): ServiceConfig {
  return { name, ...config }
}

export function defineConfig(config: InfrastackConfig): InfrastackConfig {
  return config
}
