export type StrategyStatus = "STOPPED" | "RUNNING";
export type StrategyMode = "PAPER" | "LIVE";
export type StrategyInstrumentType = "EQUITY" | "FUTURE" | "OPTION";

export type StrategyRuleType =
  | "UNDERLYING_CROSS_ABOVE"
  | "UNDERLYING_CROSS_BELOW";

export interface StrategyRules {
  type: StrategyRuleType;
  underlyingToken: string;
  underlyingExchangeType: number;
  triggerPrice: number;
}

export interface StrategyTrade {
  instrumentType: StrategyInstrumentType;
  token: string;
  symbol: string;
  exchangeType: number;
  exchange: string;
  side: "BUY" | "SELL";
  quantity: number;
}

export interface StrategyRisk {
  maxTradesPerDay?: number;
  stopLossPercent?: number;
  targetPercent?: number;
}

export interface CreateStrategyInput {
  brokerAccountId?: string;
  name: string;
  symbol: string;
  instrumentType: StrategyInstrumentType;
  mode: StrategyMode;
  rules: StrategyRules;
  trade: StrategyTrade;
  risk?: StrategyRisk;
}

export interface UpdateStrategyInput {
  name?: string;
  rules?: StrategyRules;
  trade?: StrategyTrade;
  risk?: StrategyRisk;
}
