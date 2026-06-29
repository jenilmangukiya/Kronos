import type { FastifyInstance } from "fastify";

import { BrokerController } from "./controller.js";
import { BrokerService } from "./service.js";
import type { ConnectBrokerInput } from "./types.js";

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
}
