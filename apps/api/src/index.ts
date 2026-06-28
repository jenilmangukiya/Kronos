import { config } from "@kronos/config";

import { buildApp } from "./app";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({
      port: config.app.port,
      host: "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error);

    process.exit(1);
  }
}

start();
