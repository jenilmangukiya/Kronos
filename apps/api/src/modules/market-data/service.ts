import type { FastifyInstance } from "fastify";

import { AppError } from "../../errors/app-error.js";
import { AngelMarketDataProvider } from "./providers/angel.provider.js";
import type {
  CandlesQuery,
  InstrumentSearchQuery,
  LtpQuery,
  OptionChainQuery,
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

  async getOptionChain(userId: string, query: OptionChainQuery) {
    const brokerAccount = await this.getActiveAngelBrokerAccount(
      userId,
      query.brokerAccountId,
    );

    const indexInstrument = angelInstrumentProvider.getIndexInstrument(
      query.symbol,
    );

    if (!indexInstrument) {
      throw new AppError(
        "Unsupported option chain symbol",
        400,
        "OPTION_CHAIN_SYMBOL_NOT_SUPPORTED",
      );
    }

    const marketDataProvider = new AngelMarketDataProvider();

    const indexLtpResponse = await marketDataProvider.getLtp({
      apiKey: brokerAccount.apiKey!,
      accessToken: brokerAccount.accessToken!,
      query: {
        brokerAccountId: query.brokerAccountId,
        exchange: indexInstrument.exchange,
        tradingsymbol: indexInstrument.tradingsymbol,
        symboltoken: indexInstrument.symboltoken,
      },
    });

    const underlyingLtp = Number(indexLtpResponse?.data?.ltp);

    if (!underlyingLtp) {
      throw new AppError(
        "Underlying LTP not received",
        502,
        "UNDERLYING_LTP_MISSING",
      );
    }

    const contracts = await angelInstrumentProvider.getOptionContracts({
      symbol: query.symbol,
      expiry: query.expiry,
    });

    if (!contracts.length) {
      throw new AppError(
        "Option contracts not found",
        404,
        "OPTION_CONTRACTS_NOT_FOUND",
      );
    }

    const availableStrikes = [
      ...new Set(contracts.map((item) => item.strike)),
    ].sort((a, b) => a - b);

    const atmStrike = availableStrikes.reduce((nearest, strike) => {
      return Math.abs(strike - underlyingLtp) <
        Math.abs(nearest - underlyingLtp)
        ? strike
        : nearest;
    }, availableStrikes[0]!);

    const atmIndex = availableStrikes.indexOf(atmStrike);
    const strikeRange = query.strikeRange ?? 10;

    const selectedStrikes = availableStrikes.slice(
      Math.max(0, atmIndex - strikeRange),
      atmIndex + strikeRange + 1,
    );

    const selectedContracts = contracts.filter((contract) =>
      selectedStrikes.includes(contract.strike),
    );

    const tokens = selectedContracts.map((contract) => contract.token);

    const quoteResponse = await marketDataProvider.getQuoteForTokens({
      apiKey: brokerAccount.apiKey!,
      accessToken: brokerAccount.accessToken!,
      exchange: "NFO",
      tokens,
      mode: "FULL",
    });

    const fetchedQuotes = quoteResponse?.data?.fetched ?? [];

    const quoteByToken = new Map(
      fetchedQuotes.map((quote: any) => [String(quote.symbolToken), quote]),
    );

    const rows = selectedStrikes.map((strike) => {
      const ceContract = selectedContracts.find(
        (contract) =>
          contract.strike === strike && contract.optionType === "CE",
      );

      const peContract = selectedContracts.find(
        (contract) =>
          contract.strike === strike && contract.optionType === "PE",
      );

      const ceQuote: any = ceContract
        ? quoteByToken.get(String(ceContract.token))
        : null;

      const peQuote: any = peContract
        ? quoteByToken.get(String(peContract.token))
        : null;

      return {
        strike,
        ce: ceContract
          ? {
              token: ceContract.token,
              symbol: ceContract.symbol,
              ltp: ceQuote?.ltp ?? null,
              oi: ceQuote?.opnInterest ?? null,
              volume: ceQuote?.tradeVolume ?? null,
              bid: ceQuote?.depth?.buy?.[0]?.price ?? null,
              ask: ceQuote?.depth?.sell?.[0]?.price ?? null,
            }
          : null,
        pe: peContract
          ? {
              token: peContract.token,
              symbol: peContract.symbol,
              ltp: peQuote?.ltp ?? null,
              oi: peQuote?.opnInterest ?? null,
              volume: peQuote?.tradeVolume ?? null,
              bid: peQuote?.depth?.buy?.[0]?.price ?? null,
              ask: peQuote?.depth?.sell?.[0]?.price ?? null,
            }
          : null,
      };
    });
    const totalCallOi = rows.reduce((sum, row) => {
      return sum + Number(row.ce?.oi ?? 0);
    }, 0);

    const totalPutOi = rows.reduce((sum, row) => {
      return sum + Number(row.pe?.oi ?? 0);
    }, 0);

    const pcr =
      totalCallOi > 0 ? Number((totalPutOi / totalCallOi).toFixed(2)) : null;

    const maxCallOiRow = rows.reduce((max, row) => {
      return Number(row.ce?.oi ?? 0) > Number(max.ce?.oi ?? 0) ? row : max;
    }, rows[0]!);

    const maxPutOiRow = rows.reduce((max, row) => {
      return Number(row.pe?.oi ?? 0) > Number(max.pe?.oi ?? 0) ? row : max;
    }, rows[0]!);

    return {
      symbol: query.symbol,
      expiry: query.expiry,
      underlying: {
        ltp: underlyingLtp,
        atmStrike,
        exchange: indexInstrument.exchange,
        symboltoken: indexInstrument.symboltoken,
      },
      strikeRange,
      count: rows.length,
      summary: {
        totalCallOi,
        totalPutOi,
        pcr,
        maxCallOiStrike: maxCallOiRow.strike,
        maxPutOiStrike: maxPutOiRow.strike,
      },
      rows,
    };
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
