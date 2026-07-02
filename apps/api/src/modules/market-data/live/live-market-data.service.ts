import type { FastifyInstance } from "fastify";

import { AppError } from "../../../errors/app-error.js";
import { AngelWebSocketClient } from "./angel-websocket.client.js";
import { liveTickStore } from "./live-tick.store.js";
import type { AngelSubscribeToken } from "./types.js";

class LiveMarketDataService {
  private angelClient: AngelWebSocketClient | null = null;
  private brokerAccountId: string | null = null;
  private readonly subscribedTokens = new Set<string>();

  async start(app: FastifyInstance, userId: string, brokerAccountId: string) {
    if (this.angelClient?.isConnected()) {
      return {
        success: true,
        message: "Angel WebSocket already connected",
        brokerAccountId: this.brokerAccountId,
      };
    }

    const brokerAccount = await app.db.brokerAccount.findFirst({
      where: {
        id: brokerAccountId,
        userId,
      },
    });

    if (!brokerAccount) {
      throw new AppError(
        "Broker account not found",
        404,
        "BROKER_ACCOUNT_NOT_FOUND",
      );
    }

    if (brokerAccount.broker !== "ANGEL_ONE") {
      throw new AppError(
        "Only Angel One live market data is supported currently",
        400,
        "LIVE_MARKET_DATA_BROKER_NOT_SUPPORTED",
      );
    }

    if (
      !brokerAccount.apiKey ||
      !brokerAccount.accessToken ||
      !brokerAccount.feedToken
    ) {
      throw new AppError(
        "Broker session is missing",
        400,
        "BROKER_SESSION_MISSING",
      );
    }

    if (
      !brokerAccount.tokenExpiresAt ||
      brokerAccount.tokenExpiresAt <= new Date()
    ) {
      throw new AppError(
        "Broker session expired",
        401,
        "BROKER_SESSION_EXPIRED",
      );
    }

    this.angelClient = new AngelWebSocketClient({
      apiKey: brokerAccount.apiKey,
      clientCode: brokerAccount.clientId,
      accessToken: brokerAccount.accessToken,
      feedToken: brokerAccount.feedToken,
    });

    this.brokerAccountId = brokerAccount.id;
    this.angelClient.connect();

    return {
      success: true,
      message: "Angel WebSocket connecting",
      brokerAccountId: brokerAccount.id,
    };
  }

  subscribe(tokens: AngelSubscribeToken[]) {
    if (!this.angelClient?.isConnected()) {
      throw new AppError(
        "Live market data is not connected",
        400,
        "LIVE_MARKET_DATA_NOT_CONNECTED",
      );
    }

    this.angelClient.subscribe(tokens);

    for (const group of tokens) {
      for (const token of group.tokens) {
        this.subscribedTokens.add(`${group.exchangeType}:${token}`);
      }
    }

    return {
      success: true,
      subscribed: Array.from(this.subscribedTokens),
    };
  }

  unsubscribe(tokens: AngelSubscribeToken[]) {
    if (!this.angelClient?.isConnected()) {
      throw new AppError(
        "Live market data is not connected",
        400,
        "LIVE_MARKET_DATA_NOT_CONNECTED",
      );
    }

    this.angelClient.unsubscribe(tokens);

    for (const group of tokens) {
      for (const token of group.tokens) {
        this.subscribedTokens.delete(`${group.exchangeType}:${token}`);
      }
    }

    return {
      success: true,
      subscribed: Array.from(this.subscribedTokens),
    };
  }

  getLatest(token: string) {
    return {
      token,
      tick: liveTickStore.getTick(token),
    };
  }

  getStatus() {
    return {
      connected: this.angelClient?.isConnected() ?? false,
      brokerAccountId: this.brokerAccountId,
      subscribed: Array.from(this.subscribedTokens),
    };
  }

  stop() {
    this.angelClient?.close();
    this.angelClient = null;
    this.brokerAccountId = null;
    this.subscribedTokens.clear();

    return {
      success: true,
      message: "Angel WebSocket stopped",
    };
  }
}

export const liveMarketDataService = new LiveMarketDataService();
