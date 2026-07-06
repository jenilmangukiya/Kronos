import React from "react";
import { Play, Square, ArrowLeft, RotateCcw, Copy, StopCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../../../components/ui/Button";
import { Strategy } from "../../../../services/strategies/StrategyService";

interface StrategyActionsProps {
  strategy: Strategy;
  hasOpenPosition: boolean;
  onStart: () => void;
  onStop: () => void;
  onStopExit: () => void;
  onReset: () => void;
  onDuplicate: () => void;
  isStartLoading: boolean;
  isStopLoading: boolean;
  isStopExitLoading: boolean;
  isResetLoading: boolean;
  isDuplicateLoading: boolean;
}

export const StrategyActions: React.FC<StrategyActionsProps> = ({
  strategy,
  hasOpenPosition,
  onStart,
  onStop,
  onStopExit,
  onReset,
  onDuplicate,
  isStartLoading,
  isStopLoading,
  isStopExitLoading,
  isResetLoading,
  isDuplicateLoading,
}) => {
  const isRunning = strategy.status === "RUNNING";
  const isAnyLoading =
    isStartLoading ||
    isStopLoading ||
    isStopExitLoading ||
    isResetLoading ||
    isDuplicateLoading;

  const isStopExitDisabled = strategy.status === "STOPPED" && !hasOpenPosition;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800/80 pt-6">
      <div>
        <Link to="/dashboard/strategies">
          <Button variant="outline" className="gap-2" disabled={isAnyLoading}>
            <ArrowLeft className="h-4.5 w-4.5" />
            Back to Strategies
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Reset Button */}
        <Button
          variant="outline"
          className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800"
          disabled={isAnyLoading}
          onClick={onReset}
        >
          {isResetLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Reset
        </Button>

        {/* Duplicate Button */}
        <Button
          variant="outline"
          className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800"
          disabled={isAnyLoading}
          onClick={onDuplicate}
        >
          {isDuplicateLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Duplicate
        </Button>

        {/* Start / Stop Button */}
        {isRunning ? (
          <>
            <Button
              variant="danger"
              className="gap-2"
              disabled={isAnyLoading}
              onClick={onStop}
            >
              {isStopLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Square className="h-4 w-4 fill-current" />
              )}
              Stop
            </Button>

            <Button
              variant="danger"
              className="gap-2 !bg-amber-600 hover:!bg-amber-500 border-amber-600 hover:border-amber-500 text-white shadow-amber-500/10"
              disabled={isAnyLoading || isStopExitDisabled}
              onClick={onStopExit}
            >
              {isStopExitLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <StopCircle className="h-4 w-4" />
              )}
              Stop & Exit
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              className="gap-2 !from-emerald-600 !to-teal-600 hover:!from-emerald-500 hover:!to-teal-500 shadow-emerald-500/10"
              disabled={isAnyLoading}
              onClick={onStart}
            >
              {isStartLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              Start
            </Button>

            <Button
              variant="danger"
              className="gap-2 !bg-amber-600 hover:!bg-amber-500 border-amber-600 hover:border-amber-500 text-white shadow-amber-500/10"
              disabled={isAnyLoading || isStopExitDisabled}
              onClick={onStopExit}
            >
              {isStopExitLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <StopCircle className="h-4 w-4" />
              )}
              Stop & Exit
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
