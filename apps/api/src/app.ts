import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { loggerOptions } from "@kronos/logger";
import { registerModules } from "./modules";
import { registerPlugins } from "./plugins";
import { setupApp } from "./setup";

export async function buildApp() {
  const app = Fastify({
    logger: loggerOptions,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

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
