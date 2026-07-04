import { UseMutationOptions, useMutation, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  getOptionExpiries,
  getOptionChain,
  startLiveWebSocket,
  stopLiveWebSocket,
  subscribeLiveTokens,
  getLatestManyTicks,
  OptionChain,
  LiveSubscribeRequest,
  LatestTicksResponse,
  getFutureExpiries,
  getFutures,
  FuturesResponse,
} from "./MarketDataService";

export const useOptionExpiries = (
  symbol: string,
  options?: Partial<UseQueryOptions<string[], AxiosError>>
) =>
  useQuery<string[], AxiosError>({
    queryKey: ["market-data", "option-expiries", symbol],
    queryFn: () => getOptionExpiries(symbol),
    enabled: Boolean(symbol) && (options?.enabled ?? true),
    ...options,
  });

export const useOptionChainQuery = (
  brokerAccountId: string,
  symbol: string,
  expiry: string,
  strikeRange = 10,
  options?: Partial<UseQueryOptions<OptionChain, AxiosError>>
) =>
  useQuery<OptionChain, AxiosError>({
    queryKey: ["market-data", "option-chain", brokerAccountId, symbol, expiry, strikeRange],
    queryFn: () => getOptionChain(brokerAccountId, symbol, expiry, strikeRange),
    enabled: Boolean(brokerAccountId && symbol && expiry) && (options?.enabled ?? true),
    ...options,
  });

export const useStartLiveWebSocket = (
  options?: UseMutationOptions<any, AxiosError, string>
) =>
  useMutation<any, AxiosError, string>({
    mutationFn: startLiveWebSocket,
    ...options,
  });

export const useStopLiveWebSocket = (
  options?: UseMutationOptions<any, AxiosError, string>
) =>
  useMutation<any, AxiosError, string>({
    mutationFn: stopLiveWebSocket,
    ...options,
  });

export const useSubscribeLiveTokens = (
  options?: UseMutationOptions<any, AxiosError, LiveSubscribeRequest>
) =>
  useMutation<any, AxiosError, LiveSubscribeRequest>({
    mutationFn: subscribeLiveTokens,
    ...options,
  });

export const useLiveLatestManyTicks = (
  brokerAccountId: string,
  tokens: string[],
  options?: Partial<UseQueryOptions<LatestTicksResponse, AxiosError>>
) =>
  useQuery<LatestTicksResponse, AxiosError>({
    queryKey: ["market-data", "live-latest-many", brokerAccountId, tokens],
    queryFn: () => getLatestManyTicks(brokerAccountId, tokens),
    enabled: Boolean(brokerAccountId && tokens.length > 0) && (options?.enabled ?? true),
    ...options,
  });

export const useGetFutureExpiries = (
  symbol: string,
  options?: Partial<UseQueryOptions<string[], AxiosError>>
) =>
  useQuery<string[], AxiosError>({
    queryKey: ["market-data", "future-expiries", symbol],
    queryFn: () => getFutureExpiries(symbol),
    enabled: Boolean(symbol) && (options?.enabled ?? true),
    ...options,
  });

export const useGetFutures = (
  { brokerAccountId, symbol }: { brokerAccountId: string; symbol: string },
  options?: Partial<UseQueryOptions<FuturesResponse, AxiosError>>
) =>
  useQuery<FuturesResponse, AxiosError>({
    queryKey: ["market-data", "futures", brokerAccountId, symbol],
    queryFn: () => getFutures(brokerAccountId, symbol),
    enabled: Boolean(brokerAccountId && symbol) && (options?.enabled ?? true),
    ...options,
  });

// Aliases for live hooks requested in the prompt
export const useStartLive = useStartLiveWebSocket;
export const useSubscribeLive = useSubscribeLiveTokens;
export const useGetLiveLatestMany = useLiveLatestManyTicks;
