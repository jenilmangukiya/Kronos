import type { FastifyInstance } from "fastify";

import { AppError } from "../../../errors/app-error.js";
import { AngelWebSocketClient } from "./angel-websocket.client.js";
import { liveTickStore } from "./live-tick.store.js";
import type { AngelSubscribeToken } from "./types.js";

interface LiveClientSession {
  userId: string;
  brokerAccountId: string;
  client: AngelWebSocketClient;
  subscribedTokens: Set<string>;
  lastActivityAt: number;
}

class LiveMarketDataService {
  private readonly sessions = new Map<string, LiveClientSession>();

  private readonly inactiveTimeoutMs = 30 * 60 * 1000;

  async start(app: FastifyInstance, userId: string, brokerAccountId: string) {
    const existingSession = this.sessions.get(brokerAccountId);

    if (existingSession?.client.isConnected()) {
      this.touch(brokerAccountId);

      return {
        success: true,
        message: "Angel WebSocket already connected",
        brokerAccountId,
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

    const client = new AngelWebSocketClient({
      brokerAccountId: brokerAccount.id,
      apiKey: brokerAccount.apiKey,
      clientCode: brokerAccount.clientId,
      accessToken: brokerAccount.accessToken,
      feedToken: brokerAccount.feedToken,
    });

    this.sessions.set(brokerAccountId, {
      userId,
      brokerAccountId,
      client,
      subscribedTokens: new Set<string>(),
      lastActivityAt: Date.now(),
    });

    client.connect();

    return {
      success: true,
      message: "Angel WebSocket connecting",
      brokerAccountId,
    };
  }

  subscribe(
    userId: string,
    brokerAccountId: string,
    tokens: AngelSubscribeToken[],
  ) {
    const session = this.getUserSession(userId, brokerAccountId);

    session.client.subscribe(tokens);

    for (const group of tokens) {
      for (const token of group.tokens) {
        session.subscribedTokens.add(`${group.exchangeType}:${token}`);
      }
    }

    this.touch(brokerAccountId);

    return {
      success: true,
      brokerAccountId,
      subscribed: Array.from(session.subscribedTokens),
    };
  }

  unsubscribe(
    userId: string,
    brokerAccountId: string,
    tokens: AngelSubscribeToken[],
  ) {
    const session = this.getUserSession(userId, brokerAccountId);

    session.client.unsubscribe(tokens);

    for (const group of tokens) {
      for (const token of group.tokens) {
        session.subscribedTokens.delete(`${group.exchangeType}:${token}`);
      }
    }

    this.touch(brokerAccountId);

    return {
      success: true,
      brokerAccountId,
      subscribed: Array.from(session.subscribedTokens),
    };
  }

  getLatest(userId: string, brokerAccountId: string, token: string) {
    this.getUserSession(userId, brokerAccountId);
    this.touch(brokerAccountId);

    return {
      brokerAccountId,
      token,
      tick: liveTickStore.getTick(brokerAccountId, token),
    };
  }

  getManyLatest(userId: string, brokerAccountId: string, tokens: string[]) {
    this.getUserSession(userId, brokerAccountId);
    this.touch(brokerAccountId);

    return {
      brokerAccountId,
      ticks: liveTickStore.getMany(brokerAccountId, tokens),
    };
  }

  getStatus(userId: string, brokerAccountId: string) {
    const session = this.getUserSession(userId, brokerAccountId);

    this.touch(brokerAccountId);

    return {
      connected: session.client.isConnected(),
      brokerAccountId,
      subscribed: Array.from(session.subscribedTokens),
      lastActivityAt: new Date(session.lastActivityAt).toISOString(),
    };
  }

  stop(userId: string, brokerAccountId: string) {
    const session = this.getUserSession(userId, brokerAccountId);

    session.client.close();
    this.sessions.delete(brokerAccountId);
    liveTickStore.clearBroker(brokerAccountId);

    return {
      success: true,
      message: "Angel WebSocket stopped",
      brokerAccountId,
    };
  }

  cleanupInactiveSessions() {
    const now = Date.now();

    for (const [brokerAccountId, session] of this.sessions.entries()) {
      const inactiveForMs = now - session.lastActivityAt;

      if (inactiveForMs >= this.inactiveTimeoutMs) {
        session.client.close();
        this.sessions.delete(brokerAccountId);
        liveTickStore.clearBroker(brokerAccountId);

        console.log(
          `[Live Market Data] Cleaned inactive session: ${brokerAccountId}`,
        );
      }
    }
  }

  getAllStatus() {
    return {
      activeSessions: this.sessions.size,
      sessions: Array.from(this.sessions.values()).map((session) => ({
        brokerAccountId: session.brokerAccountId,
        connected: session.client.isConnected(),
        subscribed: Array.from(session.subscribedTokens),
        lastActivityAt: new Date(session.lastActivityAt).toISOString(),
      })),
    };
  }

  private getUserSession(userId: string, brokerAccountId: string) {
    const session = this.sessions.get(brokerAccountId);

    if (!session) {
      throw new AppError(
        "Live market data is not connected",
        400,
        "LIVE_MARKET_DATA_NOT_CONNECTED",
      );
    }

    if (session.userId !== userId) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    if (!session.client.isConnected()) {
      throw new AppError(
        "Live market data is disconnected",
        400,
        "LIVE_MARKET_DATA_DISCONNECTED",
      );
    }

    return session;
  }

  private touch(brokerAccountId: string) {
    const session = this.sessions.get(brokerAccountId);

    if (session) {
      session.lastActivityAt = Date.now();
    }
  }
}

export const liveMarketDataService = new LiveMarketDataService();
