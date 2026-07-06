import { liveTickStore } from "../../../market-data/live/live-tick.store.js";
import type {
  StrategyContext,
  StrategyDecision,
  StrategyHandler,
  StrategyRules,
} from "./types.js";

export class PriceBreakoutStrategy implements StrategyHandler {
  type = "PRICE_BREAKOUT";

  async evaluate(context: StrategyContext): Promise<StrategyDecision> {
    const rules = context.strategy.rules as StrategyRules;

    if (!context.strategy.brokerAccountId) {
      return {
        shouldExecute: false,
        reason: "Broker account missing",
      };
    }

    const tick = liveTickStore.getTick(
      context.strategy.brokerAccountId,
      rules.underlyingToken,
    );

    if (!tick) {
      return {
        shouldExecute: false,
        reason: "Waiting for live underlying tick",
        meta: {
          token: rules.underlyingToken,
        },
      };
    }

    const ltp = tick.ltp;

    if (rules.type === "UNDERLYING_CROSS_ABOVE") {
      const matched = ltp >= rules.triggerPrice;

      return {
        shouldExecute: matched,
        reason: matched
          ? "Price crossed above trigger"
          : "Price has not crossed above trigger",
        meta: {
          ltp,
          triggerPrice: rules.triggerPrice,
        },
      };
    }

    if (rules.type === "UNDERLYING_CROSS_BELOW") {
      const matched = ltp <= rules.triggerPrice;

      return {
        shouldExecute: matched,
        reason: matched
          ? "Price crossed below trigger"
          : "Price has not crossed below trigger",
        meta: {
          ltp,
          triggerPrice: rules.triggerPrice,
        },
      };
    }

    return {
      shouldExecute: false,
      reason: "Unsupported rule type",
    };
  }
}
