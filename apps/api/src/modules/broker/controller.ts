import { AppError } from "../../errors/app-error.js";
import type { ConnectBrokerInput } from "./types.js";
import { BrokerService } from "./service.js";

export class BrokerController {
  constructor(private readonly brokerService: BrokerService) {}

  async connect(userId: string | undefined, input: ConnectBrokerInput) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.brokerService.connect(userId, input);
  }

  async getMyBrokers(userId: string | undefined) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.brokerService.getMyBrokers(userId);
  }

  async disconnect(userId: string | undefined, brokerAccountId: string) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.brokerService.disconnect(userId, brokerAccountId);
  }
}
