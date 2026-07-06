import { AppError } from "../../errors/app-error.js";
import { StrategyService } from "./service.js";
import type { CreateStrategyInput, UpdateStrategyInput } from "./types.js";

export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  async create(userId: string | undefined, input: CreateStrategyInput) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.strategyService.create(userId, input);
  }

  async list(userId: string | undefined) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.strategyService.list(userId);
  }

  async getById(userId: string | undefined, strategyId: string) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.strategyService.getById(userId, strategyId);
  }

  async update(
    userId: string | undefined,
    strategyId: string,
    input: UpdateStrategyInput,
  ) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.strategyService.update(userId, strategyId, input);
  }

  async start(userId: string | undefined, strategyId: string) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.strategyService.start(userId, strategyId);
  }

  async stop(userId: string | undefined, strategyId: string) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.strategyService.stop(userId, strategyId);
  }

  async stopAndExit(userId: string | undefined, strategyId: string) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.strategyService.stopAndExit(userId, strategyId);
  }

  async reset(userId: string | undefined, strategyId: string) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.strategyService.reset(userId, strategyId);
  }

  async duplicate(userId: string | undefined, strategyId: string) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.strategyService.duplicate(userId, strategyId);
  }

  async getLogs(userId: string | undefined, strategyId: string) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.strategyService.getLogs(userId, strategyId);
  }
}
