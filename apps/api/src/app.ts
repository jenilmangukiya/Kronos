import Fastify from "fastify";

import { loggerOptions } from "@kronos/logger";
import { registerModules } from "./modules";
import { registerPlugins } from "./plugins";
import { setupApp } from "./setup";

export async function buildApp() {
  const app = Fastify({
    logger: loggerOptions,
  });

  setupApp(app);

  await registerPlugins(app);

  await registerModules(app);

  app.get(
    "/profile",
    {
      preHandler: [app.authenticate],
    },
    async (request) => {
      return request.user;
    },
  );

  return app;
}
