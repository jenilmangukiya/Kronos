import { liveTickStore } from "../../../market-data/live/live-tick.store.js";
import { AppError } from "../../../../errors/app-error.js";
import type {
  StrategyContext,
  StrategyDecision,
  StrategyHandler,
  StrategyRules,
} from "./types.js";

export class PriceBreakoutStrategy implements StrategyHandler {
  strategyType = "PRICE_BREAKOUT";

  validateConfig(config: {
    rules: unknown;
    trade: unknown;
    risk: unknown;
    instrumentType: string;
    name: string;
  }): void {
    const { rules: rawRules, trade: rawTrade, risk: rawRisk, instrumentType, name } = config;

    if (!name || typeof name !== "string" || name.trim() === "") {
      throw new AppError("Strategy name is required", 400, "INVALID_STRATEGY_CONFIG");
    }

    if (instrumentType !== "FUTURE" && instrumentType !== "OPTION") {
      throw new AppError("Instrument type must be FUTURE or OPTION", 400, "INVALID_STRATEGY_CONFIG");
    }

    const rules = rawRules as any;
    if (!rules) {
      throw new AppError("Strategy rules are required", 400, "INVALID_STRATEGY_CONFIG");
    }

    if (rules.type !== "UNDERLYING_CROSS_ABOVE" && rules.type !== "UNDERLYING_CROSS_BELOW") {
      throw new AppError("Invalid rule type", 400, "INVALID_STRATEGY_CONFIG");
    }

    if (rules.triggerPrice === undefined || rules.triggerPrice === null || typeof rules.triggerPrice !== "number" || rules.triggerPrice <= 0) {
      throw new AppError("Trigger price must be greater than 0", 400, "INVALID_STRATEGY_CONFIG");
    }

    if (!rules.underlyingToken || typeof rules.underlyingToken !== "string" || rules.underlyingToken.trim() === "") {
      throw new AppError("Underlying token is required", 400, "INVALID_STRATEGY_CONFIG");
    }

    if (rules.underlyingExchangeType === undefined || rules.underlyingExchangeType === null || typeof rules.underlyingExchangeType !== "number") {
      throw new AppError("Underlying exchange type is required", 400, "INVALID_STRATEGY_CONFIG");
    }

    const trade = rawTrade as any;
    if (!trade) {
      throw new AppError("Trade configuration is required", 400, "INVALID_TRADE_CONFIG");
    }

    if (!trade.token || typeof trade.token !== "string" || trade.token.trim() === "") {
      throw new AppError("Trade token is required", 400, "INVALID_TRADE_CONFIG");
    }

    if (!trade.symbol || typeof trade.symbol !== "string" || trade.symbol.trim() === "") {
      throw new AppError("Trade symbol is required", 400, "INVALID_TRADE_CONFIG");
    }

    if (trade.exchange !== "NFO") {
      throw new AppError("Trade exchange must be NFO for FUTURE/OPTION", 400, "INVALID_TRADE_CONFIG");
    }

    if (trade.exchangeType !== 2) {
      throw new AppError("Trade exchangeType must be 2 for FUTURE/OPTION", 400, "INVALID_TRADE_CONFIG");
    }

    if (trade.quantity === undefined || trade.quantity === null || typeof trade.quantity !== "number" || trade.quantity <= 0) {
      throw new AppError("Trade quantity must be greater than 0", 400, "INVALID_TRADE_CONFIG");
    }

    const risk = rawRisk as any;
    if (risk) {
      if (risk.maxTradesPerDay !== undefined && risk.maxTradesPerDay !== null) {
        if (typeof risk.maxTradesPerDay !== "number" || risk.maxTradesPerDay < 1) {
          throw new AppError("Max trades per day must be >= 1", 400, "INVALID_RISK_CONFIG");
        }
      }

      if (risk.stopLossPercent !== undefined && risk.stopLossPercent !== null) {
        if (typeof risk.stopLossPercent !== "number" || risk.stopLossPercent <= 0) {
          throw new AppError("Stop loss percent must be greater than 0 if provided", 400, "INVALID_RISK_CONFIG");
        }
      }

      if (risk.targetPercent !== undefined && risk.targetPercent !== null) {
        if (typeof risk.targetPercent !== "number" || risk.targetPercent <= 0) {
          throw new AppError("Target percent must be greater than 0 if provided", 400, "INVALID_RISK_CONFIG");
        }
      }

      if (risk.reEntryMode !== undefined && risk.reEntryMode !== null) {
        const validModes = ["NO_REENTRY", "AFTER_EXIT", "AFTER_NEW_SIGNAL"];
        if (!validModes.includes(risk.reEntryMode)) {
          throw new AppError("Invalid re-entry mode", 400, "INVALID_RISK_CONFIG");
        }
      }
    }

    if (instrumentType === "FUTURE") {
      if (trade.instrumentType !== "FUTURE") {
        throw new AppError("Trade instrumentType must be FUTURE for FUTURE strategy", 400, "INVALID_FUTURE_CONTRACT");
      }
      if (!trade.symbol.includes("FUT")) {
        throw new AppError("Trade symbol must include FUT for FUTURE strategy", 400, "INVALID_FUTURE_CONTRACT");
      }
      if (!trade.token || trade.token.trim() === "") {
        throw new AppError("Trade token is required for FUTURE strategy", 400, "INVALID_FUTURE_CONTRACT");
      }
    }

    if (instrumentType === "OPTION") {
      if (trade.instrumentType !== "OPTION") {
        throw new AppError("Trade instrumentType must be OPTION for OPTION strategy", 400, "INVALID_OPTION_CONTRACT");
      }
      if (!trade.symbol.includes("CE") && !trade.symbol.includes("PE")) {
        throw new AppError("Trade symbol must include CE or PE for OPTION strategy", 400, "INVALID_OPTION_CONTRACT");
      }
      if (!trade.token || trade.token.trim() === "") {
        throw new AppError("Trade token is required for OPTION strategy", 400, "INVALID_OPTION_CONTRACT");
      }
    }
  }

  getRequiredSubscriptions(strategy: any): { exchangeType: number; tokens: string[] }[] {
    const rules = strategy.rules as any;
    const trade = strategy.trade as any;
    return [
      {
        exchangeType: rules.underlyingExchangeType,
        tokens: [rules.underlyingToken],
      },
      {
        exchangeType: trade.exchangeType,
        tokens: [trade.token],
      },
    ];
  }

  async evaluateEntry(context: StrategyContext): Promise<StrategyDecision> {
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

  getRuntimeStatus(context: StrategyContext): Record<string, any> {
    const rules = context.strategy.rules as StrategyRules;
    const brokerAccountId = context.strategy.brokerAccountId;

    const tick = (brokerAccountId && rules.underlyingToken)
      ? liveTickStore.getTick(brokerAccountId, rules.underlyingToken)
      : null;

    const ltp = tick?.ltp ?? null;
    let matched = false;

    if (ltp !== null) {
      if (rules.type === "UNDERLYING_CROSS_ABOVE") {
        matched = ltp >= rules.triggerPrice;
      } else if (rules.type === "UNDERLYING_CROSS_BELOW") {
        matched = ltp <= rules.triggerPrice;
      }
    }

    const condition = {
      type: rules.type,
      triggerPrice: rules.triggerPrice,
      matched,
    };

    return {
      condition,
      strategySignal: {
        underlyingPrice: ltp,
        triggerPrice: rules.triggerPrice,
        conditionMatched: matched,
        ruleType: rules.type,
      },
    };
  }
}
