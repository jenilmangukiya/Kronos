import type { FastifyInstance } from "fastify";

import { AppError } from "../../errors/app-error.js";
import type { ConnectBrokerInput, CreateBrokerSessionInput } from "./types.js";

import { AngelClient } from "./clients/angel.client.js";
import { KotakClient } from "./clients/kotak.client.js";

export class BrokerService {
  constructor(private readonly db: FastifyInstance["db"]) {}

  async connect(userId: string, input: ConnectBrokerInput) {
    if (!["KOTAK", "ANGEL_ONE"].includes(input.broker)) {
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
        apiKey: input.apiKey,
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

  async createSession(
    userId: string,
    brokerAccountId: string,
    input: CreateBrokerSessionInput,
  ) {
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

    if (!["KOTAK", "ANGEL_ONE"].includes(brokerAccount.broker)) {
      throw new AppError(
        "Broker is not supported",
        400,
        "BROKER_NOT_SUPPORTED",
      );
    }

    if (!brokerAccount.apiKey) {
      throw new AppError(
        "Broker API access token is missing",
        400,
        "BROKER_API_ACCESS_TOKEN_MISSING",
      );
    }
    let brokerClient;

    if (brokerAccount.broker === "ANGEL_ONE") {
      brokerClient = new AngelClient();
    } else if (brokerAccount.broker === "KOTAK") {
      brokerClient = new KotakClient();
    } else {
      throw new AppError(
        "Broker is not supported",
        400,
        "BROKER_NOT_SUPPORTED",
      );
    }

    if (!brokerAccount.apiKey) {
      throw new AppError(
        "Broker API key is missing",
        400,
        "BROKER_API_KEY_MISSING",
      );
    }

    const session = await brokerClient.createSession({
      clientId: brokerAccount.clientId,
      apiKey: brokerAccount.apiKey,
      input,
    });

    const updatedBrokerAccount = await this.db.brokerAccount.update({
      where: {
        id: brokerAccount.id,
      },
      data: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        feedToken: session.feedToken,
        sessionSid: session.sessionSid,
        sessionBaseUrl: session.sessionBaseUrl,
        tokenExpiresAt: session.tokenExpiresAt,
      },
      select: {
        id: true,
        broker: true,
        clientId: true,
        tokenExpiresAt: true,
        updatedAt: true,
      },
    });
    return updatedBrokerAccount;
  }

  async getProfile(userId: string, brokerAccountId: string) {
    const brokerAccount = await this.getActiveBrokerAccount(
      userId,
      brokerAccountId,
    );

    if (brokerAccount.broker !== "ANGEL_ONE") {
      throw new AppError(
        "Broker is not supported",
        400,
        "BROKER_NOT_SUPPORTED",
      );
    }

    const angelClient = new AngelClient();

    const response = await angelClient.getProfile({
      apiKey: brokerAccount.apiKey!,
      accessToken: brokerAccount.accessToken!,
    });

    return response.data;
  }

  async getFunds(userId: string, brokerAccountId: string) {
    const brokerAccount = await this.getActiveBrokerAccount(
      userId,
      brokerAccountId,
    );

    if (brokerAccount.broker !== "ANGEL_ONE") {
      throw new AppError(
        "Broker is not supported",
        400,
        "BROKER_NOT_SUPPORTED",
      );
    }

    const angelClient = new AngelClient();

    const response = await angelClient.getFunds({
      apiKey: brokerAccount.apiKey!,
      accessToken: brokerAccount.accessToken!,
    });

    return response.data;
  }

  async getHoldings(userId: string, brokerAccountId: string) {
    const brokerAccount = await this.getActiveBrokerAccount(
      userId,
      brokerAccountId,
    );

    if (brokerAccount.broker !== "ANGEL_ONE") {
      throw new AppError(
        "Broker is not supported",
        400,
        "BROKER_NOT_SUPPORTED",
      );
    }

    const angelClient = new AngelClient();

    const response = await angelClient.getHoldings({
      apiKey: brokerAccount.apiKey!,
      accessToken: brokerAccount.accessToken!,
    });

    return response.data;
  }

  async getPositions(userId: string, brokerAccountId: string) {
    const brokerAccount = await this.getActiveBrokerAccount(
      userId,
      brokerAccountId,
    );

    if (brokerAccount.broker !== "ANGEL_ONE") {
      throw new AppError(
        "Broker is not supported",
        400,
        "BROKER_NOT_SUPPORTED",
      );
    }

    const angelClient = new AngelClient();

    const response = await angelClient.getPositions({
      apiKey: brokerAccount.apiKey!,
      accessToken: brokerAccount.accessToken!,
    });

    return response.data;
  }

  private async getActiveBrokerAccount(
    userId: string,
    brokerAccountId: string,
  ) {
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

    if (!brokerAccount.apiKey || !brokerAccount.accessToken) {
      throw new AppError(
        "Broker session is missing",
        400,
        "BROKER_SESSION_MISSING",
      );
    }

    if (
      !brokerAccount.tokenExpiresAt ||
      brokerAccount.tokenExpiresAt <= new Date()
    ) {
      throw new AppError(
        "Broker session expired",
        401,
        "BROKER_SESSION_EXPIRED",
      );
    }

    return brokerAccount;
  }
}
