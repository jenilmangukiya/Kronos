import Fastify from "fastify";

import { loggerOptions } from "@kronos/logger";
import { registerModules } from "./modules";
import { registerPlugins } from "./plugins";

export async function buildApp() {
  const app = Fastify({
    logger: loggerOptions,
  });

  await registerPlugins(app);

  await registerModules(app);

  return app;
}
