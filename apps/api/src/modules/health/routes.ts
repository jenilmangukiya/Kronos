import { FastifyInstance } from "fastify";

import { healthController } from "./controller.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Health check",
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              service: { type: "string" },
              environment: { type: "string" },
              timestamp: { type: "string" },
            },
          },
        },
      },
    },
    healthController,
  );

  app.get("/error", async () => {
    throw new Error("Testing Error Handler");
  });
}
