import React from "react";
import { AlertCircle, Info } from "lucide-react";
import { useStrategyDetails } from "./useStrategyDetails";
import { StrategyInfoCard } from "./components/StrategyInfoCard";
import { StrategyActions } from "./components/StrategyActions";
import { StrategyLogs } from "./components/StrategyLogs";
import { StrategyJsonPreview } from "./components/StrategyJsonPreview";
import { Spinner } from "../../../components/ui/Spinner";

export const StrategyDetails: React.FC = () => {
  const {
    strategy,
    logs,
    isLoading,
    isLogsLoading,
    error,
    actionError,
    setActionError,
    handleStart,
    handleStop,
    isActionLoading,
  } = useStrategyDetails();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !strategy) {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-6 rounded-xl flex items-start gap-4">
        <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-base text-rose-300">Error Loading Strategy</p>
          <p className="mt-1 text-slate-300">
            {error || "The requested strategy could not be found."}
          </p>
        </div>
      </div>
    );
  }

  const isRunning = strategy.status === "RUNNING";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{strategy.name}</h1>
        <p className="text-slate-400 text-sm mt-1">
          Detailed overview of rules, trades, risk settings, and execution history.
        </p>
      </div>

      {/* Info Banner for Strategy Runner */}
      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm p-4 rounded-xl flex items-start gap-3 shadow-lg shadow-blue-500/5">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-300">System Information</p>
          <p className="mt-0.5 text-xs text-slate-300">
            Strategy create/start/stop is ready. Auto execution will start after Strategy Runner backend is added.
          </p>
        </div>
      </div>

      {/* Action Error Alerts */}
      {actionError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-4 rounded-lg flex items-start gap-3 relative">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Execution Action Failed</p>
            <p className="mt-0.5 text-xs">{actionError}</p>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="absolute top-2 right-2 text-rose-400 hover:text-rose-300 text-xs font-semibold px-2 py-1"
          >
            Clear
          </button>
        </div>
      )}

      {/* Basic Metadata and Configs */}
      <StrategyInfoCard strategy={strategy} />

      {/* Logs and Details JSON preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StrategyLogs logs={logs} isPolling={isRunning} />
        <StrategyJsonPreview strategy={strategy} />
      </div>

      {/* Controls & Navigations */}
      <StrategyActions
        strategy={strategy}
        onStart={handleStart}
        onStop={handleStop}
        isActionLoading={isActionLoading}
      />
    </div>
  );
};
