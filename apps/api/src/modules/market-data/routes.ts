import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { MarketDataController } from "./controller.js";
import { MarketDataService } from "./service.js";
import {
  anyResponseSchema,
  candlesQuerySchema,
  futureExpiriesQuerySchema,
  futuresQuerySchema,
  instrumentSearchQuerySchema,
  liveLatestQuerySchema,
  liveManyLatestQuerySchema,
  liveStartQuerySchema,
  liveStatusQuerySchema,
  liveStopQuerySchema,
  liveSubscribeBodySchema,
  ltpQuerySchema,
  optionChainQuerySchema,
  optionExpiriesQuerySchema,
  optionGreeksQuerySchema,
  quoteQuerySchema,
} from "./schemas.js";
import { AngelWebSocketClient } from "./live/angel-websocket.client.js";
import z from "zod";
import { liveTickStore } from "./live/live-tick.store.js";
import { liveMarketDataService } from "./live/live-market-data.service.js";

export async function marketDataRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  const marketDataService = new MarketDataService(app.db);
  const marketDataController = new MarketDataController(marketDataService);

  app.addHook("onClose", async () => {
    app.log.info("[Market Data] onClose hook triggered, closing all active WebSocket sessions");
    liveMarketDataService.closeAll();
  });

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

  typedApp.get(
    "/market-data/option-greeks",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Get option Greeks",
        security: [{ bearerAuth: [] }],
        querystring: optionGreeksQuerySchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return marketDataController.getOptionGreeks(
        request.user?.id,
        request.query,
      );
    },
  );

  typedApp.post(
    "/market-data/live/start",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Start live market data WebSocket",
        security: [{ bearerAuth: [] }],
        querystring: liveStartQuerySchema,
        response: { 200: anyResponseSchema },
      },
    },
    async (request) => {
      if (!request.user?.id) {
        throw new Error("Unauthorized");
      }

      return liveMarketDataService.start(
        app,
        request.user.id,
        request.query.brokerAccountId,
      );
    },
  );

  typedApp.post(
    "/market-data/live/subscribe",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Subscribe live market data tokens",
        security: [{ bearerAuth: [] }],
        body: liveSubscribeBodySchema,
        response: { 200: anyResponseSchema },
      },
    },
    async (request) => {
      if (!request.user?.id) {
        throw new Error("Unauthorized");
      }

      return liveMarketDataService.subscribe(
        request.user.id,
        request.body.brokerAccountId,
        request.body.tokens,
      );
    },
  );
  typedApp.post(
    "/market-data/live/unsubscribe",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Unsubscribe live market data tokens",
        security: [{ bearerAuth: [] }],
        body: liveSubscribeBodySchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      if (!request.user?.id) {
        throw new Error("Unauthorized");
      }

      return liveMarketDataService.unsubscribe(
        request.user.id,
        request.body.brokerAccountId,
        request.body.tokens,
      );
    },
  );

  typedApp.get(
    "/market-data/live/latest",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Get latest live tick",
        security: [{ bearerAuth: [] }],
        querystring: liveLatestQuerySchema,
        response: { 200: anyResponseSchema },
      },
    },
    async (request) => {
      if (!request.user?.id) {
        throw new Error("Unauthorized");
      }

      return liveMarketDataService.getLatest(
        request.user.id,
        request.query.brokerAccountId,
        request.query.token,
      );
    },
  );

  typedApp.get(
    "/market-data/live/status",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Get live market data status",
        security: [{ bearerAuth: [] }],
        querystring: liveStatusQuerySchema,
        response: { 200: anyResponseSchema },
      },
    },
    async (request) => {
      if (!request.user?.id) {
        throw new Error("Unauthorized");
      }

      return liveMarketDataService.getStatus(
        request.user.id,
        request.query.brokerAccountId,
      );
    },
  );

  typedApp.post(
    "/market-data/live/stop",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Stop live market data WebSocket",
        security: [{ bearerAuth: [] }],
        querystring: liveStopQuerySchema,
        response: { 200: anyResponseSchema },
      },
    },
    async (request) => {
      if (!request.user?.id) {
        throw new Error("Unauthorized");
      }

      return liveMarketDataService.stop(
        request.user.id,
        request.query.brokerAccountId,
      );
    },
  );

  typedApp.get(
    "/market-data/live/latest-many",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Get latest live ticks",
        security: [{ bearerAuth: [] }],
        querystring: liveManyLatestQuerySchema,
        response: { 200: anyResponseSchema },
      },
    },
    async (request) => {
      if (!request.user?.id) {
        throw new Error("Unauthorized");
      }

      const tokens = request.query.tokens
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);

      return liveMarketDataService.getManyLatest(
        request.user.id,
        request.query.brokerAccountId,
        tokens,
      );
    },
  );

  typedApp.get(
    "/market-data/future-expiries",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Get future expiries",
        security: [{ bearerAuth: [] }],
        querystring: futureExpiriesQuerySchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return marketDataController.getFutureExpiries(
        request.user?.id,
        request.query,
      );
    },
  );

  typedApp.get(
    "/market-data/futures",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Market Data"],
        summary: "Get futures contracts with quote data",
        security: [{ bearerAuth: [] }],
        querystring: futuresQuerySchema,
        response: {
          200: anyResponseSchema,
        },
      },
    },
    async (request) => {
      return marketDataController.getFutures(request.user?.id, request.query);
    },
  );
}
