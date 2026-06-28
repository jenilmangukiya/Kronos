import { FastifyInstance } from "fastify";

import { config } from "@kronos/config";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "kronos-api",
      environment: config.app.env,
      timestamp: new Date().toISOString(),
    };
  });
}
