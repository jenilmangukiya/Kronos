import type { FastifyInstance } from "fastify";

import { AppError } from "../../errors/app-error.js";
import type { CreateStrategyInput, UpdateStrategyInput } from "./types.js";
import { liveMarketDataService } from "../market-data/live/live-market-data.service.js";
import { PaperTradingService } from "../paper-trading/service.js";

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
    await this.getById(userId, strategyId);

    const strategy = await this.db.strategy.update({
      where: { id: strategyId },
      data: {
        name: input.name,
        rules: input.rules as any,
        trade: input.trade as any,
        risk: input.risk as any,
      },
    });

    await this.addLog(strategy.id, "Strategy updated");

    return strategy;
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
      },
    });

    await this.addLog(strategy.id, "Strategy reset");

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
      },
    });

    await this.addLog(duplicated.id, "Strategy duplicated");

    return duplicated;
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
}
