import { AppError } from "../../errors/app-error.js";
import { PaperTradingService } from "./service.js";
import type { CreatePaperOrderInput, ExitPaperPositionInput } from "./types.js";

export class PaperTradingController {
  constructor(private readonly paperTradingService: PaperTradingService) {}

  async createOrder(userId: string | undefined, input: CreatePaperOrderInput) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.paperTradingService.createOrder(userId, input);
  }

  async getOrders(userId: string | undefined) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.paperTradingService.getOrders(userId);
  }

  async getPositions(userId: string | undefined) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.paperTradingService.getPositions(userId);
  }

  async exitPosition(
    userId: string | undefined,
    positionId: string,
    input: ExitPaperPositionInput,
  ) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.paperTradingService.exitPosition(userId, positionId, input);
  }
}
