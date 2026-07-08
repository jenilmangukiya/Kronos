import { axiosAuth } from "../api/axios";
import {
  GET_STRATEGIES,
  CREATE_STRATEGY,
  GET_STRATEGY_BY_ID,
  UPDATE_STRATEGY,
  START_STRATEGY,
  STOP_STRATEGY,
  STOP_EXIT_STRATEGY,
  RESET_STRATEGY,
  DUPLICATE_STRATEGY,
  GET_STRATEGY_LOGS,
  GET_STRATEGY_RUNTIME_STATUS,
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
  reEntryMode?: "NO_REENTRY" | "AFTER_EXIT" | "AFTER_NEW_SIGNAL";
}

export interface Strategy {
  id: string;
  userId: string;
  brokerAccountId?: string | null;
  name: string;
  symbol: string;
  strategyType: string;
  instrumentType: StrategyInstrumentType;
  mode: StrategyMode;
  status: StrategyStatus;
  rules: StrategyRules;
  trade: StrategyTrade;
  risk?: StrategyRisk;
  lastTriggeredAt?: string | null;
  state?: Record<string, unknown> | null;
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

export const stopAndExitStrategy = async (id: string): Promise<{ strategy: Strategy; exitResult?: any }> => {
  const response = await axiosAuth.post<{ strategy: Strategy; exitResult?: any }>(STOP_EXIT_STRATEGY(id));
  return response.data;
};

export const resetStrategy = async (id: string): Promise<Strategy> => {
  const response = await axiosAuth.post<Strategy>(RESET_STRATEGY(id));
  return response.data;
};

export const duplicateStrategy = async (id: string): Promise<Strategy> => {
  const response = await axiosAuth.post<Strategy>(DUPLICATE_STRATEGY(id));
  return response.data;
};

export const getStrategyLogs = async (id: string): Promise<StrategyLog[]> => {
  const response = await axiosAuth.get<StrategyLog[]>(GET_STRATEGY_LOGS(id));
  return response.data;
};

export interface StrategyRuntimeStatus {
  strategyId: string;
  status: StrategyStatus;
  mode: StrategyMode;
  strategyType: string;
  brokerAccountId: string | null;
  hasOpenPosition: boolean;
  openPosition?: any | null;
  tradesToday: number;
  maxTradesPerDay: number;
  reEntryMode: string;
  canEnter: boolean;
  reason: string;
  liveTick?: {
    token: string;
    sequenceNumber: string;
    exchangeTimestamp: number;
    ltp: number;
  } | null;
  condition?: {
    type: string;
    triggerPrice: number;
    matched: boolean;
  } | null;
  state?: Record<string, unknown> | null;
}

export const getStrategyRuntimeStatus = async (id: string): Promise<StrategyRuntimeStatus> => {
  const response = await axiosAuth.get<StrategyRuntimeStatus>(GET_STRATEGY_RUNTIME_STATUS(id));
  return response.data;
};
