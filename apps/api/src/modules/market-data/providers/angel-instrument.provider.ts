import axios from "axios";

import { config } from "@kronos/config";

import { AppError } from "../../../errors/app-error.js";
import type { AngelInstrument, InstrumentSearchQuery } from "../types.js";

export class AngelInstrumentProvider {
  private instruments: AngelInstrument[] | null = null;
  private lastFetchedAt: Date | null = null;

  async search(query: InstrumentSearchQuery) {
    const instruments = await this.getInstruments();

    const searchText = query.query.toLowerCase();
    const limit = query.limit ?? 25;

    return instruments
      .filter((instrument) => {
        const matchesQuery =
          instrument.symbol.toLowerCase().includes(searchText) ||
          instrument.name.toLowerCase().includes(searchText) ||
          instrument.token === query.query;

        const matchesExchange = query.exchange
          ? instrument.exch_seg === query.exchange
          : true;

        const matchesInstrumentType = query.instrumentType
          ? instrument.instrumenttype === query.instrumentType
          : true;

        return matchesQuery && matchesExchange && matchesInstrumentType;
      })
      .slice(0, limit);
  }

  async refresh() {
    this.instruments = await this.downloadInstruments();
    this.lastFetchedAt = new Date();

    return {
      success: true,
      count: this.instruments.length,
      refreshedAt: this.lastFetchedAt,
    };
  }

  async getOptionExpiries(query: {
    symbol: string;
    exchange?: string;
    instrumentType?: string;
  }) {
    const instruments = await this.getInstruments();

    const symbol = query.symbol.toUpperCase();
    const exchange = query.exchange ?? "NFO";
    const instrumentType = query.instrumentType ?? "OPTIDX";

    const expiries = instruments
      .filter((instrument) => {
        return (
          instrument.name.toUpperCase() === symbol &&
          instrument.exch_seg === exchange &&
          instrument.instrumenttype === instrumentType &&
          instrument.expiry
        );
      })
      .map((instrument) => instrument.expiry);

    return [...new Set(expiries)].sort((a, b) => {
      return (
        this.parseAngelExpiry(a).getTime() - this.parseAngelExpiry(b).getTime()
      );
    });
  }

  private parseAngelExpiry(expiry: string) {
    const day = Number(expiry.slice(0, 2));
    const monthText = expiry.slice(2, 5).toUpperCase();
    const year = Number(expiry.slice(5));

    const monthMap: Record<string, number> = {
      JAN: 0,
      FEB: 1,
      MAR: 2,
      APR: 3,
      MAY: 4,
      JUN: 5,
      JUL: 6,
      AUG: 7,
      SEP: 8,
      OCT: 9,
      NOV: 10,
      DEC: 11,
    };

    return new Date(year, monthMap[monthText], day);
  }

  private async getInstruments() {
    if (!this.instruments) {
      this.instruments = await this.downloadInstruments();
      this.lastFetchedAt = new Date();
    }

    return this.instruments;
  }

  private async downloadInstruments() {
    try {
      const response = await axios.get<AngelInstrument[]>(
        config.angel.instrumentMasterUrl,
        {
          timeout: 30000,
        },
      );

      return response.data;
    } catch {
      throw new AppError(
        "Failed to download Angel instrument master",
        502,
        "ANGEL_INSTRUMENT_MASTER_DOWNLOAD_FAILED",
      );
    }
  }
}
