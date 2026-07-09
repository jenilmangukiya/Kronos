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
    <div className="flex flex-wrap items-center gap-2 md:justify-end w-full md:w-auto">
      <Link to="/dashboard/strategies" className="w-full sm:w-auto">
        <Button variant="outline" className="gap-1.5 px-3 py-1.5 text-xs w-full justify-center" disabled={isAnyLoading}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Strategies
        </Button>
      </Link>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        {/* Reset Button */}
        <Button
          variant="outline"
          className="flex-1 sm:flex-none gap-1.5 px-3 py-1.5 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 justify-center"
          disabled={isAnyLoading}
          onClick={onReset}
        >
          {isResetLoading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          Reset
        </Button>

        {/* Duplicate Button */}
        <Button
          variant="outline"
          className="flex-1 sm:flex-none gap-1.5 px-3 py-1.5 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 justify-center"
          disabled={isAnyLoading}
          onClick={onDuplicate}
        >
          {isDuplicateLoading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          Duplicate
        </Button>

        {/* Start / Stop Button */}
        {isRunning ? (
          <>
            <Button
              variant="danger"
              className="flex-1 sm:flex-none gap-1.5 px-3 py-1.5 text-xs justify-center"
              disabled={isAnyLoading}
              onClick={onStop}
            >
              {isStopLoading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Square className="h-3.5 w-3.5 fill-current" />
              )}
              Stop
            </Button>

            <Button
              variant="danger"
              className="flex-1 sm:flex-none gap-1.5 px-3 py-1.5 text-xs !bg-amber-600 hover:!bg-amber-500 border-amber-600 hover:border-amber-500 text-white shadow-amber-500/10 justify-center"
              disabled={isAnyLoading || isStopExitDisabled}
              onClick={onStopExit}
            >
              {isStopExitLoading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <StopCircle className="h-3.5 w-3.5" />
              )}
              Stop & Exit
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              className="flex-1 sm:flex-none gap-1.5 px-3 py-1.5 text-xs !from-emerald-600 !to-teal-600 hover:!from-emerald-500 hover:!to-teal-500 shadow-emerald-500/10 justify-center"
              disabled={isAnyLoading}
              onClick={onStart}
            >
              {isStartLoading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              Start
            </Button>

            <Button
              variant="danger"
              className="flex-1 sm:flex-none gap-1.5 px-3 py-1.5 text-xs !bg-amber-600 hover:!bg-amber-500 border-amber-600 hover:border-amber-500 text-white shadow-amber-500/10 justify-center"
              disabled={isAnyLoading || isStopExitDisabled}
              onClick={onStopExit}
            >
              {isStopExitLoading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <StopCircle className="h-3.5 w-3.5" />
              )}
              Stop & Exit
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
