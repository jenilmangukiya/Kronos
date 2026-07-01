import type { FastifyInstance } from "fastify";

import { AppError } from "../../errors/app-error.js";
import { AngelMarketDataProvider } from "./providers/angel.provider.js";
import type {
  CandlesQuery,
  InstrumentSearchQuery,
  LtpQuery,
  OptionExpiriesQuery,
  QuoteQuery,
} from "./types.js";
import { AngelInstrumentProvider } from "./providers/angel-instrument.provider.js";

const angelInstrumentProvider = new AngelInstrumentProvider();

export class MarketDataService {
  constructor(private readonly db: FastifyInstance["db"]) {}

  async getLtp(userId: string, query: LtpQuery) {
    const brokerAccount = await this.getActiveAngelBrokerAccount(
      userId,
      query.brokerAccountId,
    );

    const provider = new AngelMarketDataProvider();

    return provider.getLtp({
      apiKey: brokerAccount.apiKey!,
      accessToken: brokerAccount.accessToken!,
      query,
    });
  }

  async getQuote(userId: string, query: QuoteQuery) {
    const brokerAccount = await this.getActiveAngelBrokerAccount(
      userId,
      query.brokerAccountId,
    );

    const provider = new AngelMarketDataProvider();

    return provider.getQuote({
      apiKey: brokerAccount.apiKey!,
      accessToken: brokerAccount.accessToken!,
      query,
    });
  }

  async getCandles(userId: string, query: CandlesQuery) {
    const brokerAccount = await this.getActiveAngelBrokerAccount(
      userId,
      query.brokerAccountId,
    );

    const provider = new AngelMarketDataProvider();

    return provider.getCandles({
      apiKey: brokerAccount.apiKey!,
      accessToken: brokerAccount.accessToken!,
      query,
    });
  }

  async searchInstruments(query: InstrumentSearchQuery) {
    return angelInstrumentProvider.search(query);
  }

  async refreshInstruments() {
    return angelInstrumentProvider.refresh();
  }

  async getOptionExpiries(query: OptionExpiriesQuery) {
    return angelInstrumentProvider.getOptionExpiries(query);
  }

  private async getActiveAngelBrokerAccount(
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

    if (brokerAccount.broker !== "ANGEL_ONE") {
      throw new AppError(
        "Only Angel One market data is supported currently",
        400,
        "MARKET_DATA_BROKER_NOT_SUPPORTED",
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
