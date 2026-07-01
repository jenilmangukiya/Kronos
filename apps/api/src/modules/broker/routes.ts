import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { BrokerController } from "./controller.js";
import { BrokerService } from "./service.js";
import {
  connectBrokerBodySchema,
  connectBrokerResponseSchema,
  getMyBrokersResponseSchema,
  brokerIdParamSchema,
  disconnectResponseSchema,
  createBrokerSessionBodySchema,
  createBrokerSessionResponseSchema,
  getProfileResponseSchema,
  getFundsResponseSchema,
  getHoldingsResponseSchema,
  getPositionsResponseSchema,
} from "./schemas.js";

export async function brokerRoutes(app: FastifyInstance) {
  const brokerService = new BrokerService(app.db);
  const brokerController = new BrokerController(brokerService);
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    "/broker/connect",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Broker"],
        summary: "Connect a broker account",
        security: [{ bearerAuth: [] }],
        body: connectBrokerBodySchema,
        response: {
          200: connectBrokerResponseSchema,
        },
      },
    },
    async (request) => {
      return brokerController.connect(request.user?.id, request.body);
    },
  );

  typedApp.get(
    "/broker",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Broker"],
        summary: "Get connected broker accounts",
        security: [{ bearerAuth: [] }],
        response: {
          200: getMyBrokersResponseSchema,
        },
      },
    },
    async (request) => {
      return brokerController.getMyBrokers(request.user?.id);
    },
  );

  typedApp.delete(
    "/broker/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Broker"],
        summary: "Disconnect a broker account",
        security: [{ bearerAuth: [] }],
        params: brokerIdParamSchema,
        response: {
          200: disconnectResponseSchema,
        },
      },
    },
    async (request) => {
      return brokerController.disconnect(request.user?.id, request.params.id);
    },
  );

  typedApp.post(
    "/broker/:id/session",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Broker"],
        summary: "Create a session for a broker account",
        security: [{ bearerAuth: [] }],
        params: brokerIdParamSchema,
        body: createBrokerSessionBodySchema,
        response: {
          200: createBrokerSessionResponseSchema,
        },
      },
    },
    async (request) => {
      return brokerController.createSession(
        request.user?.id,
        request.params.id,
        request.body,
      );
    },
  );

  typedApp.get(
    "/broker/:id/profile",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Broker"],
        summary: "Get broker account profile details",
        security: [{ bearerAuth: [] }],
        params: brokerIdParamSchema,
        response: {
          200: getProfileResponseSchema,
        },
      },
    },
    async (request) => {
      return brokerController.getProfile(request.user?.id, request.params.id);
    },
  );

  typedApp.get(
    "/broker/:id/funds",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Broker"],
        summary: "Get broker account funds and limits",
        security: [{ bearerAuth: [] }],
        params: brokerIdParamSchema,
        response: {
          200: getFundsResponseSchema,
        },
      },
    },
    async (request) => {
      return brokerController.getFunds(request.user?.id, request.params.id);
    },
  );

  typedApp.get(
    "/broker/:id/holdings",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Broker"],
        summary: "Get broker account stock holdings",
        security: [{ bearerAuth: [] }],
        params: brokerIdParamSchema,
        response: {
          200: getHoldingsResponseSchema,
        },
      },
    },
    async (request) => {
      return brokerController.getHoldings(request.user?.id, request.params.id);
    },
  );

  typedApp.get(
    "/broker/:id/positions",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Broker"],
        summary: "Get broker account active positions",
        security: [{ bearerAuth: [] }],
        params: brokerIdParamSchema,
        response: {
          200: getPositionsResponseSchema,
        },
      },
    },
    async (request) => {
      return brokerController.getPositions(request.user?.id, request.params.id);
    },
  );
}
