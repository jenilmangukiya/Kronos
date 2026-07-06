import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetStrategy,
  useGetStrategyLogs,
  useStartStrategy,
  useStopStrategy,
  useStopAndExitStrategy,
  useResetStrategy,
  useDuplicateStrategy,
} from "../../../services/strategies/StrategyQueries";
import { useGetPaperPositions, useGetPaperOrders } from "../../../services/paper-trading/PaperTradingQueries";
import { useLiveLatestTick } from "../../../services/market-data/MarketDataQueries";
import { useStrategyCandles } from "../../../services/market-data/useCandles";

export const useStrategyDetails = () => {
  const { id = "" } = useParams<{ id: string }>();
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: strategy,
    isLoading: isStrategyLoading,
    error: strategyError,
  } = useGetStrategy(id);
  // Poll logs every 2 seconds
  const {
    data: logs = [],
    isLoading: isLogsLoading,
    error: logsError,
  } = useGetStrategyLogs(id, {
    refetchInterval: 2000,
  });

  // Poll paper positions every 2 seconds
  const {
    data: positions = [],
    isLoading: isPositionsLoading,
  } = useGetPaperPositions({
    refetchInterval: 2000,
  });

  // Poll paper orders every 2 seconds
  const {
    data: orders = [],
    isLoading: isOrdersLoading,
  } = useGetPaperOrders({
    refetchInterval: 2000,
  });

  // Poll live price every 1 second
  const underlyingToken = strategy?.rules?.underlyingToken || "";
  const brokerAccountId = strategy?.brokerAccountId || "";

  const {
    data: livePriceData,
    isLoading: isLivePriceLoading,
    error: livePriceError,
  } = useLiveLatestTick(brokerAccountId, underlyingToken, {
    refetchInterval: 1000,
    enabled: Boolean(brokerAccountId && underlyingToken),
    retry: false,
  });

  const {
    data: candles = [],
    isLoading: isCandlesLoading,
    isFetching: isCandlesFetching,
    error: candlesError,
  } = useStrategyCandles(strategy);

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
    error,
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
  };
};
