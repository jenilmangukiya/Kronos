import type { FastifyInstance } from "fastify";

import { AppError } from "../../errors/app-error.js";
import type { CreateStrategyInput, UpdateStrategyInput } from "./types.js";

export class StrategyService {
  constructor(private readonly db: FastifyInstance["db"]) {}

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

    const updated = await this.db.strategy.update({
      where: { id: strategy.id },
      data: {
        status: "RUNNING",
      },
    });

    await this.addLog(strategy.id, "Strategy started");

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

    await this.addLog(strategy.id, "Strategy stopped");

    return updated;
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
