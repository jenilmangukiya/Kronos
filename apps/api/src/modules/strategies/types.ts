export type StrategyStatus = "STOPPED" | "RUNNING";
export type StrategyMode = "PAPER" | "LIVE";
export type StrategyInstrumentType = "EQUITY" | "FUTURE" | "OPTION";

export type StrategyType = "PRICE_BREAKOUT";

export type StrategyRuleType =
  | "UNDERLYING_CROSS_ABOVE"
  | "UNDERLYING_CROSS_BELOW";

export type ReEntryMode = "NO_REENTRY" | "AFTER_EXIT" | "AFTER_NEW_SIGNAL";

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
  reEntryMode?: ReEntryMode;
}

export interface CreateStrategyInput {
  brokerAccountId?: string;
  name: string;
  symbol: string;
  strategyType?: StrategyType;
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
