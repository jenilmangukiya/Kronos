import { AppError } from "../../errors/app-error.js";
import { MarketDataService } from "./service.js";
import type {
  CandlesQuery,
  InstrumentSearchQuery,
  LtpQuery,
  OptionChainQuery,
  OptionExpiriesQuery,
  QuoteQuery,
} from "./types.js";

export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  async getLtp(userId: string | undefined, query: LtpQuery) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.marketDataService.getLtp(userId, query);
  }

  async getQuote(userId: string | undefined, query: QuoteQuery) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.marketDataService.getQuote(userId, query);
  }

  async getCandles(userId: string | undefined, query: CandlesQuery) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.marketDataService.getCandles(userId, query);
  }

  async searchInstruments(
    userId: string | undefined,
    query: InstrumentSearchQuery,
  ) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.marketDataService.searchInstruments(query);
  }

  async refreshInstruments(userId: string | undefined) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.marketDataService.refreshInstruments();
  }

  async getOptionExpiries(
    userId: string | undefined,
    query: OptionExpiriesQuery,
  ) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.marketDataService.getOptionExpiries(query);
  }

  async getOptionChain(userId: string | undefined, query: OptionChainQuery) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.marketDataService.getOptionChain(userId, query);
  }
}
