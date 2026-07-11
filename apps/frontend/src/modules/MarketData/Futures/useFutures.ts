import { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBrokerAccounts } from "../../../services/broker/BrokerQueries";
import {
  useGetFutures,
  useStartLive,
  useSubscribeLive,
  useGetLiveLatestMany,
} from "../../../services/market-data/MarketDataQueries";
import { FutureContractUI, FuturesSummaryData } from "./types";

export const useFutures = () => {
  const queryClient = useQueryClient();
  const { data: accounts, isLoading: isLoadingAccounts } = useBrokerAccounts();

  const activeAccount = useMemo(() => {
    return accounts?.find((acct) => acct.hasSession && !acct.sessionExpired) || null;
  }, [accounts]);

  const brokerAccountId = activeAccount?.id || "";

  const [symbol, setSymbol] = useState("NIFTY");

  const {
    data: futuresData,
    isLoading: isLoadingFutures,
    error: futuresError,
    refetch: refetchFutures,
  } = useGetFutures(
    { brokerAccountId, symbol },
    { enabled: Boolean(brokerAccountId && symbol) }
  );

  const startWs = useStartLive();
  const subscribeTokens = useSubscribeLive();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [tickMap, setTickMap] = useState<Record<string, number>>({});

  const tokensList = useMemo(() => {
    if (!futuresData?.rows) return [];
    return futuresData.rows.map((row) => row.token);
  }, [futuresData]);

  useEffect(() => {
    if (!brokerAccountId || !futuresData?.liveSubscription?.tokens || tokensList.length === 0) {
      setIsSubscribed(false);
      return;
    }

    let isMounted = true;
    setIsSubscribed(false);
    setTickMap({});

    const initializeLiveFeed = async () => {
      try {
        await startWs.mutateAsync(brokerAccountId);
        
        let connected = false;
        for (let i = 0; i < 5; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (!isMounted) return;
          try {
            await subscribeTokens.mutateAsync({
              brokerAccountId,
              tokens: futuresData.liveSubscription.tokens,
            });
            connected = true;
            break;
          } catch (err: any) {
            const isDisconnectedError = 
              err?.response?.data?.code === "LIVE_MARKET_DATA_DISCONNECTED" || 
              err?.response?.status === 400;

            if (isDisconnectedError && i < 4) {
              console.log("WebSocket connecting, retrying subscription in 1s...");
              continue;
            }
            throw err;
          }
        }

        if (isMounted && connected) {
          setIsSubscribed(true);
        }
      } catch (err) {
        console.error("Error setting up live subscription:", err);
      }
    };

    initializeLiveFeed();

    return () => {
      isMounted = false;
      // Do not stop the full WebSocket yet on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brokerAccountId, symbol, tokensList]);

  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  useEffect(() => {
    setConsecutiveErrors(0);
  }, [symbol]);

  const isQueryEnabled = Boolean(
    isSubscribed && 
    brokerAccountId && 
    tokensList.length > 0 && 
    consecutiveErrors < 5
  );

  const { data: latestTicks, error: latestTicksError } = useGetLiveLatestMany(
    brokerAccountId,
    tokensList,
    {
      enabled: isQueryEnabled,
      refetchInterval: isQueryEnabled ? 1000 : false,
      retry: false,
    }
  );

  useEffect(() => {
    if (latestTicks) {
      setConsecutiveErrors(0);
    }
  }, [latestTicks]);

  useEffect(() => {
    if (latestTicksError) {
      setConsecutiveErrors((prev) => prev + 1);
    }
  }, [latestTicksError]);

  const prevTickMapRef = useRef<Record<string, number>>({});

  const tickDirectionMap = useMemo(() => {
    const directions: Record<string, "up" | "down" | "flat"> = {};
    if (latestTicks?.ticks) {
      setTickMap((prev) => {
        const next = { ...prev };
        latestTicks.ticks.forEach((t) => {
          if (t.tick?.ltp !== undefined && t.tick?.ltp !== null) {
            const prevLtp = prevTickMapRef.current[t.token] || prev[t.token];
            if (prevLtp !== undefined) {
              if (t.tick.ltp > prevLtp) {
                directions[t.token] = "up";
              } else if (t.tick.ltp < prevLtp) {
                directions[t.token] = "down";
              } else {
                directions[t.token] = "flat";
              }
            }
            next[t.token] = t.tick.ltp;
            prevTickMapRef.current[t.token] = t.tick.ltp;
          }
        });
        return next;
      });
    }
    return directions;
  }, [latestTicks]);

  const derivedRows = useMemo((): FutureContractUI[] => {
    if (!futuresData?.rows) return [];
    return futuresData.rows.map((row) => {
      const liveLtp = tickMap[row.token] ?? row.ltp;
      
      let change: number | null = null;
      let changePercent: number | null = null;
      
      if (liveLtp !== null && row.close !== null && row.close !== 0) {
        change = liveLtp - row.close;
        changePercent = (change / row.close) * 100;
      }

      return {
        ...row,
        ltp: liveLtp,
        change,
        changePercent,
        direction: tickDirectionMap[row.token] || "flat",
      };
    });
  }, [futuresData?.rows, tickMap, tickDirectionMap]);

  const summary = useMemo((): FuturesSummaryData | null => {
    if (derivedRows.length === 0 || !derivedRows[0]) return null;
    const firstRow = derivedRows[0];
    
    let totalOi = 0;
    let totalVolume = 0;
    
    derivedRows.forEach((row) => {
      totalOi += row.oi || 0;
      totalVolume += row.volume || 0;
    });

    return {
      symbol,
      contractCount: derivedRows.length,
      nearMonthLtp: firstRow.ltp,
      nearMonthExpiry: firstRow.expiry,
      totalOi,
      totalVolume,
    };
  }, [derivedRows, symbol]);

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["market-data", "futures", brokerAccountId, symbol],
    });
    refetchFutures();
  };

  return {
    accounts,
    activeAccount,
    symbol,
    setSymbol,
    futures: futuresData,
    derivedRows,
    summary,
    isLoading: isLoadingAccounts || isLoadingFutures,
    futuresError: futuresError ? (futuresError as any)?.response?.data?.message || futuresError.message : null,
    isLive: isSubscribed,
    refresh,
  };
};
