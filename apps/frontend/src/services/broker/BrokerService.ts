import { axiosAuth } from "../api/axios";
import {
  GET_ACCOUNTS,
  CONNECT_BROKER,
  CREATE_SESSION,
  GET_PROFILE,
  GET_FUNDS,
  GET_HOLDINGS,
  GET_POSITIONS,
} from "./BrokerApiRoutes";

export interface BrokerAccount {
  id: string;
  broker: string;
  clientId: string;
  hasSession: boolean;
  sessionExpired: boolean;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectBrokerRequest {
  broker: "ANGEL_ONE" | "KOTAK";
  clientId: string;
  apiKey: string;
}

export interface ConnectBrokerResponse {
  id: string;
  broker: string;
  clientId: string;
  createdAt: string;
}

export interface CreateSessionRequest {
  mpin: string;
  totp: string;
}

export interface CreateSessionResponse {
  id: string;
  broker: string;
  clientId: string;
  tokenExpiresAt: string | null;
  updatedAt: string;
}

export const getBrokerAccounts = async (): Promise<BrokerAccount[]> => {
  const response = await axiosAuth.get<BrokerAccount[]>(GET_ACCOUNTS);
  return response.data;
};

export const connectBroker = async (
  data: ConnectBrokerRequest
): Promise<ConnectBrokerResponse> => {
  const response = await axiosAuth.post<ConnectBrokerResponse>(CONNECT_BROKER, data);
  return response.data;
};

export const createSession = async ({
  id,
  data,
}: {
  id: string;
  data: CreateSessionRequest;
}): Promise<CreateSessionResponse> => {
  const response = await axiosAuth.post<CreateSessionResponse>(CREATE_SESSION(id), data);
  return response.data;
};

export const getBrokerProfile = async (id: string): Promise<any> => {
  const response = await axiosAuth.get<any>(GET_PROFILE(id));
  return response.data;
};

export const getBrokerFunds = async (id: string): Promise<any> => {
  const response = await axiosAuth.get<any>(GET_FUNDS(id));
  return response.data;
};

export const getBrokerHoldings = async (id: string): Promise<any> => {
  const response = await axiosAuth.get<any>(GET_HOLDINGS(id));
  return response.data;
};

export const getBrokerPositions = async (id: string): Promise<any> => {
  const response = await axiosAuth.get<any>(GET_POSITIONS(id));
  return response.data;
};
