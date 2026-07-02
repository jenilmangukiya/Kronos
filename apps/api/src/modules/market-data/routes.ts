import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { MarketDataController } from "./controller.js";
import { MarketDataService } from "./service.js";
import {
  anyResponseSchema,
  candlesQuerySchema,
  instrumentSearchQuerySchema,
  ltpQuerySchema,
  optionChainQuerySchema,
  optionExpiriesQuerySchema,
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

  typedApp.get(
    "/market-data/instruments/search",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Search Angel instruments",
        security: [{ bearerAuth: [] }],
        querystring: instrumentSearchQuerySchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return marketDataController.searchInstruments(
        request.user?.id,
        request.query,
      );
    },
  );

  typedApp.post(
    "/market-data/instruments/refresh",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Refresh Angel instrument master cache",
        security: [{ bearerAuth: [] }],
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return marketDataController.refreshInstruments(request.user?.id);
    },
  );

  typedApp.get(
    "/market-data/option-expiries",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Get option expiries",
        security: [{ bearerAuth: [] }],
        querystring: optionExpiriesQuerySchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return marketDataController.getOptionExpiries(
        request.user?.id,
        request.query,
      );
    },
  );

  typedApp.get(
    "/market-data/option-chain",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Get option chain",
        security: [{ bearerAuth: [] }],
        querystring: optionChainQuerySchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return marketDataController.getOptionChain(
        request.user?.id,
        request.query,
      );
    },
  );
}
