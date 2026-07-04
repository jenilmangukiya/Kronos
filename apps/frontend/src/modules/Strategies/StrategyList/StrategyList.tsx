import React from "react";
import { Link } from "react-router-dom";
import { Plus, AlertCircle, Info, Cpu } from "lucide-react";
import { useStrategyList } from "./useStrategyList";
import { StrategyTable } from "./components/StrategyTable";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";
import { Badge } from "../../../components/ui/Badge";

export const StrategyList: React.FC = () => {
  const {
    strategies,
    isLoading,
    error,
    actionError,
    setActionError,
    handleStart,
    handleStop,
    isActionLoading,
  } = useStrategyList();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Strategies</h1>
            <Badge variant="info" className="!bg-blue-600/10 !text-blue-400 border-blue-500/20">
              Paper Trading Only
            </Badge>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Build and manage systematic triggers for automatic trade actions.
          </p>
        </div>

        <div>
          <Link to="/dashboard/strategies/create">
            <Button variant="primary" className="gap-2">
              <Plus className="h-4.5 w-4.5" />
              Create Strategy
            </Button>
          </Link>
        </div>
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

      {/* Error alerts */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error loading strategies</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {actionError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-4 rounded-lg flex items-start gap-3 relative">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Action Failed</p>
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

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : strategies.length > 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-xl">
          <StrategyTable
            strategies={strategies}
            onStart={handleStart}
            onStop={handleStop}
            isActionLoading={isActionLoading}
          />
        </div>
      ) : (
        <Card className="border-slate-800 bg-slate-900/40 p-12 text-center max-w-xl mx-auto mt-8">
          <Cpu className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-200">No Strategies Found</h2>
          <p className="text-slate-400 text-sm mt-2">
            You have not created any algorithmic strategies yet.
          </p>
          <div className="mt-6">
            <Link to="/dashboard/strategies/create">
              <Button variant="primary" className="gap-2">
                <Plus className="h-4.5 w-4.5" />
                Create Your First Strategy
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
};
