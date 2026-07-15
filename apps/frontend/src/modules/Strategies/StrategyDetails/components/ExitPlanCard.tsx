import React from "react";
import { PaperPosition } from "../../../../services/paper-trading/PaperTradingService";
import { StrategyRisk } from "../../../../services/strategies/StrategyService";
import { Card } from "../../../../components/ui/Card";
import { Badge } from "../../../../components/ui/Badge";
import { formatCurrency, formatPercent } from "../../../../utils/format";
import { getExitPlan } from "../../utils/exitPlan";
import { Compass, Target, ShieldAlert, Activity, ArrowRightLeft } from "lucide-react";

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
      <Card className="border-slate-800 bg-slate-900/40 p-4 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center justify-between w-full border-b border-slate-800/80 pb-2 mb-1">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Compass className="h-4.5 w-4.5 text-indigo-400" />
              Exit Plan
            </h3>
          </div>
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="p-3 bg-slate-950/40 rounded-full border border-slate-800/50">
              <Compass className="h-8 w-8 text-slate-600 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 text-xs font-semibold text-center">No Open Position</p>
              <p className="text-slate-500 text-[11px] max-w-[200px] text-center leading-normal">
                Exit plan will appear automatically after entry.
              </p>
            </div>
          </div>
        </div>

        {/* Placeholder skeleton levels for target/SL to balance the layout and look premium */}
        <div className="border-t border-slate-800/40 pt-3 space-y-2.5 opacity-20 select-none pointer-events-none">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="flex items-center gap-1.5 font-bold text-emerald-500/80">
              <Target className="h-3.5 w-3.5" />
              Target Level
            </span>
            <span className="text-slate-400">₹--.--</span>
          </div>
          <div className="flex justify-between items-center text-xs font-mono border-t border-slate-800/40 pt-2.5">
            <span className="flex items-center gap-1.5 font-bold text-rose-500/80">
              <ShieldAlert className="h-3.5 w-3.5" />
              Stop Loss Level
            </span>
            <span className="text-slate-400">₹--.--</span>
          </div>
        </div>
      </Card>
    );
  }

  const exitPlan = getExitPlan(position, risk, currentPrice);
  const isLong = exitPlan.side === "LONG";

  return (
    <Card className="border-slate-800 bg-slate-900/40 p-4 flex flex-col h-full justify-between">
      <div className="space-y-4">
        {/* Title Header */}
        <div className="flex flex-col gap-1 border-b border-slate-800/80 pb-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Compass className="h-4.5 w-4.5 text-indigo-400" />
              Exit Plan
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-mono font-bold">
                {exitPlan.symbol}
              </span>
              <Badge variant={isLong ? "success" : "danger"} className="px-1.5 py-0.5 text-[10px]">
                {exitPlan.side}
              </Badge>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Based on trade instrument price
          </span>
        </div>

        {/* Grid: Entry Price & Current Price & Action */}
        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/30">
            <span className="text-slate-500 block text-[9px] font-semibold uppercase tracking-wider mb-0.5">
              Entry Price
            </span>
            <span className="text-slate-200 font-bold">
              {formatCurrency(exitPlan.avgPrice)}
            </span>
            <span className="text-[9px] text-slate-500 block mt-0.5">
              Qty: {exitPlan.quantity}
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/30">
            <span className="text-slate-500 block text-[9px] font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <Activity className="h-3 w-3 text-emerald-400" />
              Current Price
            </span>
            <span className="text-emerald-400 font-bold">
              {currentPrice !== null && currentPrice !== undefined
                ? formatCurrency(currentPrice)
                : "Loading..."}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/30 text-xs flex justify-between items-center font-mono">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
              Exit Action
            </span>
          </div>
          <Badge variant={exitPlan.exitAction === "BUY" ? "info" : "warning"} className="px-1.5 py-0.5 text-[10px]">
            {exitPlan.exitAction}
          </Badge>
        </div>
      </div>

      {/* Target & Stop Loss Levels */}
      <div className="space-y-3 pt-3 border-t border-slate-800/40 mt-auto">
        {/* Target Level */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              Target Level
            </span>
            <span className="text-slate-200 font-bold">
              {exitPlan.targetPrice !== null
                ? formatCurrency(exitPlan.targetPrice)
                : "Not Configured"}
            </span>
          </div>

          {exitPlan.targetPrice !== null && currentPrice !== null && currentPrice !== undefined && (
            <div className="flex justify-between items-center text-[10px] font-mono pl-4.5">
              <span className="text-slate-500 uppercase tracking-wider font-semibold">
                Distance
              </span>
              {exitPlan.isTargetHit ? (
                <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded text-[8px] uppercase tracking-wider">
                  Target Hit
                </span>
              ) : (
                <span className="text-emerald-400/90 font-bold text-[11px]">
                  {formatCurrency(exitPlan.pointsToTarget)} ({formatPercent(exitPlan.percentToTarget)})
                </span>
              )}
            </div>
          )}

          <p className="text-[10px] text-slate-400 pl-4.5 leading-normal">
            {exitPlan.targetExplanation}
          </p>
        </div>

        {/* Stop Loss Level */}
        <div className="space-y-1 pt-2 border-t border-slate-800/40">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              Stop Loss Level
            </span>
            <span className="text-slate-200 font-bold">
              {exitPlan.stopLossPrice !== null
                ? formatCurrency(exitPlan.stopLossPrice)
                : "Not Configured"}
            </span>
          </div>

          {exitPlan.stopLossPrice !== null && currentPrice !== null && currentPrice !== undefined && (
            <div className="flex justify-between items-center text-[10px] font-mono pl-4.5">
              <span className="text-slate-500 uppercase tracking-wider font-semibold">
                Distance
              </span>
              {exitPlan.isStopLossHit ? (
                <span className="text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-1 py-0.5 rounded text-[8px] uppercase tracking-wider">
                  SL Hit
                </span>
              ) : (
                <span className="text-rose-400/90 font-bold text-[11px]">
                  {formatCurrency(exitPlan.pointsToStopLoss)} ({formatPercent(exitPlan.percentToStopLoss)})
                </span>
              )}
            </div>
          )}

          <p className="text-[10px] text-slate-400 pl-4.5 leading-normal">
            {exitPlan.stopLossExplanation}
          </p>
        </div>
      </div>
    </Card>
  );
};
