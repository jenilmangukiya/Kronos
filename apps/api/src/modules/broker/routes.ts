import type { FastifyInstance } from "fastify";

import { BrokerController } from "./controller.js";
import { BrokerService } from "./service.js";
import type { ConnectBrokerInput, CreateBrokerSessionInput } from "./types.js";

export async function brokerRoutes(app: FastifyInstance) {
  const brokerService = new BrokerService(app.db);
  const brokerController = new BrokerController(brokerService);

  app.post(
    "/broker/connect",
    {
      preHandler: [app.authenticate],
    },
    async (request) => {
      const body = request.body as ConnectBrokerInput;

      return brokerController.connect(request.user?.id, body);
    },
  );

  app.get(
    "/broker",
    {
      preHandler: [app.authenticate],
    },
    async (request) => {
      return brokerController.getMyBrokers(request.user?.id);
    },
  );

  app.delete(
    "/broker/:id",
    {
      preHandler: [app.authenticate],
    },
    async (request) => {
      const params = request.params as { id: string };

      return brokerController.disconnect(request.user?.id, params.id);
    },
  );

  app.post(
    "/broker/:id/session",
    {
      preHandler: [app.authenticate],
    },
    async (request) => {
      const params = request.params as { id: string };
      const body = request.body as CreateBrokerSessionInput;

      return brokerController.createSession(request.user?.id, params.id, body);
    },
  );

  app.get(
    "/broker/:id/profile",
    {
      preHandler: [app.authenticate],
    },
    async (request) => {
      const params = request.params as { id: string };

      return brokerController.getProfile(request.user?.id, params.id);
    },
  );

  app.get(
    "/broker/:id/funds",
    {
      preHandler: [app.authenticate],
    },
    async (request) => {
      const params = request.params as { id: string };

      return brokerController.getFunds(request.user?.id, params.id);
    },
  );

  app.get(
    "/broker/:id/holdings",
    {
      preHandler: [app.authenticate],
    },
    async (request) => {
      const params = request.params as { id: string };

      return brokerController.getHoldings(request.user?.id, params.id);
    },
  );

  app.get(
    "/broker/:id/positions",
    {
      preHandler: [app.authenticate],
    },
    async (request) => {
      const params = request.params as { id: string };

      return brokerController.getPositions(request.user?.id, params.id);
    },
  );
}
