import { FastifyInstance } from "fastify";

import { healthRoutes } from "./health/routes.js";

export async function registerModules(app: FastifyInstance) {
  await app.register(healthRoutes);
}
