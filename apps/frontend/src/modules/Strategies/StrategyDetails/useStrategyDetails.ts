import { useParams } from "react-router-dom";
import { useState } from "react";
import {
  useGetStrategy,
  useGetStrategyLogs,
  useStartStrategy,
  useStopStrategy,
} from "../../../services/strategies/StrategyQueries";
import { LOGS_REFRESH_INTERVAL } from "./constants";

export const useStrategyDetails = () => {
  const { id = "" } = useParams<{ id: string }>();
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: strategy,
    isLoading: isStrategyLoading,
    error: strategyError,
  } = useGetStrategy(id);

  // Poll logs only if strategy is running
  const isRunning = strategy?.status === "RUNNING";
  const {
    data: logs = [],
    isLoading: isLogsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useGetStrategyLogs(id, {
    refetchInterval: isRunning ? LOGS_REFRESH_INTERVAL : false,
  });

  const startMutation = useStartStrategy();
  const stopMutation = useStopStrategy();

  const handleStart = async () => {
    if (!id) return;
    try {
      setActionError(null);
      await startMutation.mutateAsync(id);
      refetchLogs();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to start strategy");
    }
  };

  const handleStop = async () => {
    if (!id) return;
    try {
      setActionError(null);
      await stopMutation.mutateAsync(id);
      refetchLogs();
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
    isLoading,
    isLogsLoading,
    error,
    actionError,
    setActionError,
    handleStart,
    handleStop,
    isActionLoading: startMutation.isPending || stopMutation.isPending,
  };
};
