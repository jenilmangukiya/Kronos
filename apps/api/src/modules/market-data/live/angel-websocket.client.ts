import WebSocket from "ws";

import { config } from "@kronos/config";

import { decodeAngelTick } from "./angel-tick.decoder.js";
import { liveTickStore } from "./live-tick.store.js";
import type { AngelSubscribeToken } from "./types.js";

interface AngelWebSocketClientParams {
  apiKey: string;
  clientCode: string;
  accessToken: string;
  feedToken: string;
}

export class AngelWebSocketClient {
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private readonly params: AngelWebSocketClientParams) {}

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(config.angel.wsUrl, {
      headers: {
        Authorization: `Bearer ${this.params.accessToken}`,
        "x-api-key": this.params.apiKey,
        "x-client-code": this.params.clientCode,
        "x-feed-token": this.params.feedToken,
      },
    });

    this.ws.on("open", () => {
      console.log("[Angel WS] Connected");
      this.startHeartbeat();
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
        liveTickStore.setTick(tick);

        // Keep this for testing. Later we can remove it.
        console.log("[Angel WS] Tick:", tick);
      }
    });

    this.ws.on("error", (error) => {
      console.error("[Angel WS] Error:", error.message);
    });

    this.ws.on("close", (code, reason) => {
      console.log("[Angel WS] Closed:", code, reason.toString());
      this.stopHeartbeat();
      this.ws = null;
    });
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  subscribe(tokens: AngelSubscribeToken[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Angel WebSocket is not connected");
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
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
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
