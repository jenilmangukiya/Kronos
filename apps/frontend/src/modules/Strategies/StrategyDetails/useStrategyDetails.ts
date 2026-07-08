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

export const useStrategyDetails = () => {
  const { id = "" } = useParams<{ id: string }>();
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [isBackendOffline, setIsBackendOffline] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  const pollInterval = isBackendOffline ? false : 2000;
  const fastPollInterval = isBackendOffline ? false : 1000;
  const queriesEnabled = !isBackendOffline;

  const {
    data: strategy,
    isLoading: isStrategyLoading,
    error: strategyError,
  } = useGetStrategy(id, {
    enabled: Boolean(id) && queriesEnabled,
  });

  // Poll logs every 2 seconds
  const {
    data: logs = [],
    isLoading: isLogsLoading,
    error: logsError,
  } = useGetStrategyLogs(id, {
    refetchInterval: pollInterval,
    enabled: Boolean(id) && queriesEnabled,
  });

  const realtime = useStrategyRealtime(id);
  const realtimeConnected = realtime.isConnected;

  // Poll runtime status every 1 second (REST fallback - only active when WS is disconnected)
  const {
    data: restRuntimeStatus,
    isLoading: isRuntimeStatusLoading,
    error: runtimeStatusError,
  } = useStrategyRuntimeStatus(id, {
    refetchInterval: realtimeConnected ? false : fastPollInterval,
    enabled: !realtimeConnected && queriesEnabled,
  });

  const runtimeStatus = realtime.runtimeStatus ?? restRuntimeStatus;

  // Poll paper positions every 2 seconds
  const {
    data: positions = [],
    isLoading: isPositionsLoading,
    error: positionsError,
  } = useGetPaperPositions({
    refetchInterval: pollInterval,
    enabled: queriesEnabled,
  });

  // Poll paper orders every 2 seconds
  const {
    data: orders = [],
    isLoading: isOrdersLoading,
    error: ordersError,
  } = useGetPaperOrders({
    refetchInterval: pollInterval,
    enabled: queriesEnabled,
  });

  // Poll live price every 1 second
  const underlyingToken = strategy?.rules?.underlyingToken || "";
  const brokerAccountId = strategy?.brokerAccountId || "";
  const isRunning = strategy?.status === "RUNNING";

  const {
    data: livePriceData,
    isLoading: isLivePriceLoading,
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
    positions,
    orders,
    livePriceData,
    livePriceError,
    isLoading: isLoading || isPositionsLoading || isOrdersLoading,
    isLogsLoading,
    isLivePriceLoading,
    runtimeStatus,
    isRuntimeStatusLoading,
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
  };
};
