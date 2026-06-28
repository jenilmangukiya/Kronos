import { FastifyInstance } from "fastify";

import { healthController } from "./controller.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", healthController);

  app.get("/error", async () => {
    throw new Error("Testing Error Handler");
  });
}
