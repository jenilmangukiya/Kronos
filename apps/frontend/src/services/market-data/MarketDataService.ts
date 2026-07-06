import { axiosAuth } from "../api/axios";
import {
  OPTION_EXPIRIES,
  OPTION_CHAIN,
  LIVE_START,
  LIVE_SUBSCRIBE,
  LIVE_LATEST_MANY,
  LIVE_LATEST,
  LIVE_STOP,
  GET_FUTURE_EXPIRIES,
  GET_FUTURES,
} from "./MarketDataApiRoutes";

export interface OptionLeg {
  token: string;
  symbol: string;
  ltp: number | null;
  oi: number | null;
  volume: number | null;
  bid: number | null;
  ask: number | null;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
}

export interface OptionChainRow {
  strike: number;
  ce: OptionLeg | null;
  pe: OptionLeg | null;
}

export interface OptionChain {
  symbol: string;
  expiry: string;
  underlying: {
    ltp: number;
    atmStrike: number;
    exchange: string;
    symboltoken: string;
  };
  strikeRange: number;
  count: number;
  summary: {
    totalCallOi: number;
    totalPutOi: number;
    pcr: number | null;
    maxCallOiStrike: number;
    maxPutOiStrike: number;
  };
  liveSubscription: {
    tokens: {
      exchangeType: number;
      tokens: string[];
    }[];
  };
  rows: OptionChainRow[];
}

export interface LiveSubscriptionToken {
  exchangeType: number;
  tokens: string[];
}

export interface LiveSubscribeRequest {
  brokerAccountId: string;
  tokens: LiveSubscriptionToken[];
}

export interface TickData {
  token: string;
  sequenceNumber: string;
  exchangeTimestamp: number;
  ltp: number;
}

export interface LatestTicksResponse {
  brokerAccountId: string;
  ticks: {
    token: string;
    tick: TickData | null;
  }[];
}

export const getOptionExpiries = async (symbol: string): Promise<string[]> => {
  const response = await axiosAuth.get<string[]>(OPTION_EXPIRIES, {
    params: { symbol },
  });
  return response.data;
};

export const getOptionChain = async (
  brokerAccountId: string,
  symbol: string,
  expiry: string,
  strikeRange = 10
): Promise<OptionChain> => {
  const response = await axiosAuth.get<OptionChain>(OPTION_CHAIN, {
    params: { brokerAccountId, symbol, expiry, strikeRange },
  });
  return response.data;
};

export const startLiveWebSocket = async (
  brokerAccountId: string
): Promise<any> => {
  const response = await axiosAuth.post<any>(LIVE_START, null, {
    params: { brokerAccountId },
  });
  return response.data;
};

export const stopLiveWebSocket = async (
  brokerAccountId: string
): Promise<any> => {
  const response = await axiosAuth.post<any>(LIVE_STOP, null, {
    params: { brokerAccountId },
  });
  return response.data;
};

export const subscribeLiveTokens = async (
  data: LiveSubscribeRequest
): Promise<any> => {
  const response = await axiosAuth.post<any>(LIVE_SUBSCRIBE, data);
  return response.data;
};

export interface LiveLatestTickResponse {
  brokerAccountId: string;
  token: string;
  tick: TickData | null;
}

export const getLiveLatestTick = async (
  brokerAccountId: string,
  token: string
): Promise<LiveLatestTickResponse> => {
  const response = await axiosAuth.get<LiveLatestTickResponse>(LIVE_LATEST, {
    params: {
      brokerAccountId,
      token,
    },
  });
  return response.data;
};

export const getLatestManyTicks = async (
  brokerAccountId: string,
  tokens: string[]
): Promise<LatestTicksResponse> => {
  const response = await axiosAuth.get<LatestTicksResponse>(LIVE_LATEST_MANY, {
    params: {
      brokerAccountId,
      tokens: tokens.join(","),
    },
  });
  return response.data;
};

export interface FutureContract {
  token: string;
  symbol: string;
  name: string;
  expiry: string;
  lotSize: number;
  instrumentType: string;
  exchange: string;
  ltp: number | null;
  oi: number | null;
  volume: number | null;
  bid: number | null;
  ask: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
}

export interface FuturesResponse {
  symbol: string;
  exchange: string;
  instrumentType: string;
  count: number;
  liveSubscription: {
    tokens: {
      exchangeType: number;
      tokens: string[];
    }[];
  };
  rows: FutureContract[];
}

export interface LiveLatestManyResponse {
  brokerAccountId: string;
  ticks: {
    token: string;
    tick: {
      token: string;
      sequenceNumber: string;
      exchangeTimestamp: number;
      ltp: number;
    } | null;
  }[];
}

export const getFutureExpiries = async (symbol: string): Promise<string[]> => {
  const response = await axiosAuth.get<string[]>(GET_FUTURE_EXPIRIES, {
    params: { symbol },
  });
  return response.data;
};

export const getFutures = async (
  brokerAccountId: string,
  symbol: string
): Promise<FuturesResponse> => {
  const response = await axiosAuth.get<FuturesResponse>(GET_FUTURES, {
    params: { brokerAccountId, symbol },
  });
  return response.data;
};
