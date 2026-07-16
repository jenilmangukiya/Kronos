import { PriceBreakoutStrategy } from "./handlers/price-breakout.strategy.js";
import { HighLowBreakoutReversalStrategy } from "./handlers/high-low-breakout-reversal/high-low-breakout-reversal.strategy.js";
import type { StrategyHandler } from "./handlers/types.js";

class StrategyRegistry {
  private readonly handlers = new Map<string, StrategyHandler>();

  constructor() {
    this.register(new PriceBreakoutStrategy());
    this.register(new HighLowBreakoutReversalStrategy());
  }


  get(type: string) {
    return this.handlers.get(type);
  }

  private register(handler: StrategyHandler) {
    this.handlers.set(handler.strategyType, handler);
  }
}

export const strategyRegistry = new StrategyRegistry();
