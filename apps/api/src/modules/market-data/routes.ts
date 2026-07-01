import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { MarketDataController } from "./controller.js";
import { MarketDataService } from "./service.js";
import {
  anyResponseSchema,
  candlesQuerySchema,
  ltpQuerySchema,
  quoteQuerySchema,
} from "./schemas.js";

export async function marketDataRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  const marketDataService = new MarketDataService(app.db);
  const marketDataController = new MarketDataController(marketDataService);

  typedApp.get(
    "/market-data/ltp",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Get LTP",
        security: [{ bearerAuth: [] }],
        querystring: ltpQuerySchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return marketDataController.getLtp(request.user?.id, request.query);
    },
  );

  typedApp.get(
    "/market-data/quote",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Get full quote",
        security: [{ bearerAuth: [] }],
        querystring: quoteQuerySchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return marketDataController.getQuote(request.user?.id, request.query);
    },
  );

  typedApp.get(
    "/market-data/candles",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Get historical candles",
        security: [{ bearerAuth: [] }],
        querystring: candlesQuerySchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return marketDataController.getCandles(request.user?.id, request.query);
    },
  );
}
