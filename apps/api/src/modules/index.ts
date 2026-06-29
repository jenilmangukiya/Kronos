import { FastifyInstance } from "fastify";

import { authRoutes } from "./auth/index.js";
import { healthRoutes } from "./health/routes.js";
import { usersRoutes } from "./users/routes.js";
import { brokerRoutes } from "./broker/routes.js";

export async function registerModules(app: FastifyInstance) {
  // Health
  await app.register(healthRoutes);

  // Auth
  await app.register(authRoutes);

  // Users
  await app.register(usersRoutes);

  // Broker
  await app.register(brokerRoutes);
}
