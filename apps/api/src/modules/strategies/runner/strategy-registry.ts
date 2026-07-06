import { PriceBreakoutStrategy } from "./handlers/price-breakout.strategy.js";
import type { StrategyHandler } from "./handlers/types.js";

class StrategyRegistry {
  private readonly handlers = new Map<string, StrategyHandler>();

  constructor() {
    this.register(new PriceBreakoutStrategy());
  }

  get(type: string) {
    return this.handlers.get(type);
  }

  private register(handler: StrategyHandler) {
    this.handlers.set(handler.type, handler);
  }
}

export const strategyRegistry = new StrategyRegistry();
