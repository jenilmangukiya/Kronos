import { FastifyInstance } from "fastify";

import { healthController } from "./controller.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", healthController);
}
