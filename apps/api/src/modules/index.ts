import { FastifyInstance } from "fastify";

import { authRoutes } from "./auth/index.js";
import { healthRoutes } from "./health/routes.js";
import { usersRoutes } from "./users/routes.js";
import { brokerRoutes } from "./broker/routes.js";
import { marketDataRoutes } from "./market-data/routes.js";
import { paperTradingRoutes } from "./paper-trading/routes.js";

export async function registerModules(app: FastifyInstance) {
  // Health
  await app.register(healthRoutes);

  // Auth
  await app.register(authRoutes);

  // Users
  await app.register(usersRoutes);

  // Broker
  await app.register(brokerRoutes);

  // Market Data
  await app.register(marketDataRoutes);

  // Paper Trading
  await app.register(paperTradingRoutes);
}
