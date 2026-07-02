import { AppError } from "../../errors/app-error.js";
import type { ConnectBrokerInput, CreateBrokerSessionInput } from "./types.js";
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

  async getAccounts(userId: string | undefined) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.brokerService.getAccounts(userId);
  }

  async disconnect(userId: string | undefined, brokerAccountId: string) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.brokerService.disconnect(userId, brokerAccountId);
  }

  async createSession(
    userId: string | undefined,
    brokerAccountId: string,
    input: CreateBrokerSessionInput,
  ) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.brokerService.createSession(userId, brokerAccountId, input);
  }

  async getProfile(userId: string | undefined, brokerAccountId: string) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.brokerService.getProfile(userId, brokerAccountId);
  }

  async getFunds(userId: string | undefined, brokerAccountId: string) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.brokerService.getFunds(userId, brokerAccountId);
  }

  async getHoldings(userId: string | undefined, brokerAccountId: string) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.brokerService.getHoldings(userId, brokerAccountId);
  }

  async getPositions(userId: string | undefined, brokerAccountId: string) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.brokerService.getPositions(userId, brokerAccountId);
  }
}
