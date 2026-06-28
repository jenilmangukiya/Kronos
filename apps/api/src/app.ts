import Fastify from "fastify";

import { createLogger, loggerOptions } from "@kronos/logger";
import { healthRoutes } from "./routes/health";

export async function buildApp() {
  const app = Fastify({
    logger: loggerOptions,
  });

  await app.register(healthRoutes);

  return app;
}
