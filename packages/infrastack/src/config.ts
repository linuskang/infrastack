export interface InfrastackConfig {
    project: string
    region?: string
    environment?: "development" | "staging" | "production"
}

export function defineConfig(config: InfrastackConfig): InfrastackConfig {
    return {
        environment: "development",
        ...config,
    }
}

export const defaultConfig = defineConfig({
    project: "infrastack",
})
