import { useParams } from "react-router-dom";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetStrategy,
  useGetStrategyLogs,
  useStartStrategy,
  useStopStrategy,
} from "../../../services/strategies/StrategyQueries";
import { useGetPaperPositions, useGetPaperOrders } from "../../../services/paper-trading/PaperTradingQueries";
import { useLiveLatestTick } from "../../../services/market-data/MarketDataQueries";

export const useStrategyDetails = () => {
  const { id = "" } = useParams<{ id: string }>();
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: strategy,
    isLoading: isStrategyLoading,
    error: strategyError,
  } = useGetStrategy(id);

  const isRunning = strategy?.status === "RUNNING";

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

  const startMutation = useStartStrategy();
  const stopMutation = useStopStrategy();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["strategies", id] });
    queryClient.invalidateQueries({ queryKey: ["strategies", id, "logs"] });
    queryClient.invalidateQueries({ queryKey: ["paper-trading", "positions"] });
    queryClient.invalidateQueries({ queryKey: ["paper-trading", "orders"] });
    if (brokerAccountId && underlyingToken) {
      queryClient.invalidateQueries({
        queryKey: ["market-data", "live-latest", brokerAccountId, underlyingToken],
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
    isActionLoading: startMutation.isPending || stopMutation.isPending,
  };
};
