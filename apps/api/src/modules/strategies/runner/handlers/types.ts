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
    risk: unknown;
    state?: unknown;
  };
  isReplay?: boolean;
}

export interface StrategyDecision {
  shouldExecute: boolean;
  reason: string;
  meta?: Record<string, unknown>;
}

export interface StrategyHandler {
  strategyType: string;
  validateConfig(config: {
    rules: unknown;
    trade: unknown;
    risk: unknown;
    instrumentType: string;
    name: string;
  }): void | Promise<void>;
  getRequiredSubscriptions(strategy: any): { exchangeType: number; tokens: string[] }[];
  evaluateEntry(context: StrategyContext): Promise<StrategyDecision>;
  evaluateExit?(context: StrategyContext & { position: any }): Promise<StrategyDecision>;
  getRuntimeStatus?(context: StrategyContext): Promise<Record<string, any>> | Record<string, any>;
  execute?(context: StrategyContext): Promise<void>;
}

