import type { FastifyInstance } from "fastify";

import { liveTickStore } from "../../market-data/live/live-tick.store.js";
import { PaperTradingService } from "../../paper-trading/service.js";

interface StrategyRules {
  type: "UNDERLYING_CROSS_ABOVE" | "UNDERLYING_CROSS_BELOW";
  underlyingToken: string;
  underlyingExchangeType: number;
  triggerPrice: number;
}

interface StrategyTrade {
  instrumentType: "EQUITY" | "FUTURE" | "OPTION";
  token: string;
  symbol: string;
  exchangeType: number;
  exchange: string;
  side: "BUY" | "SELL";
  quantity: number;
}

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
    rules: unknown;
    trade: unknown;
  }) {
    const rules = strategy.rules as StrategyRules;
    const trade = strategy.trade as StrategyTrade;

    if (!strategy.brokerAccountId) {
      await this.addLog(strategy.id, "Skipped: broker account missing");
      return;
    }

    const tick = liveTickStore.getTick(
      strategy.brokerAccountId,
      rules.underlyingToken,
    );

    if (!tick) {
      await this.addLog(strategy.id, "Waiting for live underlying tick", {
        token: rules.underlyingToken,
      });
      return;
    }

    const ltp = tick.ltp;

    const matched = this.isRuleMatched(rules, ltp);

    if (!matched) {
      return;
    }

    await this.addLog(strategy.id, "Entry condition matched", {
      ruleType: rules.type,
      triggerPrice: rules.triggerPrice,
      ltp,
    });

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

  private isRuleMatched(rules: StrategyRules, ltp: number) {
    if (rules.type === "UNDERLYING_CROSS_ABOVE") {
      return ltp >= rules.triggerPrice;
    }

    if (rules.type === "UNDERLYING_CROSS_BELOW") {
      return ltp <= rules.triggerPrice;
    }

    return false;
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
