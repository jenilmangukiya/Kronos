import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBrokerAccounts } from "../../../services/broker/BrokerQueries";
import {
  useOptionExpiries,
  useOptionChainQuery,
  useStartLiveWebSocket,
  useStopLiveWebSocket,
  useSubscribeLiveTokens,
} from "../../../services/market-data/MarketDataQueries";
import { getLatestManyTicks, OptionChainRow } from "../../../services/market-data/MarketDataService";

export const useOptionChain = () => {
  const queryClient = useQueryClient();
  const { data: accounts, isLoading: isLoadingAccounts } = useBrokerAccounts();

  const activeAccount = useMemo(() => {
    return accounts?.find((acct) => acct.hasSession && !acct.sessionExpired) || null;
  }, [accounts]);

  const brokerAccountId = activeAccount?.id || "";

  const [symbol, setSymbol] = useState("NIFTY");
  const [expiry, setExpiry] = useState("");
  const [strikeRange, setStrikeRange] = useState(5);

  const { data: expiries, isLoading: isLoadingExpiries } = useOptionExpiries(symbol);

  useEffect(() => {
    if (expiries && expiries.length > 0) {
      const first = expiries[0];
      if (first !== undefined) {
        setExpiry(first);
      }
    } else {
      setExpiry("");
    }
  }, [expiries]);

  const { data: optionChain, isLoading: isLoadingOptionChain, error: optionChainError } = useOptionChainQuery(
    brokerAccountId,
    symbol,
    expiry,
    strikeRange,
    { enabled: Boolean(brokerAccountId && symbol && expiry) }
  );

  const startWs = useStartLiveWebSocket();
  const subscribeTokens = useSubscribeLiveTokens();
  const stopWs = useStopLiveWebSocket();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [tickMap, setTickMap] = useState<Record<string, number>>({});

  const tokensList = useMemo(() => {
    if (!optionChain?.rows) return [];
    const list: string[] = [];
    optionChain.rows.forEach((row) => {
      if (row.ce?.token) list.push(row.ce.token);
      if (row.pe?.token) list.push(row.pe.token);
    });
    return list;
  }, [optionChain]);

  useEffect(() => {
    if (!brokerAccountId || !optionChain?.liveSubscription?.tokens || tokensList.length === 0) {
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
              tokens: optionChain.liveSubscription.tokens,
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
      if (brokerAccountId) {
        stopWs.mutate(brokerAccountId);
      }
    };
  }, [brokerAccountId, symbol, expiry, strikeRange, tokensList]);

  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  useEffect(() => {
    setConsecutiveErrors(0);
  }, [symbol, expiry, strikeRange]);

  const isQueryEnabled = Boolean(
    isSubscribed && 
    brokerAccountId && 
    tokensList.length > 0 && 
    consecutiveErrors < 5
  );

  const { data: latestTicks } = useQuery({
    queryKey: ["market-data", "live-latest-many", brokerAccountId, tokensList],
    queryFn: async () => {
      try {
        const res = await getLatestManyTicks(brokerAccountId, tokensList);
        setConsecutiveErrors(0);
        return res;
      } catch (err) {
        setConsecutiveErrors((prev) => prev + 1);
        throw err;
      }
    },
    enabled: isQueryEnabled,
    refetchInterval: isQueryEnabled ? 1000 : false,
    retry: false,
  });

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

  const derivedRows = useMemo(() => {
    if (!optionChain?.rows) return [];
    return optionChain.rows.map((row) => {
      const ceLtp = row.ce?.token ? tickMap[row.ce.token] ?? row.ce.ltp : row.ce?.ltp ?? null;
      const peLtp = row.pe?.token ? tickMap[row.pe.token] ?? row.pe.ltp : row.pe?.ltp ?? null;

      return {
        ...row,
        ce: row.ce ? {
          ...row.ce,
          ltp: ceLtp,
          direction: row.ce.token ? tickDirectionMap[row.ce.token] || "flat" : "flat",
        } : null,
        pe: row.pe ? {
          ...row.pe,
          ltp: peLtp,
          direction: row.pe.token ? tickDirectionMap[row.pe.token] || "flat" : "flat",
        } : null,
      };
    });
  }, [optionChain?.rows, tickMap, tickDirectionMap]);

  return {
    accounts,
    activeAccount,
    symbol,
    setSymbol,
    expiry,
    setExpiry,
    expiries: expiries || [],
    strikeRange,
    setStrikeRange,
    optionChain,
    derivedRows,
    isLoading: isLoadingAccounts || isLoadingExpiries || isLoadingOptionChain,
    optionChainError: optionChainError ? (optionChainError as any)?.response?.data?.message || optionChainError.message : null,
    isLive: isSubscribed,
  };
};
