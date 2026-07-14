import WebSocket from "ws";

import { config } from "@kronos/config";

import { decodeAngelTick } from "./angel-tick.decoder.js";
import { liveTickStore } from "./live-tick.store.js";
import type { AngelSubscribeToken } from "./types.js";

interface AngelWebSocketClientParams {
  brokerAccountId: string;
  apiKey: string;
  clientCode: string;
  accessToken: string;
  feedToken: string;
}

export class AngelWebSocketClient {
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectPromise: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isClosingDeliberately = false;
  private subscribedTokens: AngelSubscribeToken[] = [];

  constructor(private readonly params: AngelWebSocketClientParams) {}

  updateCredentials(credentials: Partial<AngelWebSocketClientParams>) {
    Object.assign(this.params, credentials);
    console.log("[Angel WS] Updated credentials for clientCode:", this.params.clientCode);
  }

  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.connectPromise = null;

        reject(new Error("Angel WebSocket connection timeout"));
      }, 15000);

      this.ws = new WebSocket(config.angel.wsUrl, {
        headers: {
          Authorization: `Bearer ${this.params.accessToken}`,
          "x-api-key": this.params.apiKey,
          "x-client-code": this.params.clientCode,
          "x-feed-token": this.params.feedToken,
        },
      });

      this.ws.once("open", () => {
        clearTimeout(timeout);

        console.log("[Angel WS] Connected");
        this.reconnectAttempts = 0;
        this.isClosingDeliberately = false;

        this.startHeartbeat();
        resolve();
      });

      this.ws.on("message", (data) => {
        if (typeof data === "string") {
          console.log("[Angel WS] Message:", data);
          return;
        }

        const buffer = Buffer.isBuffer(data)
          ? data
          : Buffer.from(data as ArrayBuffer);

        const tick = decodeAngelTick(buffer);

        if (tick) {
          liveTickStore.setTick(this.params.brokerAccountId, tick);
        }
      });

      this.ws.once("error", (error) => {
        clearTimeout(timeout);

        console.error("[Angel WS] Error:", error.message);

        this.stopHeartbeat();
        this.connectPromise = null;

        reject(error);
      });

      this.ws.on("close", (code, reason) => {
        clearTimeout(timeout);

        console.log("[Angel WS] Closed:", code, reason.toString());

        this.stopHeartbeat();
        this.ws = null;
        this.connectPromise = null;

        if (!this.isClosingDeliberately) {
          this.triggerReconnect();
        }
      });
    });

    return this.connectPromise;
  }

  private triggerReconnect() {
    if (this.isClosingDeliberately) return;
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`[Angel WS] Reconnection attempt ${this.reconnectAttempts} in ${delay}ms...`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
        console.log("[Angel WS] Reconnected successfully. Restoring subscriptions...");
        if (this.subscribedTokens.length > 0) {
          this.subscribe(this.subscribedTokens);
        }
      } catch (err: any) {
        console.error(`[Angel WS] Reconnection attempt failed: ${err.message}`);
        this.triggerReconnect();
      }
    }, delay);
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  subscribe(tokens: AngelSubscribeToken[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Angel WebSocket is not connected");
    }

    // Keep track of subscribed tokens to recover them on reconnect
    for (const group of tokens) {
      const existing = this.subscribedTokens.find((g) => g.exchangeType === group.exchangeType);
      if (existing) {
        existing.tokens = Array.from(new Set([...existing.tokens, ...group.tokens]));
      } else {
        this.subscribedTokens.push({
          exchangeType: group.exchangeType,
          tokens: [...group.tokens],
        });
      }
    }

    const message = {
      correlationID: `kronos-${Date.now()}`,
      action: 1,
      params: {
        mode: 1,
        tokenList: tokens,
      },
    };

    this.ws.send(JSON.stringify(message));

    console.log("[Angel WS] Subscribed:", JSON.stringify(message));
  }

  unsubscribe(tokens: AngelSubscribeToken[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Angel WebSocket is not connected");
    }

    // Keep track of unsubscribed tokens to keep subscribed list accurate
    for (const group of tokens) {
      const existing = this.subscribedTokens.find((g) => g.exchangeType === group.exchangeType);
      if (existing) {
        existing.tokens = existing.tokens.filter((t) => !group.tokens.includes(t));
      }
    }
    this.subscribedTokens = this.subscribedTokens.filter((g) => g.tokens.length > 0);

    const message = {
      correlationID: `kronos-${Date.now()}`,
      action: 0,
      params: {
        mode: 1,
        tokenList: tokens,
      },
    };

    this.ws.send(JSON.stringify(message));

    console.log("[Angel WS] Unsubscribed:", JSON.stringify(message));
  }

  close() {
    this.isClosingDeliberately = true;
    this.reconnectAttempts = 0;
    this.subscribedTokens = [];
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectPromise = null;
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send("ping");
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
