import React from "react";
import { Play, Square, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../../../components/ui/Button";
import { Strategy } from "../../../../services/strategies/StrategyService";

interface StrategyActionsProps {
  strategy: Strategy;
  onStart: () => void;
  onStop: () => void;
  isActionLoading: boolean;
}

export const StrategyActions: React.FC<StrategyActionsProps> = ({
  strategy,
  onStart,
  onStop,
  isActionLoading,
}) => {
  const isRunning = strategy.status === "RUNNING";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800/80 pt-6">
      <div>
        <Link to="/dashboard/strategies">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4.5 w-4.5" />
            Back to Strategies
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {isRunning ? (
          <Button
            variant="danger"
            size="lg"
            className="w-full sm:w-auto gap-2"
            disabled={isActionLoading}
            onClick={onStop}
          >
            <Square className="h-4.5 w-4.5 fill-current" />
            Stop Strategy
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto gap-2 !from-emerald-600 !to-teal-600 hover:!from-emerald-500 hover:!to-teal-500 shadow-emerald-500/10"
            disabled={isActionLoading}
            onClick={onStart}
          >
            <Play className="h-4.5 w-4.5 fill-current" />
            Start Strategy
          </Button>
        )}
      </div>
    </div>
  );
};
