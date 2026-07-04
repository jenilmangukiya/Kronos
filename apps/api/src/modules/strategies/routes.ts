import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { StrategyController } from "./controller.js";
import { StrategyService } from "./service.js";
import {
  anyResponseSchema,
  createStrategyBodySchema,
  strategyParamsSchema,
  updateStrategyBodySchema,
} from "./schemas.js";

export async function strategyRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  const strategyService = new StrategyService(app.db);
  const strategyController = new StrategyController(strategyService);

  typedApp.post(
    "/strategies",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Strategies"],
        summary: "Create strategy",
        security: [{ bearerAuth: [] }],
        body: createStrategyBodySchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return strategyController.create(request.user?.id, request.body);
    },
  );

  typedApp.get(
    "/strategies",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Strategies"],
        summary: "Get strategies",
        security: [{ bearerAuth: [] }],
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return strategyController.list(request.user?.id);
    },
  );

  typedApp.get(
    "/strategies/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Strategies"],
        summary: "Get strategy by id",
        security: [{ bearerAuth: [] }],
        params: strategyParamsSchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return strategyController.getById(request.user?.id, request.params.id);
    },
  );

  typedApp.patch(
    "/strategies/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Strategies"],
        summary: "Update strategy",
        security: [{ bearerAuth: [] }],
        params: strategyParamsSchema,
        body: updateStrategyBodySchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return strategyController.update(
        request.user?.id,
        request.params.id,
        request.body,
      );
    },
  );

  typedApp.post(
    "/strategies/:id/start",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Strategies"],
        summary: "Start strategy",
        security: [{ bearerAuth: [] }],
        params: strategyParamsSchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return strategyController.start(request.user?.id, request.params.id);
    },
  );

  typedApp.post(
    "/strategies/:id/stop",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Strategies"],
        summary: "Stop strategy",
        security: [{ bearerAuth: [] }],
        params: strategyParamsSchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return strategyController.stop(request.user?.id, request.params.id);
    },
  );

  typedApp.get(
    "/strategies/:id/logs",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Strategies"],
        summary: "Get strategy logs",
        security: [{ bearerAuth: [] }],
        params: strategyParamsSchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return strategyController.getLogs(request.user?.id, request.params.id);
    },
  );
}
