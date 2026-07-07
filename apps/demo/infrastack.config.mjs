import { defineConfig, service } from "infrastack";

export default defineConfig({
  name: "infrastack-demo",
  target: "managed",
  services: [
    service("web", {
      port: 3000,
      build: { dockerfile: "Dockerfile" },
      healthcheck: {
        path: "/health.json",
      },
    }),
  ],
});
