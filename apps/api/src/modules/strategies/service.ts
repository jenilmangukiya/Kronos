import type { FastifyInstance } from "fastify";

import { AppError } from "../../errors/app-error.js";
import type { CreateStrategyInput, UpdateStrategyInput } from "./types.js";
import { liveMarketDataService } from "../market-data/live/live-market-data.service.js";
import { PaperTradingService } from "../paper-trading/service.js";
import { liveTickStore } from "../market-data/live/live-tick.store.js";
import { realtimeService } from "../realtime/realtime.service.js";

export class StrategyService {
  constructor(
    private readonly app: FastifyInstance,
    private readonly db: FastifyInstance["db"],
  ) {}

  async create(userId: string, input: CreateStrategyInput) {
    if (input.mode === "LIVE") {
      throw new AppError(
        "Live strategy mode is not enabled",
        400,
        "LIVE_STRATEGY_DISABLED",
      );
    }

    this.validateStrategy(input);

    const strategy = await this.db.strategy.create({
      data: {
        userId,
        brokerAccountId: input.brokerAccountId,
        name: input.name,
        symbol: input.symbol,
        strategyType: input.strategyType ?? "PRICE_BREAKOUT",
        instrumentType: input.instrumentType,
        mode: input.mode,
        status: "STOPPED",
        rules: input.rules as any,
        trade: input.trade as any,
        risk: (input.risk ?? {}) as any,
        state: {},
      },
    });

    await this.addLog(strategy.id, "Strategy created", {
      strategyId: strategy.id,
    });

    return strategy;
  }

