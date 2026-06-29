import { FastifyInstance } from "fastify";

import { healthRoutes } from "./health/routes.js";
import { usersRoutes } from "./users/routes.js";

export async function registerModules(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(usersRoutes);
}
