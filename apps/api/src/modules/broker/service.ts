import type { FastifyInstance } from "fastify";

import { AppError } from "../../errors/app-error.js";
import type { ConnectBrokerInput } from "./types.js";

export class BrokerService {
  constructor(private readonly db: FastifyInstance["db"]) {}

  async connect(userId: string, input: ConnectBrokerInput) {
    if (input.broker !== "KOTAK") {
      throw new AppError(
        "Broker is not supported",
        400,
        "BROKER_NOT_SUPPORTED",
      );
    }

    const existingBroker = await this.db.brokerAccount.findFirst({
      where: {
        userId,
        broker: input.broker,
        clientId: input.clientId,
      },
    });

    if (existingBroker) {
      throw new AppError(
        "Broker account already connected",
        409,
        "BROKER_ALREADY_CONNECTED",
      );
    }

    const brokerAccount = await this.db.brokerAccount.create({
      data: {
        userId,
        broker: input.broker,
        clientId: input.clientId,
      },
      select: {
        id: true,
        broker: true,
        clientId: true,
        createdAt: true,
      },
    });

    return brokerAccount;
  }
  async getMyBrokers(userId: string) {
    return this.db.brokerAccount.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        broker: true,
        clientId: true,
        tokenExpiresAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async disconnect(userId: string, brokerAccountId: string) {
    const brokerAccount = await this.db.brokerAccount.findFirst({
      where: {
        id: brokerAccountId,
        userId,
      },
    });

    if (!brokerAccount) {
      throw new AppError(
        "Broker account not found",
        404,
        "BROKER_ACCOUNT_NOT_FOUND",
      );
    }

    await this.db.brokerAccount.delete({
      where: {
        id: brokerAccount.id,
      },
    });

    return {
      success: true,
    };
  }
}
