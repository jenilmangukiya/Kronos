import axios, { AxiosError } from "axios";

import { config } from "@kronos/config";

import { AppError } from "../../../errors/app-error.js";
import type {
  BrokerSessionResult,
  CreateBrokerSessionInput,
} from "../types.js";
import type { BrokerClient } from "./broker-client.js";

interface AngelLoginResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data?: {
    jwtToken?: string;
    refreshToken?: string;
    feedToken?: string;
    state?: string | null;
  };
}

interface JwtPayload {
  exp?: number;
  iat?: number;
  username?: string;
}

export class AngelClient implements BrokerClient {
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

  getName() {
    return "ANGEL_ONE";
  }

  async createSession(params: {
    clientId: string;
    apiKey: string;
    input: CreateBrokerSessionInput;
  }): Promise<BrokerSessionResult> {
    const { clientId, apiKey, input } = params;

    if (!clientId || !apiKey || !input.mpin || !input.totp) {
      throw new AppError(
        "Missing Angel One login details",
        400,
        "ANGEL_LOGIN_DETAILS_MISSING",
      );
    }

    try {
      const response = await this.login({
        clientId,
        apiKey,
        mpin: input.mpin,
        totp: input.totp,
      });

      const accessToken = response.data?.jwtToken;
      const refreshToken = response.data?.refreshToken;
      const feedToken = response.data?.feedToken;

      if (!accessToken || !refreshToken || !feedToken) {
        throw new AppError(
          "Angel One session tokens not received",
          502,
          "ANGEL_SESSION_TOKENS_MISSING",
        );
      }

      const tokenExpiresAt = this.getJwtExpiryDate(accessToken);

      if (!tokenExpiresAt) {
        throw new AppError(
          "Angel One token expiry not found",
          502,
          "ANGEL_TOKEN_EXPIRY_MISSING",
        );
      }

      return {
        accessToken,
        refreshToken,
        feedToken,
        tokenExpiresAt,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const message = this.getAxiosErrorMessage(error);

      throw new AppError(
        message || "Failed to create Angel One session",
        502,
        "ANGEL_SESSION_CREATE_FAILED",
      );
    }
  }

  private async login(params: {
    clientId: string;
    apiKey: string;
    mpin: string;
    totp: string;
  }) {
    const response = await this.http.post<AngelLoginResponse>(
      "/rest/auth/angelbroking/user/v1/loginByPassword",
      {
        clientcode: params.clientId,
        password: params.mpin,
        totp: params.totp,
      },
      {
        headers: {
          "X-PrivateKey": params.apiKey,
          "X-ClientLocalIP": "127.0.0.1",
          "X-ClientPublicIP": "127.0.0.1",
          "X-MACAddress": "00:00:00:00:00:00",
        },
      },
    );

    if (!response.data.status) {
      throw new AppError(
        response.data.message || "Angel One login failed",
        401,
        response.data.errorcode || "ANGEL_LOGIN_FAILED",
      );
    }

    return response.data;
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
      message?: string;
      errorcode?: string;
      status?: boolean;
    }>;

    const responseData = axiosError.response?.data;

    if (responseData?.message) {
      return responseData.message;
    }

    return axiosError.message;
  }
}
