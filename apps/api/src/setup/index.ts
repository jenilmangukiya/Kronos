import { FastifyInstance } from "fastify";

import { setupErrorHandler } from "./error-handler";
import { setupNotFoundHandler } from "./not-found-handler";

export function setupApp(app: FastifyInstance) {
  setupErrorHandler(app);
  setupNotFoundHandler(app);
}
