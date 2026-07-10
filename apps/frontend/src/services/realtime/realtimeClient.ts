import { getAccessToken } from "../../utils/storage";
import { ClientRealtimeMessage, ServerRealtimeMessage } from "./realtime.types";
import { config } from "../../config";

const getWsUrl = () => {
  const apiBase = config.apiBaseUrl;
  return `${apiBase.replace(/^http/, "ws")}/realtime/ws`;
};

type MessageHandler = (message: ServerRealtimeMessage) => void;

class RealtimeClient {
  private socket: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private activeStrategySubscriptions = new Set<string>();
  private isConnecting = false;
  private reconnectTimeout: any = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private lastToken: string | null = null;
  private hasAuthError = false;

  connect() {
    if (this.socket || this.isConnecting) {
      console.log("[RealtimeClient] connect ignored: socket exists or is connecting");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      console.warn("[RealtimeClient] No access token found for realtime WebSocket connection");
      return;
    }

    // Reset auth error if token has changed
    if (token !== this.lastToken) {
      this.lastToken = token;
      this.hasAuthError = false;
      this.reconnectAttempts = 0;
    }

    if (this.hasAuthError) {
      console.warn("[RealtimeClient] Connection skipped due to previous authentication error");
      return;
    }

    this.isConnecting = true;
    const wsUrl = `${getWsUrl()}?token=${encodeURIComponent(token)}`;
    console.log("[RealtimeClient] Connecting to:", wsUrl);

    if (config.isDev) {
      console.log("WS connecting");
    }

    try {
      const ws = new WebSocket(wsUrl);
      this.socket = ws;

      ws.onopen = () => {
        if (this.socket !== ws) return;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        console.log("[RealtimeClient] Realtime WebSocket connection established");
        if (config.isDev) {
          console.log("WS connected");
        }
        
        console.log("[RealtimeClient] Active subscriptions to re-send:", Array.from(this.activeStrategySubscriptions));
        // Re-subscribe all active strategies
        this.activeStrategySubscriptions.forEach((strategyId) => {
          this.sendSubscribe(strategyId);
        });
      };

      ws.onmessage = (event) => {
        if (this.socket !== ws) return;
        try {
          const message: ServerRealtimeMessage = JSON.parse(event.data);
          
          if (message.type === "error" && message.message === "Unauthorized") {
            console.warn("[RealtimeClient] Received Unauthorized error from server. Disabling reconnects.");
            this.hasAuthError = true;
            this.disconnect();
            return;
          }

          this.handlers.forEach((handler) => handler(message));
        } catch (error) {
          console.error("[RealtimeClient] Error parsing realtime WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        if (this.socket !== ws) return;
        this.isConnecting = false;
        this.socket = null;
        console.log("[RealtimeClient] Realtime WebSocket connection closed:", event.code, event.reason);
        if (config.isDev) {
          console.log("WS disconnected");
        }

        // Try to reconnect if we still have handlers (meaning components are still subscribed), we haven't exceeded limit, and there is no auth error
        if (this.handlers.size > 0 && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS && !this.hasAuthError) {
          this.reconnectAttempts++;
          console.log(`[RealtimeClient] Scheduling reconnect (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}) in 5 seconds...`);
          if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, 5000);
        } else if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
          console.warn("[RealtimeClient] Max reconnect attempts reached. Stopping reconnection.");
        }
      };

      ws.onerror = (error) => {
        if (this.socket !== ws) return;
        this.isConnecting = false;
        console.error("[RealtimeClient] Realtime WebSocket error:", error);
      };
    } catch (error) {
      this.isConnecting = false;
      console.error("[RealtimeClient] Failed to connect to realtime WebSocket:", error);
    }
  }

  disconnect() {
    console.log("[RealtimeClient] Disconnecting...");
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  send(message: ClientRealtimeMessage) {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message));
      } else {
        console.warn("[RealtimeClient] Cannot send. Socket is not OPEN. ReadyState:", this.socket.readyState);
      }
    } else {
      console.warn("[RealtimeClient] Cannot send. Socket is null.");
    }
  }

  sendSubscribe(strategyId: string) {
    if (config.isDev) {
      console.log("WS subscribed strategy");
    }
    this.send({ type: "subscribe_strategy", strategyId });
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    this.reconnectAttempts = 0;
    this.connect();
  }

  unsubscribe(handler: MessageHandler) {
    this.handlers.delete(handler);
    if (this.handlers.size === 0) {
      this.disconnect();
    }
  }

  subscribeStrategy(strategyId: string) {
    this.activeStrategySubscriptions.add(strategyId);
    if (this.isConnected()) {
      this.sendSubscribe(strategyId);
    }
  }

  unsubscribeStrategy(strategyId: string) {
    this.activeStrategySubscriptions.delete(strategyId);
    if (this.isConnected()) {
      this.send({ type: "unsubscribe_strategy", strategyId });
    }
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

export const realtimeClient = new RealtimeClient();
