import { axiosAuth } from "../api/axios";
import {
  GET_STRATEGIES,
  CREATE_STRATEGY,
  GET_STRATEGY_BY_ID,
  UPDATE_STRATEGY,
  START_STRATEGY,
  STOP_STRATEGY,
  GET_STRATEGY_LOGS,
} from "./StrategyApiRoutes";

export type StrategyStatus = "STOPPED" | "RUNNING";
export type StrategyMode = "PAPER" | "LIVE";
export type StrategyInstrumentType = "EQUITY" | "FUTURE" | "OPTION";
export type StrategyRuleType = "UNDERLYING_CROSS_ABOVE" | "UNDERLYING_CROSS_BELOW";

export interface StrategyRules {
  type: StrategyRuleType;
  underlyingToken: string;
  underlyingExchangeType: number;
  triggerPrice: number;
}

export interface StrategyTrade {
  instrumentType: StrategyInstrumentType;
  token: string;
  symbol: string;
  exchangeType: number;
  exchange: string;
  side: "BUY" | "SELL";
  quantity: number;
}

export interface StrategyRisk {
  maxTradesPerDay?: number;
  stopLossPercent?: number;
  targetPercent?: number;
}

export interface Strategy {
  id: string;
  userId: string;
  brokerAccountId?: string | null;
  name: string;
  symbol: string;
  instrumentType: StrategyInstrumentType;
  mode: StrategyMode;
  status: StrategyStatus;
  rules: StrategyRules;
  trade: StrategyTrade;
  risk?: StrategyRisk;
  lastTriggeredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStrategyRequest {
  brokerAccountId?: string;
  name: string;
  symbol: string;
  instrumentType: StrategyInstrumentType;
  mode: StrategyMode;
  rules: StrategyRules;
  trade: StrategyTrade;
  risk?: StrategyRisk;
}

export interface StrategyLog {
  id: string;
  strategyId: string;
  message: string;
  meta?: unknown;
  createdAt: string;
}

export const getStrategies = async (): Promise<Strategy[]> => {
  const response = await axiosAuth.get<Strategy[]>(GET_STRATEGIES);
  return response.data;
};

export const getStrategyById = async (id: string): Promise<Strategy> => {
  const response = await axiosAuth.get<Strategy>(GET_STRATEGY_BY_ID(id));
  return response.data;
};

export const createStrategy = async (data: CreateStrategyRequest): Promise<Strategy> => {
  const response = await axiosAuth.post<Strategy>(CREATE_STRATEGY, data);
  return response.data;
};

export const updateStrategy = async ({
  id,
  data,
}: {
  id: string;
  data: Partial<CreateStrategyRequest>;
}): Promise<Strategy> => {
  const response = await axiosAuth.patch<Strategy>(UPDATE_STRATEGY(id), data);
  return response.data;
};

export const startStrategy = async (id: string): Promise<Strategy> => {
  const response = await axiosAuth.post<Strategy>(START_STRATEGY(id));
  return response.data;
};

export const stopStrategy = async (id: string): Promise<Strategy> => {
  const response = await axiosAuth.post<Strategy>(STOP_STRATEGY(id));
  return response.data;
};

export const getStrategyLogs = async (id: string): Promise<StrategyLog[]> => {
  const response = await axiosAuth.get<StrategyLog[]>(GET_STRATEGY_LOGS(id));
  return response.data;
};
