import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { getStrategyCandles, Candle } from "./candles";
import { Strategy } from "../strategies/StrategyService";

export const useStrategyCandles = (
  strategy: Strategy | null | undefined,
  options?: Partial<UseQueryOptions<Candle[], AxiosError>>
) => {
  const brokerAccountId = strategy?.brokerAccountId;
  const token = strategy?.trade?.token;
  const exchange = strategy?.trade?.exchange;

  const isEnabled = Boolean(
    brokerAccountId &&
    token &&
    exchange
  );

  return useQuery<Candle[], AxiosError>({
    queryKey: ["market-data", "strategy-candles", strategy?.id],
    queryFn: () => {
      if (!brokerAccountId || !token || !exchange) {
        throw new Error("Missing required strategy trade data for candles");
      }
      return getStrategyCandles({
        brokerAccountId,
        exchange,
        symboltoken: token,
        interval: "FIVE_MINUTE",
      });
    },
    enabled: isEnabled && (options?.enabled ?? true),
    refetchInterval: 30000, // Poll every 30 seconds
    refetchOnWindowFocus: false, // Avoid rate-limiting on tab switches
    retry: 1, // Minimize retry spam on failure
    ...options,
  });
};
