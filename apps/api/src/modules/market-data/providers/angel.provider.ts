import axios, { AxiosError } from "axios";

import { config } from "@kronos/config";

import { AppError } from "../../../errors/app-error.js";
import type { CandlesQuery, LtpQuery, QuoteQuery } from "../types.js";

export class AngelMarketDataProvider {
  private readonly http = axios.create({
    baseURL: config.angel.baseUrl,
    timeout: 15000,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-UserType": "USER",
      "X-SourceID": "WEB",
    },
  });

  async getLtp(params: {
    apiKey: string;
    accessToken: string;
    query: LtpQuery;
  }) {
    try {
      const response = await this.http.post(
        "/rest/secure/angelbroking/order/v1/getLtpData",
        {
          exchange: params.query.exchange,
          tradingsymbol: params.query.tradingsymbol,
          symboltoken: params.query.symboltoken,
        },
        {
          headers: this.getAuthHeaders(params),
        },
      );

      return response.data;
    } catch (error) {
      throw this.toAppError(error, "Failed to fetch LTP", "ANGEL_LTP_FAILED");
    }
  }

  async getQuote(params: {
    apiKey: string;
    accessToken: string;
    query: QuoteQuery;
  }) {
    try {
      const response = await this.http.post(
        "/rest/secure/angelbroking/market/v1/quote",
        {
          mode: params.query.mode ?? "FULL",
          exchangeTokens: {
            [params.query.exchange]: [params.query.symboltoken],
          },
        },
        {
          headers: this.getAuthHeaders(params),
        },
      );

      return response.data;
    } catch (error) {
      throw this.toAppError(
        error,
        "Failed to fetch quote",
        "ANGEL_QUOTE_FAILED",
      );
    }
  }

  async getCandles(params: {
    apiKey: string;
    accessToken: string;
    query: CandlesQuery;
  }) {
    try {
      const response = await this.http.post(
        "/rest/secure/angelbroking/historical/v1/getCandleData",
        {
          exchange: params.query.exchange,
          symboltoken: params.query.symboltoken,
          interval: params.query.interval,
          fromdate: params.query.fromDate,
          todate: params.query.toDate,
        },
        {
          headers: this.getAuthHeaders(params),
        },
      );

      return response.data;
    } catch (error) {
      throw this.toAppError(
        error,
        "Failed to fetch candles",
        "ANGEL_CANDLES_FAILED",
      );
    }
  }

  private getAuthHeaders(params: { apiKey: string; accessToken: string }) {
    return {
      Authorization: `Bearer ${params.accessToken}`,
      "X-PrivateKey": params.apiKey,
      "X-ClientLocalIP": "127.0.0.1",
      "X-ClientPublicIP": "127.0.0.1",
      "X-MACAddress": "00:00:00:00:00:00",
    };
  }

  private toAppError(error: unknown, fallbackMessage: string, code: string) {
    if (!axios.isAxiosError(error)) {
      return new AppError(fallbackMessage, 502, code);
    }

    const axiosError = error as AxiosError<{
      message?: string;
      errorcode?: string;
    }>;

    return new AppError(
      axiosError.response?.data?.message ||
        axiosError.message ||
        fallbackMessage,
      502,
      code,
    );
  }
}
