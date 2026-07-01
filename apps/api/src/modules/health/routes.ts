import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { healthController } from "./controller.js";
import { healthResponseSchema } from "./schemas.js";

export async function healthRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Health check",
        response: {
          200: healthResponseSchema,
        },
      },
    },
    healthController,
  );

  typedApp.get("/error", async () => {
    throw new Error("Testing Error Handler");
  });
}
