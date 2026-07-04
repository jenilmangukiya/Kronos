import { useGetStrategies, useStartStrategy, useStopStrategy } from "../../../services/strategies/StrategyQueries";
import { useState } from "react";

export const useStrategyList = () => {
  const { data: strategies = [], isLoading, error } = useGetStrategies();
  const startMutation = useStartStrategy();
  const stopMutation = useStopStrategy();
  const [actionError, setActionError] = useState<string | null>(null);

  const handleStart = async (id: string) => {
    try {
      setActionError(null);
      await startMutation.mutateAsync(id);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to start strategy");
    }
  };

  const handleStop = async (id: string) => {
    try {
      setActionError(null);
      await stopMutation.mutateAsync(id);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to stop strategy");
    }
  };

  return {
    strategies,
    isLoading,
    error: error ? ((error as any).response?.data?.message || (error as any).message) : null,
    actionError,
    setActionError,
    handleStart,
    handleStop,
    isActionLoading: startMutation.isPending || stopMutation.isPending,
  };
};
