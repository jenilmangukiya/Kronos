import type { FastifyInstance } from "fastify";

export interface StrategyRules {
  type: "UNDERLYING_CROSS_ABOVE" | "UNDERLYING_CROSS_BELOW";
  underlyingToken: string;
  underlyingExchangeType: number;
  triggerPrice: number;
}

export interface StrategyTrade {
  instrumentType: "EQUITY" | "FUTURE" | "OPTION";
  token: string;
  symbol: string;
  exchangeType: number;
  exchange: string;
  side: "BUY" | "SELL";
  quantity: number;
}

export interface StrategyContext {
  app: FastifyInstance;
  strategy: {
    id: string;
    userId: string;
    brokerAccountId: string | null;
    name: string;
    strategyType: string;
    rules: unknown;
    trade: unknown;
  };
}

export interface StrategyDecision {
  shouldExecute: boolean;
  reason: string;
  meta?: Record<string, unknown>;
}

export interface StrategyHandler {
  type: string;
  evaluate(context: StrategyContext): Promise<StrategyDecision>;
}
