import type { FastifyInstance } from "fastify";

import { PaperTradingService } from "../../paper-trading/service.js";
import { strategyRegistry } from "./strategy-registry.js";
import type { StrategyTrade } from "./handlers/types.js";

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
          lastTriggeredAt: null,
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

    const trade = strategy.trade as StrategyTrade;

    const paperTradingService = new PaperTradingService(this.app.db);

    const orderResult = await paperTradingService.createOrder(strategy.userId, {
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

    await this.addLog(strategy.id, "Paper order executed", {
      orderResult,
    });
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
