import { defineConfig, service } from "infrastack";

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