  async list(userId: string) {
    return this.db.strategy.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(userId: string, strategyId: string) {
    const strategy = await this.db.strategy.findFirst({
      where: {
        id: strategyId,
        userId,
      },
    });

    if (!strategy) {
      throw new AppError("Strategy not found", 404, "STRATEGY_NOT_FOUND");
    }

    return strategy;
  }

  async update(userId: string, strategyId: string, input: UpdateStrategyInput) {
    const existing = await this.db.strategy.findUnique({
      where: { id: strategyId },
    });

    if (existing) {
      if (existing.userId !== userId) {
        throw new AppError("Strategy not found", 404, "STRATEGY_NOT_FOUND");
      }

      if (existing.status === "RUNNING") {
        throw new AppError(
          "Stop strategy before editing",
          400,
          "STRATEGY_EDIT_RUNNING_NOT_ALLOWED",
        );
      }

      const openPosition = await this.db.paperPosition.findFirst({
        where: {
          userId,
          strategyId,
          status: "OPEN",
        },
      });

      if (openPosition) {
        throw new AppError(
          "Exit open position before editing strategy",
          400,
          "STRATEGY_EDIT_OPEN_POSITION_NOT_ALLOWED",
        );
      }

      this.validateStrategy(input, existing);

      const strategy = await this.db.strategy.update({
        where: { id: strategyId },
        data: {
          name: input.name,
          symbol: input.symbol,
          strategyType: input.strategyType,
          instrumentType: input.instrumentType,
          rules: input.rules as any,
          trade: input.trade as any,
          risk: input.risk as any,
          lastTriggeredAt: null,
          state: {},
        },
      });

      await this.addLog(strategy.id, "Strategy updated");

      realtimeService.publishStrategyDataChanged(strategy.id, [
        "logs",
        "strategy",
        "runtime",
      ]);

      return strategy;
    } else {
      this.validateStrategy(input);

      const strategy = await this.db.strategy.create({
        data: {
          id: strategyId,
          userId,
          brokerAccountId: input.brokerAccountId,
          name: input.name ?? "Unnamed Strategy",
          symbol: input.symbol ?? "",
          strategyType: input.strategyType ?? "PRICE_BREAKOUT",
          instrumentType: input.instrumentType ?? "EQUITY",
          mode: input.mode ?? "PAPER",
          status: "STOPPED",
          rules: (input.rules ?? {}) as any,
          trade: (input.trade ?? {}) as any,
          risk: (input.risk ?? {}) as any,
          state: {},
        },
      });

      await this.addLog(strategy.id, "Strategy created", {
        strategyId: strategy.id,
      });

      realtimeService.publishStrategyDataChanged(strategy.id, [
        "logs",
        "strategy",
        "runtime",
      ]);

      return strategy;
    }
  }

  async start(userId: string, strategyId: string) {
    const strategy = await this.getById(userId, strategyId);

    if (strategy.mode === "LIVE") {
      throw new AppError(
        "Live strategy mode is not enabled",
        400,
        "LIVE_STRATEGY_DISABLED",
      );
    }

    if (!strategy.brokerAccountId) {
      throw new AppError(
        "Broker account is required to start strategy",
        400,
        "STRATEGY_BROKER_ACCOUNT_REQUIRED",
      );
    }

    const rules = strategy.rules as {
      underlyingToken: string;
      underlyingExchangeType: number;
    };

    const trade = strategy.trade as {
      token: string;
      exchangeType: number;
    };

    await liveMarketDataService.start(
      this.app,
      userId,
      strategy.brokerAccountId,
    );

    liveMarketDataService.subscribe(userId, strategy.brokerAccountId, [
      {
        exchangeType: rules.underlyingExchangeType as
          | 1
          | 2
          | 3
          | 4
          | 5
          | 7
          | 13,
        tokens: [rules.underlyingToken],
      },
      {
        exchangeType: trade.exchangeType as 1 | 2 | 3 | 4 | 5 | 7 | 13,
        tokens: [trade.token],
      },
    ]);

    const openPosition = await this.db.paperPosition.findFirst({
      where: {
        userId,
        strategyId: strategy.id,
        status: "OPEN",
      },
    });

    const updated = await this.db.strategy.update({
      where: { id: strategy.id },
      data: {
        status: "RUNNING",
        lastTriggeredAt: openPosition ? strategy.lastTriggeredAt : null,
      },
    });

    await this.addLog(strategy.id, "Strategy started");
    await this.addLog(strategy.id, "Live market data subscribed", {
      underlyingToken: rules.underlyingToken,
      tradeToken: trade.token,
    });

    realtimeService.publishStrategyDataChanged(strategy.id, [
      "logs",
      "strategy",
      "runtime",
    ]);

    return updated;
  }

  async stop(userId: string, strategyId: string) {
    const strategy = await this.getById(userId, strategyId);

    const updated = await this.db.strategy.update({
      where: { id: strategy.id },
      data: {
        status: "STOPPED",
      },
    });

    if (strategy.brokerAccountId) {
      const rules = strategy.rules as {
        underlyingToken: string;
        underlyingExchangeType: number;
      };

      const trade = strategy.trade as {
        token: string;
        exchangeType: number;
      };

      try {
        liveMarketDataService.unsubscribe(userId, strategy.brokerAccountId, [
          {
            exchangeType: rules.underlyingExchangeType as
              | 1
              | 2
              | 3
              | 4
              | 5
              | 7
              | 13,
            tokens: [rules.underlyingToken],
          },
          {
            exchangeType: trade.exchangeType as 1 | 2 | 3 | 4 | 5 | 7 | 13,
            tokens: [trade.token],
          },
        ]);

        await this.addLog(strategy.id, "Live market data unsubscribed");
      } catch {
        await this.addLog(strategy.id, "Live unsubscribe skipped");
      }
    }

    await this.addLog(strategy.id, "Strategy stopped");

    realtimeService.publishStrategyDataChanged(strategy.id, [
      "logs",
      "strategy",
      "runtime",
    ]);

    return updated;
  }

  async stopAndExit(userId: string, strategyId: string) {
    const strategy = await this.getById(userId, strategyId);

    const openPosition = await this.db.paperPosition.findFirst({
      where: {
        userId,
        strategyId: strategy.id,
        status: "OPEN",
      },
    });

    let exitResult = null;
    if (openPosition) {
      const paperTradingService = new PaperTradingService(this.db);
      exitResult = await paperTradingService.exitPosition(userId, openPosition.id, {});
      await this.addLog(strategy.id, "Manual stop and exit executed");
    } else {
      await this.addLog(strategy.id, "Manual stop executed, no open position found");
    }

    const updated = await this.stop(userId, strategyId);

    realtimeService.publishStrategyDataChanged(strategy.id, [
      "logs",
      "orders",
      "positions",
      "strategy",
      "runtime",
    ]);

    return {
      strategy: updated,
      exitResult,
    };
  }

  async reset(userId: string, strategyId: string) {
    const strategy = await this.getById(userId, strategyId);

    if (strategy.brokerAccountId) {
      const rules = strategy.rules as {
        underlyingToken: string;
        underlyingExchangeType: number;
      };

      const trade = strategy.trade as {
        token: string;
        exchangeType: number;
      };

      try {
        liveMarketDataService.unsubscribe(userId, strategy.brokerAccountId, [
          {
            exchangeType: rules.underlyingExchangeType as any,
            tokens: [rules.underlyingToken],
          },
          {
            exchangeType: trade.exchangeType as any,
            tokens: [trade.token],
          },
        ]);
        await this.addLog(strategy.id, "Live market data unsubscribed");
      } catch {
        // Ignore unsubscribe error during reset
      }
    }

    const updated = await this.db.strategy.update({
      where: { id: strategy.id },
      data: {
        status: "STOPPED",
        lastTriggeredAt: null,
        state: {},
      },
    });

    await this.addLog(strategy.id, "Strategy reset");

    realtimeService.publishStrategyDataChanged(strategy.id, [
      "logs",
      "strategy",
      "runtime",
    ]);

    return updated;
  }

  async duplicate(userId: string, strategyId: string) {
    const strategy = await this.getById(userId, strategyId);

    const duplicated = await this.db.strategy.create({
      data: {
        userId,
        brokerAccountId: strategy.brokerAccountId,
        name: strategy.name + " Copy",
        symbol: strategy.symbol,
        strategyType: strategy.strategyType,
        instrumentType: strategy.instrumentType,
        mode: strategy.mode,
        rules: strategy.rules ?? {},
        trade: strategy.trade ?? {},
        risk: strategy.risk ?? {},
        status: "STOPPED",
        lastTriggeredAt: null,
        state: {},
      },
    });

    await this.addLog(duplicated.id, "Strategy duplicated");

    realtimeService.publishStrategyDataChanged(duplicated.id, [
      "logs",
      "strategy",
      "runtime",
    ]);

    return duplicated;
  }

  async updateState(strategyId: string, state: Record<string, unknown>) {
    return this.db.strategy.update({
      where: { id: strategyId },
      data: { state: state as any },
    });
  }

  async mergeState(strategyId: string, partialState: Record<string, unknown>) {
    const strategy = await this.db.strategy.findUnique({
      where: { id: strategyId },
      select: { state: true },
    });

    const currentState =
      strategy?.state && typeof strategy.state === "object"
        ? (strategy.state as Record<string, unknown>)
        : {};

    return this.db.strategy.update({
      where: { id: strategyId },
      data: {
        state: {
          ...currentState,
          ...partialState,
        } as any,
      },
    });
  }

  async getLogs(userId: string, strategyId: string) {
    await this.getById(userId, strategyId);

    return this.db.strategyLog.findMany({
      where: {
        strategyId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });
  }

  async addLog(strategyId: string, message: string, meta?: unknown) {
    return this.db.strategyLog.create({
      data: {
        strategyId,
        message,
        meta: meta ?? {},
      },
    });
  }

  private getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  private async getTodayEntryCount(strategyId: string, entrySide: "BUY" | "SELL") {
    const { start, end } = this.getTodayRange();

    return this.db.paperOrder.count({
      where: {
        strategyId,
        side: entrySide,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });
  }

  private getReEntryMode(strategy: any): string {
    const risk = (strategy.risk || {}) as any;
    return risk.reEntryMode || "NO_REENTRY";
  }

  private getConditionPreview(strategy: any, tick: any) {
    if (strategy.strategyType !== "PRICE_BREAKOUT") {
      return null;
    }
    const rules = (strategy.rules || {}) as any;
    const triggerPrice = rules.triggerPrice;
    const type = rules.type;

    if (!tick) {
      return {
        type,
        triggerPrice,
        matched: false,
      };
    }

    let matched = false;
    if (type === "UNDERLYING_CROSS_ABOVE") {
      matched = tick.ltp >= triggerPrice;
    } else if (type === "UNDERLYING_CROSS_BELOW") {
      matched = tick.ltp <= triggerPrice;
    }

    return {
      type,
      triggerPrice,
      matched,
    };
  }

  async getRuntimeStatus(userId: string, strategyId: string) {
    const strategy = await this.getById(userId, strategyId);

    const openPosition = await this.db.paperPosition.findFirst({
      where: {
        userId,
        strategyId: strategy.id,
        status: "OPEN",
      },
    });
    const hasOpenPosition = !!openPosition;

    const trade = (strategy.trade || {}) as any;
    const entrySide = trade.side || "BUY";
    const tradesToday = await this.getTodayEntryCount(strategy.id, entrySide);

    const risk = (strategy.risk || {}) as any;
    const maxTradesPerDay = risk.maxTradesPerDay ?? 1;
    const reEntryMode = this.getReEntryMode(strategy);

    const rules = (strategy.rules || {}) as any;
    const underlyingToken = rules.underlyingToken;
    const brokerAccountId = strategy.brokerAccountId;

    const tick = (brokerAccountId && underlyingToken)
      ? liveTickStore.getTick(brokerAccountId, underlyingToken)
      : null;

    const tradeToken = trade.token;
    const tradeTick = (brokerAccountId && tradeToken)
      ? liveTickStore.getTick(brokerAccountId, tradeToken)
      : null;

    const condition = this.getConditionPreview(strategy, tick);

    let canEnter = false;
    let reason = "";

    if (strategy.status !== "RUNNING") {
      canEnter = false;
      reason = "Strategy is stopped";
    } else if (hasOpenPosition) {
      canEnter = false;
      reason = "Open position exists, monitoring exit";
    } else if (!tick) {
      canEnter = false;
      reason = "Waiting for live tick";
    } else if (reEntryMode === "NO_REENTRY" && tradesToday > 0) {
      canEnter = false;
      reason = "Re-entry blocked by NO_REENTRY mode";
    } else if (tradesToday >= maxTradesPerDay) {
      canEnter = false;
      reason = "Max trades reached for today";
    } else if (strategy.strategyType !== "PRICE_BREAKOUT") {
      canEnter = false;
      reason = "Unsupported runtime condition preview";
    } else if (condition && condition.matched) {
      canEnter = true;
      reason = "Entry condition matched";
    } else {
      canEnter = false;
      reason = "Waiting for entry condition";
    }

    return {
      strategyId: strategy.id,
      status: strategy.status,
      mode: strategy.mode,
      strategyType: strategy.strategyType,
      brokerAccountId: strategy.brokerAccountId,
      hasOpenPosition,
      openPosition: openPosition || null,
      tradesToday,
      maxTradesPerDay,
      reEntryMode,
      canEnter,
      reason,
      liveTick: tick,
      tradeTick,
      condition,
      state: strategy.state || {},
    };
  }

  private validateStrategy(input: CreateStrategyInput | UpdateStrategyInput, existing?: any) {
    const name = input.name !== undefined ? input.name : (existing ? existing.name : undefined);
    const strategyType = input.strategyType !== undefined ? input.strategyType : (existing ? existing.strategyType : "PRICE_BREAKOUT");
    const instrumentType = input.instrumentType !== undefined ? input.instrumentType : (existing ? existing.instrumentType : undefined);
    const rules = input.rules !== undefined ? input.rules : (existing ? existing.rules : undefined);
    const trade = input.trade !== undefined ? input.trade : (existing ? existing.trade : undefined);
    const risk = input.risk !== undefined ? input.risk : (existing ? existing.risk : undefined);

    // 1. INVALID_STRATEGY_CONFIG
    if (name === undefined || name === null || typeof name !== "string" || name.trim() === "") {
      throw new AppError("Strategy name is required", 400, "INVALID_STRATEGY_CONFIG");
    }

    if (strategyType !== "PRICE_BREAKOUT") {
      throw new AppError("Invalid strategy type", 400, "INVALID_STRATEGY_CONFIG");
    }

    if (instrumentType !== "FUTURE" && instrumentType !== "OPTION") {
      throw new AppError("Instrument type must be FUTURE or OPTION", 400, "INVALID_STRATEGY_CONFIG");
    }

    if (!rules) {
      throw new AppError("Strategy rules are required", 400, "INVALID_STRATEGY_CONFIG");
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

    // 2. INVALID_TRADE_CONFIG
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

    // 3. INVALID_RISK_CONFIG
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

    // 4. Instrument-specific validation
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
}
