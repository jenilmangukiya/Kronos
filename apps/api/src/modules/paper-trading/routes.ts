import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { PaperTradingController } from "./controller.js";
import { PaperTradingService } from "./service.js";
import {
  anyResponseSchema,
  createPaperOrderBodySchema,
  exitPaperPositionBodySchema,
  exitPaperPositionParamsSchema,
} from "./schemas.js";

export async function paperTradingRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  const paperTradingService = new PaperTradingService(app.db);
  const paperTradingController = new PaperTradingController(
    paperTradingService,
  );

  typedApp.post(
    "/paper-trading/orders",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Paper Trading"],
        summary: "Create paper order",
        security: [{ bearerAuth: [] }],
        body: createPaperOrderBodySchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return paperTradingController.createOrder(request.user?.id, request.body);
    },
  );

  typedApp.get(
    "/paper-trading/orders",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Paper Trading"],
        summary: "Get paper orders",
        security: [{ bearerAuth: [] }],
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return paperTradingController.getOrders(request.user?.id);
    },
  );

  typedApp.get(
    "/paper-trading/positions",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Paper Trading"],
        summary: "Get paper positions",
        security: [{ bearerAuth: [] }],
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return paperTradingController.getPositions(request.user?.id);
    },
  );

  typedApp.post(
    "/paper-trading/positions/:id/exit",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Paper Trading"],
        summary: "Exit paper position",
        security: [{ bearerAuth: [] }],
        params: exitPaperPositionParamsSchema,
        body: exitPaperPositionBodySchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return paperTradingController.exitPosition(
        request.user?.id,
        request.params.id,
        request.body,
      );
    },
  );
}
