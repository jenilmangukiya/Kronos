export type ClientRealtimeMessage =
  | { type: "ping" }
  | { type: "subscribe_strategy"; strategyId: string }
  | { type: "unsubscribe_strategy"; strategyId: string };

export type StrategyDataChangedMessage = {
  type: "strategy_data_changed";
  strategyId: string;
  scopes: Array<"logs" | "orders" | "positions" | "strategy" | "runtime">;
  ts: number;
};

export type ServerRealtimeMessage =
  | { type: "pong"; ts: number }
  | { type: "error"; message: string }
  | { type: "subscribed_strategy"; strategyId: string }
  | { type: "unsubscribed_strategy"; strategyId: string }
  | { type: "strategy_runtime_status"; strategyId: string; data: any }
  | { type: "strategy_runtime_status_error"; strategyId: string; message: string }
  | StrategyDataChangedMessage;
