import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetStrategy,
  useGetStrategyLogs,
  useStartStrategy,
  useStopStrategy,
  useStopAndExitStrategy,
  useResetStrategy,
  useDuplicateStrategy,
  useStrategyRuntimeStatus,
} from "../../../services/strategies/StrategyQueries";
import { useGetPaperPositions, useGetPaperOrders } from "../../../services/paper-trading/PaperTradingQueries";
import { useStrategyRealtime } from "../../../services/realtime/useStrategyRealtime";
import { useLiveLatestTick } from "../../../services/market-data/MarketDataQueries";
import { useStrategyCandles } from "../../../services/market-data/useCandles";
import { config } from "../../../config";

export const useStrategyDetails = () => {
  const { id = "" } = useParams<{ id: string }>();
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [isBackendOffline, setIsBackendOffline] = useState(false);
  const [, setConsecutiveFailures] = useState(0);

  const fastPollInterval = isBackendOffline ? false : 1000;
  const queriesEnabled = !isBackendOffline;

  const {
    data: strategy,
    isLoading: isStrategyLoading,
    error: strategyError,
  } = useGetStrategy(id, {
    enabled: Boolean(id) && queriesEnabled,
  });

  const realtime = useStrategyRealtime(id, {
    onDataChanged: (event) => {
      if (config.isDev) {
        console.log("[Realtime] strategy_data_changed", event);
        console.log("[Realtime] invalidating scopes", event.scopes);
      }

      event.scopes.forEach((scope) => {
        if (scope === "logs") {
          queryClient.invalidateQueries({ queryKey: ["strategies", id, "logs"] });
        } else if (scope === "orders") {
          queryClient.invalidateQueries({ queryKey: ["paper-trading", "orders"] });
        } else if (scope === "positions") {
          queryClient.invalidateQueries({ queryKey: ["paper-trading", "positions"] });
        } else if (scope === "strategy") {
          queryClient.invalidateQueries({ queryKey: ["strategies", id] });
          queryClient.invalidateQueries({ queryKey: ["strategies"] });
        } else if (scope === "runtime") {
          if (!realtime.isConnected) {
            queryClient.invalidateQueries({ queryKey: ["strategies", id, "runtime-status"] });
          }
        }
      });
    },
  });
  const realtimeConnected = realtime.isConnected;
  const isRunning = strategy?.status === "RUNNING";
  const underlyingToken = strategy?.rules?.underlyingToken || "";
  const brokerAccountId = strategy?.brokerAccountId || "";

  const wsAdaptivePollInterval = realtimeConnected ? false : (isBackendOffline ? false : 5000);

  // Poll logs (fallback when WebSocket disconnected)
  const {
    data: logs = [],
    error: logsError,
  } = useGetStrategyLogs(id, {
    refetchInterval: wsAdaptivePollInterval,
    enabled: Boolean(id) && queriesEnabled,
  });

  // Poll runtime status every 1 second (REST fallback - only active when WS is disconnected and strategy is running)
  const {
    data: restRuntimeStatus,
    error: runtimeStatusError,
  } = useStrategyRuntimeStatus(id, {
    refetchInterval: (realtimeConnected || !isRunning) ? false : fastPollInterval,
    enabled: !realtimeConnected && queriesEnabled,
  });

  const runtimeStatus = realtime.runtimeStatus ?? restRuntimeStatus;

  // Poll paper positions (fallback when WebSocket disconnected)
  const {
    data: positions = [],
    isLoading: isPositionsLoading,
    error: positionsError,
  } = useGetPaperPositions({
    refetchInterval: wsAdaptivePollInterval,
    enabled: queriesEnabled,
  });

  // Poll paper orders (fallback when WebSocket disconnected)
  const {
    data: orders = [],
    isLoading: isOrdersLoading,
    error: ordersError,
  } = useGetPaperOrders({
    refetchInterval: wsAdaptivePollInterval,
    enabled: queriesEnabled,
  });

  const {
    data: livePriceData,
    error: livePriceError,
  } = useLiveLatestTick(brokerAccountId, underlyingToken, {
    refetchInterval: fastPollInterval,
    enabled:
      Boolean(
        strategy?.status === "RUNNING" &&
        strategy?.brokerAccountId &&
        underlyingToken &&
        !realtimeConnected
      ) && queriesEnabled,
    retry: false,
  });

  const {
    data: candles = [],
    isLoading: isCandlesLoading,
    isFetching: isCandlesFetching,
    error: candlesError,
  } = useStrategyCandles(strategy, {
    enabled: queriesEnabled,
  });

  // Connection failure logic
  const strategyErrorObj = strategyError as any;
  const logsErrorObj = logsError as any;
  const runtimeStatusErrorObj = runtimeStatusError as any;
  const livePriceErrorObj = livePriceError as any;
  const candlesErrorObj = candlesError as any;
  const positionsErrorObj = positionsError as any;
  const ordersErrorObj = ordersError as any;

  const isConnError = (err: any) => {
    if (!err) return false;
    return (
      err.code === "ERR_NETWORK" ||
      !err.response ||
      err.response.status === 500 ||
      err.message?.includes("Network Error") ||
      err.message?.includes("connection refused") ||
      err.message?.includes("ERR_CONNECTION_REFUSED")
    );
  };

  const hasConnectionError =
    isConnError(strategyErrorObj) ||
    isConnError(logsErrorObj) ||
    isConnError(runtimeStatusErrorObj) ||
    isConnError(livePriceErrorObj) ||
    isConnError(candlesErrorObj) ||
    isConnError(positionsErrorObj) ||
    isConnError(ordersErrorObj);

  useEffect(() => {
    if (hasConnectionError) {
      setConsecutiveFailures((prev) => {
        const next = prev + 1;
        if (next >= 5) {
          setIsBackendOffline(true);
        }
        return next;
      });
    }
  }, [hasConnectionError]);

  useEffect(() => {
    if (realtimeConnected) {
      setIsBackendOffline(false);
      setConsecutiveFailures(0);
    }
  }, [realtimeConnected]);

  const handleRetry = () => {
    setConsecutiveFailures(0);
    setIsBackendOffline(false);
    queryClient.invalidateQueries();
  };

  const navigate = useNavigate();

  const startMutation = useStartStrategy();
  const stopMutation = useStopStrategy();
  const stopExitMutation = useStopAndExitStrategy();
  const resetMutation = useResetStrategy();
  const duplicateMutation = useDuplicateStrategy();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["strategies"] });
    queryClient.invalidateQueries({ queryKey: ["strategies", id] });
    queryClient.invalidateQueries({ queryKey: ["strategies", id, "logs"] });
    queryClient.invalidateQueries({ queryKey: ["strategies", id, "runtime-status"] });
    queryClient.invalidateQueries({ queryKey: ["paper-trading", "positions"] });
    queryClient.invalidateQueries({ queryKey: ["paper-trading", "orders"] });
    if (brokerAccountId && underlyingToken) {
      queryClient.invalidateQueries({
        queryKey: ["market-data", "live-latest", brokerAccountId, underlyingToken],
      });
    }
    if (strategy?.id) {
      queryClient.invalidateQueries({
        queryKey: ["market-data", "strategy-candles", strategy.id],
      });
    }
  };

  const handleStart = async () => {
    if (!id) return;
    try {
      setActionError(null);
      await startMutation.mutateAsync(id);
      invalidateAll();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to start strategy");
    }
  };

  const handleStop = async () => {
    if (!id) return;
    try {
      setActionError(null);
      await stopMutation.mutateAsync(id);
      invalidateAll();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to stop strategy");
    }
  };

  const handleStopExit = async () => {
    if (!id) return;
    if (!window.confirm("Stop strategy and exit open position?")) {
      return;
    }
    try {
      setActionError(null);
      await stopExitMutation.mutateAsync(id);
      invalidateAll();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to stop strategy and exit position");
    }
  };

  const handleReset = async () => {
    if (!id) return;
    if (!window.confirm("Reset strategy? This will clear last trigger state but will not delete orders or positions.")) {
      return;
    }
    try {
      setActionError(null);
      await resetMutation.mutateAsync(id);
      invalidateAll();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to reset strategy");
    }
  };

  const handleDuplicate = async () => {
    if (!id) return;
    if (!window.confirm("Create a copy of this strategy?")) {
      return;
    }
    try {
      setActionError(null);
      const newStrategy = await duplicateMutation.mutateAsync(id);
      invalidateAll();
      if (newStrategy && newStrategy.id) {
        navigate(`/dashboard/strategies/${newStrategy.id}`);
      }
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to duplicate strategy");
    }
  };

  const underlyingTick = realtime.underlyingTick;
  const tradeTick = realtime.tradeTick;

  const watchCurrentPrice =
    underlyingTick?.ltp ??
    runtimeStatus?.liveTick?.ltp ??
    livePriceData?.tick?.ltp ??
    null;

  const openPosition = positions.find((pos) => pos.strategyId === id && pos.status === "OPEN");
  const latestTradeCandleClose = candles.length > 0 ? candles[candles.length - 1]?.close : null;
  const isUnderlyingSameAsTrade = strategy?.rules?.underlyingToken === strategy?.trade?.token;

  const tradeCurrentPrice =
    tradeTick?.ltp ??
    openPosition?.ltp ??
    (openPosition as any)?.currentPrice ??
    (openPosition as any)?.livePrice ??
    runtimeStatus?.tradeTick?.ltp ??
    latestTradeCandleClose ??
    openPosition?.avgPrice ??
    (isUnderlyingSameAsTrade ? watchCurrentPrice : null);

  const displayUnderlyingTick = underlyingTick || (watchCurrentPrice !== null ? { ltp: watchCurrentPrice } as any : null);
  const displayTradeTick = tradeTick || (tradeCurrentPrice !== null ? { ltp: tradeCurrentPrice } as any : null);

  // Map positions to inject/override LTP from WebSocket tradeTick or other fallbacks
  const mappedPositions = positions.map((pos) => {
    if (pos.strategyId !== id || pos.status !== "OPEN") {
      return pos;
    }

    const liveLtp = tradeCurrentPrice ?? pos.ltp;

    if (liveLtp === undefined || liveLtp === null) {
      return pos;
    }

    // Calculate new PNL on the fly
    const isLong = pos.side === "LONG";
    const priceDiff = isLong ? (liveLtp - pos.avgPrice) : (pos.avgPrice - liveLtp);
    const unrealizedPnl = priceDiff * pos.quantity;
    const totalPnl = (pos.realizedPnl || 0) + unrealizedPnl;

    return {
      ...pos,
      ltp: liveLtp,
      unrealizedPnl,
      totalPnl,
    };
  });

  const isLoading = isStrategyLoading;
  const error = strategyError
    ? ((strategyError as any).response?.data?.message || (strategyError as any).message)
    : logsError
    ? ((logsError as any).response?.data?.message || (logsError as any).message)
    : null;

  return {
    id,
    strategy,
    logs,
    positions: mappedPositions,
    orders,
    livePriceData,
    livePriceError,
    isLoading: isLoading || isPositionsLoading || isOrdersLoading,
    runtimeStatus,
    error: error || (runtimeStatusError ? ((runtimeStatusError as any).response?.data?.message || (runtimeStatusError as any).message) : null) || realtime.error,
    actionError,
    setActionError,
    handleStart,
    handleStop,
    handleStopExit,
    handleReset,
    handleDuplicate,
    isStartLoading: startMutation.isPending,
    isStopLoading: stopMutation.isPending,
    isStopExitLoading: stopExitMutation.isPending,
    isResetLoading: resetMutation.isPending,
    isDuplicateLoading: duplicateMutation.isPending,
    isActionLoading:
      startMutation.isPending ||
      stopMutation.isPending ||
      stopExitMutation.isPending ||
      resetMutation.isPending ||
      duplicateMutation.isPending,
    candles,
    isCandlesLoading,
    isCandlesFetching,
    candlesError,
    realtimeConnected,
    isBackendOffline,
    handleRetry,
    watchCurrentPrice,
    tradeCurrentPrice,
    displayUnderlyingTick,
    displayTradeTick,
  };
};
