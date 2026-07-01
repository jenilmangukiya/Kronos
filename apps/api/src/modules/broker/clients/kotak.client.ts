import axios, { AxiosError } from "axios";

import { config } from "@kronos/config";

import { AppError } from "../../../errors/app-error.js";
import type {
  BrokerSessionResult,
  CreateBrokerSessionInput,
} from "../types.js";
import type { BrokerClient } from "./broker-client.js";

interface KotakTradeApiLoginResponse {
  data?: {
    token?: string;
    sid?: string;
    rid?: string;
    ucc?: string;
    greetingName?: string;
    dataCenter?: string;
    status?: string;
  };
}

interface KotakTradeApiValidateResponse {
  data?: {
    token?: string;
    sid?: string;
    rid?: string;
    baseUrl?: string;
    ucc?: string;
    greetingName?: string;
    dataCenter?: string;
    status?: string;
  };
}

interface JwtPayload {
  exp?: number;
  iat?: number;
  scope?: string[];
  ucc?: string;
}

export class KotakClient implements BrokerClient {
  private readonly http = axios.create({
    baseURL: config.kotak.loginBaseUrl,
    timeout: 15000,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  getName() {
    return "KOTAK";
  }

  async createSession(params: {
    clientId: string;
    apiKey: string;
    input: CreateBrokerSessionInput;
  }): Promise<BrokerSessionResult> {
    const { clientId, apiKey, input } = params;

    if (
      !clientId ||
      !apiKey ||
      !input.mobileNumber ||
      !input.totp ||
      !input.mpin
    ) {
      throw new AppError(
        "Missing Kotak login details",
        400,
        "KOTAK_LOGIN_DETAILS_MISSING",
      );
    }

    try {
      /**
       * Confirmed Kotak flow:
       *
       * 1. tradeApiLogin
       *    - uses API access token, mobile number, UCC/clientId, TOTP
       *    - returns temporary view token + sid
       *
       * 2. tradeApiValidate
       *    - uses view token + sid + MPIN
       *    - returns trading token + trading sid + dynamic baseUrl
       *
       * 3. Save final token/sid/baseUrl in DB
       */

      const loginResponse = await this.tradeApiLogin({
        clientId,
        mobileNumber: input.mobileNumber,
        totp: input.totp,
        apiAccessToken: apiKey,
      });

      const viewToken = loginResponse.data?.data?.token;
      const viewSid = loginResponse.data?.data?.sid;

      if (!viewToken || !viewSid) {
        throw new AppError(
          "Kotak login token not received",
          502,
          "KOTAK_LOGIN_TOKEN_MISSING",
        );
      }

      const validateResponse = await this.tradeApiValidate({
        mpin: input.mpin,
        viewToken,
        viewSid,
      });

      const tradingToken = validateResponse.data?.data?.token;
      const tradingSid = validateResponse.data?.data?.sid;
      const baseUrl = validateResponse.data?.data?.baseUrl;

      if (!tradingToken || !tradingSid || !baseUrl) {
        throw new AppError(
          "Kotak trading session details not received",
          502,
          "KOTAK_TRADING_SESSION_MISSING",
        );
      }

      const expiresAt = this.getJwtExpiryDate(tradingToken);

      if (!expiresAt) {
        throw new AppError(
          "Kotak trading token expiry not found",
          502,
          "KOTAK_TOKEN_EXPIRY_MISSING",
        );
      }

      return {
        sessionSid: tradingSid,
        sessionBaseUrl: baseUrl,
        tokenExpiresAt: expiresAt,
        accessToken: "",
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const message = this.getAxiosErrorMessage(error);

      throw new AppError(
        message || "Failed to create Kotak session",
        502,
        "KOTAK_SESSION_CREATE_FAILED",
      );
    }
  }

  private async tradeApiLogin(params: {
    clientId: string;
    mobileNumber: string;
    totp: string;
    apiAccessToken: string;
  }) {
    return this.http.post<KotakTradeApiLoginResponse>(
      "/login/1.0/tradeApiLogin",
      {
        mobileNumber: params.mobileNumber,
        ucc: params.clientId,
        totp: params.totp,
      },
      {
        headers: {
          Authorization: `Bearer ${params.apiAccessToken}`,
        },
      },
    );
  }

  private async tradeApiValidate(params: {
    mpin: string;
    viewToken: string;
    viewSid: string;
  }) {
    return this.http.post<KotakTradeApiValidateResponse>(
      "/login/1.0/tradeApiValidate",
      {
        mpin: params.mpin,
      },
      {
        headers: {
          Auth: params.viewToken,
          Sid: params.viewSid,
        },
      },
    );
  }

  private getJwtExpiryDate(token: string): Date | null {
    try {
      const [, payloadBase64] = token.split(".");

      if (!payloadBase64) {
        return null;
      }

      const payload = JSON.parse(
        Buffer.from(payloadBase64, "base64url").toString("utf8"),
      ) as JwtPayload;

      if (!payload.exp) {
        return null;
      }

      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }

  private getAxiosErrorMessage(error: unknown) {
    if (!axios.isAxiosError(error)) {
      return null;
    }

    const axiosError = error as AxiosError<{
      error?: Array<{
        code?: string | number;
        message?: string;
      }>;
      message?: string;
    }>;

    const responseData = axiosError.response?.data;

    const firstError = responseData?.error?.[0]?.message;

    if (firstError) {
      return firstError;
    }

    if (responseData?.message) {
      return responseData.message;
    }

    return axiosError.message;
  }
}
