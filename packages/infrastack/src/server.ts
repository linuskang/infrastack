import { Hono } from "hono";

export function createServerRouter(): Hono {
  const server = new Hono();

  server.get("/", (c) => {
    return c.json({
      ok: true,
      message: "Infrastack server module",
    });
  });

  server.get("/health", (c) => {
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  });

  return server;
}

export type { Hono };
