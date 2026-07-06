import type { FastifyInstance } from "fastify";

import { PaperTradingService } from "../../paper-trading/service.js";
import { strategyRegistry } from "./strategy-registry.js";
import type { StrategyTrade } from "./handlers/types.js";
import { liveTickStore } from "../../market-data/live/live-tick.store.js";

export class StrategyRunnerService {
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private readonly app: FastifyInstance) {}

  start() {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      void this.runOnce();
    }, 1000);

    this.app.log.info("[Strategy Runner] Started");
  }

  stop() {
    if (!this.interval) {
      return;
    }

    clearInterval(this.interval);
    this.interval = null;

    this.app.log.info("[Strategy Runner] Stopped");
  }

  private async runOnce() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const strategies = await this.app.db.strategy.findMany({
        where: {
          status: "RUNNING",
          mode: "PAPER",
        },
      });

      for (const strategy of strategies) {
        await this.evaluateStrategy(strategy);
      }
    } catch (error) {
      this.app.log.error(error, "[Strategy Runner] Failed");
    } finally {
      this.isRunning = false;
    }
  }

  private async evaluateStrategy(strategy: {
    id: string;
    userId: string;
    brokerAccountId: string | null;
    name: string;
    strategyType: string;
    rules: unknown;
    trade: unknown;
    risk: unknown;
  }) {
    const openPosition = await this.app.db.paperPosition.findFirst({
      where: {
        userId: strategy.userId,
        strategyId: strategy.id,
        status: "OPEN",
      },
    });

    if (openPosition) {
      await this.evaluateExit(strategy, openPosition);
      return;
    }

    await this.evaluateEntry(strategy);
  }
  private async evaluateEntry(strategy: {
    id: string;
    userId: string;
    brokerAccountId: string | null;
    name: string;
    strategyType: string;
    rules: unknown;
    trade: unknown;
  }) {
    const handler = strategyRegistry.get(strategy.strategyType);

    if (!handler) {
      await this.addLog(strategy.id, "No handler found for strategy type", {
        strategyType: strategy.strategyType,
      });
      return;
    }

    const decision = await handler.evaluate({
      app: this.app,
      strategy,
    });

    if (!decision.shouldExecute) {
      return;
    }

    await this.addLog(strategy.id, decision.reason, decision.meta);

    if (!strategy.brokerAccountId) {
      await this.addLog(
        strategy.id,
        "Skipped execution: broker account missing",
      );
      return;
    }

    const trade = strategy.trade as {
      instrumentType: "EQUITY" | "FUTURE" | "OPTION";
      token: string;
      symbol: string;
      exchangeType: number;
      exchange: string;
      side: "BUY" | "SELL";
      quantity: number;
    };

    const paperTradingService = new PaperTradingService(this.app.db);

    const orderResult = await paperTradingService.createOrder(strategy.userId, {
      strategyId: strategy.id,
      brokerAccountId: strategy.brokerAccountId,
      instrumentType: trade.instrumentType,
      token: trade.token,
      symbol: trade.symbol,
      exchangeType: trade.exchangeType,
      exchange: trade.exchange,
      side: trade.side,
      quantity: trade.quantity,
    });

    await this.app.db.strategy.update({
      where: {
        id: strategy.id,
      },
      data: {
        lastTriggeredAt: new Date(),
      },
    });

    await this.addLog(strategy.id, "Entry paper order executed", {
      orderResult,
    });
  }

  private async evaluateExit(
    strategy: {
      id: string;
      userId: string;
      risk: unknown;
    },
    position: {
      id: string;
      side: "LONG" | "SHORT";
      token: string;
      avgPrice: number;
      quantity: number;
      brokerAccountId: string | null;
    },
  ) {
    const risk = strategy.risk as {
      stopLossPercent?: number;
      targetPercent?: number;
    };

    if (!position.brokerAccountId) {
      return;
    }

    const tick = liveTickStore.getTick(
      position.brokerAccountId,
      position.token,
    );

    if (!tick) {
      return;
    }

    const ltp = tick.ltp;

    const stopLossPercent = risk.stopLossPercent;
    const targetPercent = risk.targetPercent;

    if (!stopLossPercent && !targetPercent) {
      return;
    }

    const exitReason = this.getExitReason({
      side: position.side,
      avgPrice: position.avgPrice,
      ltp,
      stopLossPercent,
      targetPercent,
    });

    if (!exitReason) {
      return;
    }

    const paperTradingService = new PaperTradingService(this.app.db);

    const exitResult = await paperTradingService.exitPosition(
      strategy.userId,
      position.id,
      { price: ltp },
    );

    await this.addLog(strategy.id, exitReason.message, {
      avgPrice: position.avgPrice,
      ltp,
      pnlPercent: exitReason.pnlPercent,
      exitResult,
    });

    await this.app.db.strategy.update({
      where: {
        id: strategy.id,
      },
      data: {
        status: "STOPPED",
      },
    });

    await this.addLog(strategy.id, "Strategy stopped after exit");
  }

  private getExitReason(input: {
    side: "LONG" | "SHORT";
    avgPrice: number;
    ltp: number;
    stopLossPercent?: number;
    targetPercent?: number;
  }) {
    const pnlPercent =
      input.side === "LONG"
        ? ((input.ltp - input.avgPrice) / input.avgPrice) * 100
        : ((input.avgPrice - input.ltp) / input.avgPrice) * 100;

    if (input.targetPercent && pnlPercent >= input.targetPercent) {
      return {
        message: "Target hit, position exited",
        pnlPercent,
      };
    }

    if (input.stopLossPercent && pnlPercent <= -input.stopLossPercent) {
      return {
        message: "Stop loss hit, position exited",
        pnlPercent,
      };
    }

    return null;
  }

  private async addLog(strategyId: string, message: string, meta?: unknown) {
    await this.app.db.strategyLog.create({
      data: {
        strategyId,
        message,
        meta: meta ?? {},
      },
    });
  }
}
