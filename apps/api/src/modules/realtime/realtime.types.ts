import { WebSocket } from "ws";

export type ClientRealtimeMessage =
  | { type: "ping" }
  | { type: "subscribe_strategy"; strategyId: string }
  | { type: "unsubscribe_strategy"; strategyId: string };

export type ServerRealtimeMessage =
  | { type: "pong"; ts: number }
  | { type: "error"; message: string }
  | { type: "subscribed_strategy"; strategyId: string }
  | { type: "unsubscribed_strategy"; strategyId: string }
  | { type: "strategy_runtime_status"; strategyId: string; data: unknown }
  | { type: "strategy_runtime_status_error"; strategyId: string; message: string }
  | {
      type: "strategy_data_changed";
      strategyId: string;
      scopes: Array<"logs" | "orders" | "positions" | "strategy" | "runtime">;
      ts: number;
    }
  | {
      type: "strategy_tick";
      strategyId: string;
      data: {
        underlyingTick: {
          token: string;
          symbol?: string;
          ltp: number;
          timestamp?: string | number;
        } | null;
        tradeTick: {
          token: string;
          symbol?: string;
          ltp: number;
          timestamp?: string | number;
        } | null;
      };
    };

export interface RealtimeClient {
  id: string;
  userId: string;
  socket: WebSocket;
  subscribedStrategyIds: Set<string>;
  connectedAt: Date;
  lastSeenAt: Date;
  lastSentTicks?: Map<
    string,
    {
      underlyingLtp: number | null;
      tradeLtp: number | null;
      underlyingTimestamp?: string | number | null;
      tradeTimestamp?: string | number | null;
    }
  >;
}
