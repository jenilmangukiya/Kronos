import type { FastifyInstance } from "fastify";

import { AppError } from "../../../errors/app-error.js";
import { AngelWebSocketClient } from "./angel-websocket.client.js";
import { liveTickStore } from "./live-tick.store.js";
import type { AngelSubscribeToken } from "./types.js";

interface LiveClientSession {
  userId: string;
  brokerAccountId: string;
  client: AngelWebSocketClient;
  subscriptions: Map<string, number>;
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
      subscriptions: new Map<string, number>(),
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

    const tokensToActuallySubscribe: string[] = [];

    for (const group of tokens) {
      for (const token of group.tokens) {
        const key = this.getTokenKey(group.exchangeType, token);
        const currentCount = session.subscriptions.get(key) ?? 0;

        if (currentCount === 0) {
          tokensToActuallySubscribe.push(key);
        }

        session.subscriptions.set(key, currentCount + 1);
      }
    }

    if (tokensToActuallySubscribe.length > 0) {
      session.client.subscribe(
        this.getTokenGroupsFromKeys(tokensToActuallySubscribe),
      );
    }

    this.touch(brokerAccountId);

    return {
      success: true,
      brokerAccountId,
      subscribed: this.getSubscriptionList(session),
    };
  }

  unsubscribe(
    userId: string,
    brokerAccountId: string,
    tokens: AngelSubscribeToken[],
  ) {
    const session = this.getUserSession(userId, brokerAccountId);

    const tokensToActuallyUnsubscribe: string[] = [];

    for (const group of tokens) {
      for (const token of group.tokens) {
        const key = this.getTokenKey(group.exchangeType, token);
        const currentCount = session.subscriptions.get(key) ?? 0;

        if (currentCount <= 1) {
          session.subscriptions.delete(key);
          tokensToActuallyUnsubscribe.push(key);
        } else {
          session.subscriptions.set(key, currentCount - 1);
        }
      }
    }

    if (tokensToActuallyUnsubscribe.length > 0) {
      session.client.unsubscribe(
        this.getTokenGroupsFromKeys(tokensToActuallyUnsubscribe),
      );
    }

    this.touch(brokerAccountId);

    return {
      success: true,
      brokerAccountId,
      subscribed: this.getSubscriptionList(session),
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
      subscribed: this.getSubscriptionList(session),
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
        subscribed: this.getSubscriptionList(session),
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

  private getTokenKey(exchangeType: number, token: string) {
    return `${exchangeType}:${token}`;
  }

  private getTokenGroupsFromKeys(keys: string[]) {
    const grouped = new Map<number, string[]>();

    for (const key of keys) {
      const [exchangeTypeText, token] = key.split(":");

      if (!exchangeTypeText || !token) continue;

      const exchangeType = Number(exchangeTypeText);

      const existing = grouped.get(exchangeType) ?? [];
      existing.push(token);
      grouped.set(exchangeType, existing);
    }

    return Array.from(grouped.entries()).map(([exchangeType, tokens]) => ({
      exchangeType: exchangeType as 1 | 2 | 3 | 4 | 5 | 7 | 13,
      tokens,
    }));
  }

  private getSubscriptionList(session: LiveClientSession) {
    return Array.from(session.subscriptions.entries()).map(
      ([token, count]) => ({
        token,
        count,
      }),
    );
  }
}

export const liveMarketDataService = new LiveMarketDataService();
