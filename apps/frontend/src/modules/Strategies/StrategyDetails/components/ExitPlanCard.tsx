import React from "react";
import { PaperPosition } from "../../../../services/paper-trading/PaperTradingService";
import { StrategyRisk } from "../../../../services/strategies/StrategyService";
import { Card } from "../../../../components/ui/Card";
import { Badge } from "../../../../components/ui/Badge";
import { formatCurrency, formatPercent } from "../../../../utils/format";
import { getExitPlan } from "../../utils/exitPlan";
import { Compass, Target, ShieldAlert, Activity, ArrowRightLeft, Info } from "lucide-react";

interface ExitPlanCardProps {
  position?: PaperPosition | null;
  risk?: StrategyRisk;
  currentPrice?: number | null;
}

export const ExitPlanCard: React.FC<ExitPlanCardProps> = ({
  position,
  risk,
  currentPrice,
}) => {
  if (!position || position.status !== "OPEN") {
    return (
      <Card className="border-slate-800 bg-slate-950 p-6 flex flex-col items-center justify-center text-center min-h-[250px] space-y-4">
        <div className="flex items-center justify-between w-full border-b border-slate-800/80 pb-4 mb-2">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Compass className="h-5 w-5 text-indigo-400" />
            Exit Plan
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 space-y-2 py-6">
          <Compass className="h-10 w-10 text-slate-700 animate-pulse" />
          <p className="text-slate-500 text-sm font-medium">
            No open position. Exit plan will appear after entry.
          </p>
        </div>
      </Card>
    );
  }

  const exitPlan = getExitPlan(position, risk, currentPrice);
  const isLong = exitPlan.side === "LONG";

  return (
    <Card className="border-slate-800 bg-slate-950 p-6 space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Compass className="h-5 w-5 text-indigo-400" />
          Exit Plan
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono font-bold">
            {exitPlan.symbol}
          </span>
          <Badge variant={isLong ? "success" : "danger"}>
            {exitPlan.side}
          </Badge>
        </div>
      </div>

      {/* Grid: Entry Price & Current Price & Action */}
      <div className="flex flex-col gap-4 text-xs font-mono">
        <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/50">
          <span className="text-slate-500 block font-semibold uppercase tracking-wider mb-1">
            Entry Price
          </span>
          <span className="text-slate-200 text-sm font-bold">
            {formatCurrency(exitPlan.avgPrice)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Qty: {exitPlan.quantity}
          </span>
        </div>

        <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/50">
          <span className="text-slate-500 block font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <Activity className="h-3 w-3 text-emerald-400" />
            Current Price
          </span>
          <span className="text-emerald-400 text-sm font-bold">
            {currentPrice !== null && currentPrice !== undefined
              ? formatCurrency(currentPrice)
              : "Loading..."}
          </span>
        </div>
      </div>

      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/50 text-xs flex justify-between items-center font-mono">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-blue-400" />
          <span className="text-slate-400 font-semibold uppercase tracking-wider">
            Exit Action
          </span>
        </div>
        <Badge variant={exitPlan.exitAction === "BUY" ? "info" : "warning"}>
          {exitPlan.exitAction}
        </Badge>
      </div>

      {/* Target & Stop Loss Levels */}
      <div className="space-y-4 pt-2 border-t border-slate-900/60">
        {/* Target Level */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <Target className="h-4 w-4" />
              Target Level
            </span>
            <span className="text-slate-200 font-bold">
              {exitPlan.targetPrice !== null
                ? formatCurrency(exitPlan.targetPrice)
                : "Not Configured"}
            </span>
          </div>

          {exitPlan.targetPrice !== null && currentPrice !== null && currentPrice !== undefined && (
            <div className="flex justify-between items-center text-[10px] font-mono pl-5">
              <span className="text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1" title="Remaining distance from the current price to the target level.">
                Distance
                <Info className="h-3 w-3 text-slate-500 hover:text-slate-400 cursor-help" />
              </span>
              {exitPlan.isTargetHit ? (
                <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">
                  Target condition met
                </span>
              ) : (
                <span className="text-emerald-400/90 font-bold">
                  {formatCurrency(exitPlan.pointsToTarget)} ({formatPercent(exitPlan.percentToTarget)})
                </span>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-400 pl-5 leading-normal">
            {exitPlan.targetExplanation}
          </p>
        </div>

        {/* Stop Loss Level */}
        <div className="space-y-1.5 pt-2 border-t border-slate-900/40">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-rose-400 font-bold flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              Stop Loss Level
            </span>
            <span className="text-slate-200 font-bold">
              {exitPlan.stopLossPrice !== null
                ? formatCurrency(exitPlan.stopLossPrice)
                : "Not Configured"}
            </span>
          </div>

          {exitPlan.stopLossPrice !== null && currentPrice !== null && currentPrice !== undefined && (
            <div className="flex justify-between items-center text-[10px] font-mono pl-5">
              <span className="text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1" title="Remaining distance from the current price to the stop loss level.">
                Distance
                <Info className="h-3 w-3 text-slate-500 hover:text-slate-400 cursor-help" />
              </span>
              {exitPlan.isStopLossHit ? (
                <span className="text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">
                  Stop loss condition met
                </span>
              ) : (
                <span className="text-rose-400/90 font-bold">
                  {formatCurrency(exitPlan.pointsToStopLoss)} ({formatPercent(exitPlan.percentToStopLoss)})
                </span>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-400 pl-5 leading-normal">
            {exitPlan.stopLossExplanation}
          </p>
        </div>
      </div>
    </Card>
  );
};
