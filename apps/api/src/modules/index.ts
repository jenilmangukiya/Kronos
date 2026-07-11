import { FastifyInstance } from "fastify";

import { authRoutes } from "./auth/index.js";
import { healthRoutes } from "./health/routes.js";
import { usersRoutes } from "./users/routes.js";
import { brokerRoutes } from "./broker/routes.js";
import { marketDataRoutes } from "./market-data/routes.js";
import { paperTradingRoutes } from "./paper-trading/routes.js";
import { strategyRoutes } from "./strategies/routes.js";
import { realtimeRoutes } from "./realtime/routes.js";
import { replayRoutes } from "./market-replay/replay.controller.js";
import { StrategyRunnerService } from "./strategies/runner/strategy-runner.service.js";

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

  // Strategies
  await app.register(strategyRoutes);

  // Realtime
  await app.register(realtimeRoutes);

  // Market Replay
  await app.register(replayRoutes);

  const strategyRunnerService = new StrategyRunnerService(app);

  strategyRunnerService.start();

  app.addHook("onClose", async () => {
    strategyRunnerService.stop();
  });
}

