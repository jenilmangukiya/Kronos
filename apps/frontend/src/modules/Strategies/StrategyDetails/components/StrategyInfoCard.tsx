import React from "react";
import { Strategy } from "../../../../services/strategies/StrategyService";
import { Card } from "../../../../components/ui/Card";
import { Badge } from "../../../../components/ui/Badge";
import { Calendar, Cpu, TrendingUp, ShieldAlert, Award, Sliders, Shield } from "lucide-react";
import { formatReEntryMode } from "../helpers";
import { getStrategyTypeConfig } from "../../strategyTypes";

interface StrategyInfoCardProps {
  strategy: Strategy;
}

export const StrategyInfoCard: React.FC<StrategyInfoCardProps> = ({ strategy }) => {
  const isRunning = strategy.status === "RUNNING";
  const createdDate = new Date(strategy.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const lastTriggered = strategy.lastTriggeredAt
    ? new Date(strategy.lastTriggeredAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

  const isOption = strategy.instrumentType === "OPTION";
  const lotSize = strategy.symbol.toUpperCase().includes("BANKNIFTY") ? 15 : strategy.symbol.toUpperCase().includes("NIFTY") ? 65 : 1;
  const lots = strategy.trade.quantity / lotSize;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Configuration Summary Card */}
      <Card className="border-slate-800 bg-slate-900/40 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-400" />
            Basic Information
          </h3>
          <Badge variant={isRunning ? "success" : "neutral"}>{strategy.status}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400 block text-xs uppercase tracking-wider font-semibold">Name</span>
            <span className="text-slate-200 font-bold text-base mt-1 block">{strategy.name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-xs uppercase tracking-wider font-semibold">Symbol</span>
            <span className="text-slate-200 font-bold text-base mt-1 block">{strategy.symbol}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-xs uppercase tracking-wider font-semibold">Instrument</span>
            <Badge variant="neutral" className="mt-1 !bg-slate-800/80 !text-slate-300 border-slate-700/60">
              {strategy.instrumentType}
            </Badge>
          </div>
          <div>
            <span className="text-slate-400 block text-xs uppercase tracking-wider font-semibold">Trading Mode</span>
            <Badge variant="info" className="mt-1 !bg-blue-500/10 !text-blue-400 border-blue-500/20">
              {strategy.mode}
            </Badge>
          </div>
          <div className="col-span-2 border-t border-slate-800/60 pt-4 grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wider font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Created At
              </span>
              <span className="text-slate-300 text-xs mt-1 block">{createdDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wider font-semibold flex items-center gap-1">
                <Award className="h-3.5 w-3.5" />
                Last Triggered
              </span>
              <span className="text-slate-300 text-xs mt-1 block">{lastTriggered}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Rules & Trade Configuration Card */}
      <div className="space-y-6">
        {(() => {
          const config = getStrategyTypeConfig(strategy.strategyType);
          if (config?.PreviewComponent) {
            return <config.PreviewComponent strategy={strategy} />;
          }
          return null;
        })()}

        {/* Trade Asset details */}
        <Card className="border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
            Trade Execution Action
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-800/60 pt-3">
            <div>
              <span className="text-slate-400 block font-medium">Action / Side</span>
              <Badge
                variant={strategy.trade.side === "BUY" ? "success" : "danger"}
                className="mt-0.5 !px-2 !py-0"
              >
                {strategy.trade.side}
              </Badge>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Quantity</span>
              <span className="text-slate-100 font-bold mt-0.5 block">
                {strategy.trade.quantity} units
                {isOption && (
                  <span className="text-slate-400 text-[10px] font-normal ml-1">
                    ({lots} Lot{lots > 1 ? "s" : ""})
                  </span>
                )}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block font-medium">Execution Asset Symbol</span>
              <span className="text-indigo-400 font-mono text-[11px] font-semibold mt-0.5 block truncate" title={strategy.trade.symbol}>
                {strategy.trade.symbol}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Token ID</span>
              <span className="text-slate-300 font-mono mt-0.5 block">{strategy.trade.token}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Exchange</span>
              <span className="text-slate-300 mt-0.5 block">
                {strategy.trade.exchange} (ID: {strategy.trade.exchangeType})
              </span>
            </div>
          </div>
        </Card>

        {/* Risk details */}
        <Card className="border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Shield className="h-4.5 w-4.5 text-emerald-400" />
            Risk Profile
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-t border-slate-800/60 pt-3">
            <div>
              <span className="text-slate-400 block font-medium">Max Trades/Day</span>
              <span className="text-slate-200 font-semibold mt-0.5 block">
                {strategy.risk?.maxTradesPerDay ?? 1}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Stop Loss %</span>
              <span className="text-rose-400 font-semibold mt-0.5 block">
                {strategy.risk?.stopLossPercent ? `${strategy.risk.stopLossPercent}%` : "None"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Target %</span>
              <span className="text-emerald-400 font-semibold mt-0.5 block">
                {strategy.risk?.targetPercent ? `${strategy.risk.targetPercent}%` : "None"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Re-entry Mode</span>
              <span className="text-blue-400 font-semibold mt-0.5 block">
                {formatReEntryMode(strategy.risk?.reEntryMode)}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
