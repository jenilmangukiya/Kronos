import { StrategyInstrumentType, StrategyRuleType, StrategyMode } from "../../../services/strategies/StrategyService";

export interface StrategyFormValues {
  name: string;
  symbol: "NIFTY" | "BANKNIFTY";
  instrumentType: StrategyInstrumentType;
  mode: StrategyMode;
  ruleType: StrategyRuleType;
  triggerPrice: number;
  tradeSide: "BUY" | "SELL";
  tradeQuantity: number;
  tradeToken: string;
  tradeSymbol: string;
  tradeExpiry?: string;
  maxTradesPerDay: number;
  stopLossPercent?: number;
  targetPercent?: number;
}
