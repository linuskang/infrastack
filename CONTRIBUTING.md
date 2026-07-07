# Contributing to Infrastack

Thanks for your interest in Infrastack! This document will help you get started.

## Development setup

1. Clone the repository:

    ```bash
    git clone https://github.com/linuskang/infrastack.git
    cd infrastack
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Build all packages:

    ```bash
    npm run build
    ```

4. Run type checks and lint:

    ```bash
    npm run typecheck
    npm run lint
    ```

## Project structure

```
apps/
  backend/        # Hono control plane (SQLite, apps/deploys API)
  worker/         # Builder + runner (Docker, Caddy sync)
  marketing/      # Public marketing site
  demo/           # Example Vite app for deployments
packages/
  infrastack/     # CLI, config DSL, and SDK
  caddy/          # Caddy admin API helper
  eslint-config/  # Shared ESLint config
  typescript-config/  # Shared TypeScript configs
  ui/             # Shared UI components
```

## Workflow

1. Create a branch for your change.
2. Make your change, including tests or docs where appropriate.
3. Run `npm run build`, `npm run typecheck`, and `npm run lint`.
4. Open a pull request against `master`.

## Code style

- TypeScript strict mode is enabled.
- Formatting is handled by Prettier.
- ESLint rules are shared from `@workspace/eslint-config`.

## Reporting issues

Please open an issue on GitHub with a clear description, reproduction steps, and environment details.
