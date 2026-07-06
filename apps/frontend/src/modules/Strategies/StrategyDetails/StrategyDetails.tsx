import React, { useState } from "react";
import {
  AlertCircle,
  Activity,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Layers,
  Sliders,
  LineChart,
} from "lucide-react";
import { useStrategyDetails } from "./useStrategyDetails";
import { StrategyInfoCard } from "./components/StrategyInfoCard";
import { StrategyActions } from "./components/StrategyActions";
import { StrategyLogs } from "./components/StrategyLogs";
import { StrategyJsonPreview } from "./components/StrategyJsonPreview";
import { Spinner } from "../../../components/ui/Spinner";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { formatCurrency, formatDate } from "../../../utils/format";
import { CandleChart } from "../../../components/charts/CandleChart";
import {
  formatStrategyType,
  formatRuleType,
  formatTradeSide,
  formatInstrumentType,
} from "./helpers";

export const StrategyDetails: React.FC = () => {
  const {
    strategy,
    logs,
    positions,
    orders,
    livePriceData,
    livePriceError,
    isLoading,
    error,
    actionError,
    setActionError,
    handleStart,
    handleStop,
    isActionLoading,
    candles,
    isCandlesLoading,
    isCandlesFetching,
    candlesError,
  } = useStrategyDetails();

  const [isConfigExpanded, setIsConfigExpanded] = useState(false);

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

  // Calculate Trades Today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const tradesToday = orders.filter(
    (order) =>
      order.strategyId === strategy.id &&
      order.side === strategy.trade.side &&
      new Date(order.createdAt) >= startOfDay
  ).length;

  const maxTradesPerDay = strategy.risk?.maxTradesPerDay ?? 1;
  const tradesLimitReached = tradesToday >= maxTradesPerDay;

  // Filter Positions strictly by strategyId and OPEN status
  const openPositions = positions.filter(
    (pos) => pos.strategyId === strategy.id && pos.status === "OPEN"
  );

  // Filter Orders strictly by strategyId
  const strategyOrders = orders
    .filter((order) => order.strategyId === strategy.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Live Price Calculation & Proximity Warning
  const ltp = livePriceData?.tick?.ltp ?? null;
  const triggerPrice = strategy.rules.triggerPrice;
  const ruleType = strategy.rules.type;

  // Calculate triggers warnings (safety limits)
  const diffPercent = ltp ? (Math.abs(triggerPrice - ltp) / ltp) * 100 : 0;
  const showWarning = ltp !== null && diffPercent > 5;

  // Resolve detailed live pricing states
  const getLivePriceState = () => {
    if (!isRunning) {
      return { state: "Not Started", badgeVariant: "neutral" as const };
    }
    if (livePriceError) {
      const errorData = (livePriceError as any)?.response?.data;
      const errorCode = errorData?.code || errorData?.errorCode || errorData?.message;

      if (errorCode === "BROKER_SESSION_EXPIRED") {
        return { state: "Broker Session Expired", badgeVariant: "danger" as const };
      }
      if (
        errorCode === "LIVE_MARKET_DATA_DISCONNECTED" ||
        errorCode === "LIVE_MARKET_DATA_NOT_CONNECTED"
      ) {
        return { state: "Live Disconnected", badgeVariant: "danger" as const };
      }
      return { state: "Error", badgeVariant: "danger" as const };
    }
    if (!livePriceData) {
      return { state: "Connecting", badgeVariant: "warning" as const };
    }
    if (livePriceData.tick === null) {
      return { state: "No Tick Yet", badgeVariant: "warning" as const };
    }
    return { state: "Live", badgeVariant: "success" as const };
  };

  const priceState = getLivePriceState();

  // Resolve condition status
  let conditionStatusText = "-";
  let conditionStatusVariant: "success" | "warning" | "danger" | "info" | "neutral" = "neutral";

  if (priceState.state === "Live" && ltp !== null) {
    if (ruleType === "UNDERLYING_CROSS_ABOVE") {
      if (ltp >= triggerPrice) {
        conditionStatusText = "Matched";
        conditionStatusVariant = "success";
      } else {
        conditionStatusText = "Waiting";
        conditionStatusVariant = "warning";
      }
    } else if (ruleType === "UNDERLYING_CROSS_BELOW") {
      if (ltp <= triggerPrice) {
        conditionStatusText = "Matched";
        conditionStatusVariant = "success";
      } else {
        conditionStatusText = "Waiting";
        conditionStatusVariant = "warning";
      }
    }
  } else {
    conditionStatusText = priceState.state;
    conditionStatusVariant = priceState.badgeVariant;
  }

  // Create collapsible summary description
  const configSummaryText = `${formatStrategyType(strategy.strategyType)} • ${formatInstrumentType(strategy.instrumentType)} • Rule: Spot ${strategy.rules.type === "UNDERLYING_CROSS_ABOVE" ? "Crosses Above" : "Crosses Below"} ${formatCurrency(strategy.rules.triggerPrice)} (Token: ${strategy.rules.underlyingToken}) • Trade: ${formatTradeSide(strategy.trade.side)} ${strategy.trade.quantity} qty of ${strategy.trade.symbol} • Risk: SL ${strategy.risk?.stopLossPercent ? `${strategy.risk.stopLossPercent}%` : "None"} / Target ${strategy.risk?.targetPercent ? `${strategy.risk.targetPercent}%` : "None"}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">{strategy.name}</h1>
            <Badge variant={isRunning ? "success" : "neutral"} className={isRunning ? "animate-pulse" : ""}>
              {strategy.status}
            </Badge>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Live Strategy Monitoring & Execution Dashboard
          </p>
        </div>

        {/* Action Buttons */}
        <StrategyActions
          strategy={strategy}
          onStart={handleStart}
          onStop={handleStop}
          isActionLoading={isActionLoading}
        />
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

      {/* Grid: 1. Top Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="p-4 border-slate-800 bg-slate-900/30">
          <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Strategy Status</span>
          <span className={`text-lg font-extrabold block mt-2 ${isRunning ? "text-emerald-400 animate-pulse" : "text-slate-400"}`}>
            {strategy.status}
          </span>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/30">
          <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Mode</span>
          <span className="text-lg font-extrabold text-blue-400 block mt-2">
            {strategy.mode}
          </span>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/30">
          <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Strategy Type</span>
          <span className="text-lg font-extrabold text-indigo-300 block mt-2 truncate" title={formatStrategyType(strategy.strategyType)}>
            {formatStrategyType(strategy.strategyType)}
          </span>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/30">
          <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Last Triggered At</span>
          <span className="text-sm font-semibold text-slate-200 block mt-2.5 truncate" title={strategy.lastTriggeredAt ? formatDate(strategy.lastTriggeredAt) : "Never"}>
            {strategy.lastTriggeredAt ? formatDate(strategy.lastTriggeredAt) : "Never"}
          </span>
        </Card>

        {/* 3. Improved Trades Today Card */}
        <Card className="p-4 border-slate-800 bg-slate-900/30">
          <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Trades Today</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-extrabold text-slate-200 font-mono">
              {tradesToday} / {maxTradesPerDay}
            </span>
            <Badge variant={tradesLimitReached ? "danger" : "success"}>
              {tradesLimitReached ? "Limit Reached" : "Available"}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Grid: Live Price Card & Candle Chart Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Live Price Card */}
        <Card className="border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              Live Price Card
            </h3>
            {isRunning && priceState.state === "Live" && (
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Underlying LTP</span>
              <span className="text-3xl font-extrabold text-emerald-400 mt-2 block font-mono">
                {ltp !== null ? formatCurrency(ltp) : "Fetching..."}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Trigger Price</span>
              <span className="text-3xl font-extrabold text-slate-200 mt-2 block font-mono">
                {formatCurrency(triggerPrice)}
              </span>
            </div>
          </div>

          {/* Trigger price warning callout */}
          {showWarning && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-3 rounded-lg flex items-start gap-2 shadow-lg shadow-amber-500/5">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>
                Trigger price is far from current underlying price. Please confirm this is intentional.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/40 text-sm">
            <div>
              <span className="text-slate-400 block text-xs font-medium uppercase tracking-wider">Rule Type</span>
              <span className="text-slate-200 font-semibold mt-0.5 block truncate" title={formatRuleType(ruleType)}>
                {formatRuleType(ruleType)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs font-medium uppercase tracking-wider">Condition Status</span>
              <div className="mt-1">
                <Badge variant={conditionStatusVariant}>{conditionStatusText}</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* 8. Candle Chart Card */}
        <Card className="border-slate-800 bg-slate-900/40 p-6 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <LineChart className="h-5 w-5 text-indigo-400" />
                {strategy.trade?.symbol || "Strategy"} 5m Candles
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Refreshing every 30 seconds
              </p>
            </div>
            {isCandlesFetching && (
              <span className="flex items-center gap-1.5 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 font-semibold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
                Updating
              </span>
            )}
          </div>

          {!strategy.trade?.token ? (
            <div className="flex flex-col items-center justify-center h-[300px] border border-slate-800 rounded-xl bg-slate-950/20 text-slate-400 text-xs space-y-2">
              <AlertCircle className="h-8 w-8 text-slate-500" />
              <span>Select a trade instrument to view candles</span>
            </div>
          ) : !strategy.brokerAccountId ? (
            <div className="flex flex-col items-center justify-center h-[300px] border border-slate-800 rounded-xl bg-slate-950/20 text-slate-400 text-xs space-y-2">
              <AlertCircle className="h-8 w-8 text-slate-500" />
              <span>Connect broker account to view candles</span>
            </div>
          ) : candlesError && !(isCandlesLoading || (isCandlesFetching && candles.length === 0)) ? (
            <div className="flex flex-col items-center justify-center h-[300px] border border-slate-800 rounded-xl bg-slate-950/20 text-rose-400 text-xs space-y-2">
              <AlertCircle className="h-8 w-8 text-rose-500/80" />
              <span>Unable to load candle data</span>
              <span className="text-[10px] text-slate-500 mt-1 max-w-xs text-center truncate px-4">
                {candlesError?.message || String(candlesError)}
              </span>
            </div>
          ) : (
            <CandleChart
              candles={candles}
              isLoading={isCandlesLoading || (isCandlesFetching && candles.length === 0)}
              height={300}
              emptyMessage="No candle data available yet"
            />
          )}
        </Card>
      </div>

      {/* 3. Open Position section */}
      <Card className="border-slate-800 bg-slate-950 p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800/80 pb-4">
          <Briefcase className="h-5 w-5 text-indigo-400" />
          Open Position
        </h3>

        {openPositions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm font-medium">
            No open strategy position
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-4">Side</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Avg Price</th>
                  <th className="py-3 px-4">LTP</th>
                  <th className="py-3 px-4">Unrealized P&L</th>
                  <th className="py-3 px-4">Total P&L</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {openPositions.map((pos) => {
                  const sideFormatted = formatTradeSide(pos.side);
                  const isLong = sideFormatted === "BUY";
                  const unPnl = pos.unrealizedPnl;
                  const totPnl = pos.totalPnl;
                  return (
                    <tr key={pos.id} className="hover:bg-slate-900/40">
                      <td className="py-4 px-4 font-bold text-slate-200">{pos.symbol}</td>
                      <td className="py-4 px-4">
                        <Badge variant={isLong ? "success" : "danger"}>
                          {isLong ? "LONG" : "SHORT"}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-200">{pos.quantity}</td>
                      <td className="py-4 px-4 font-semibold">{formatCurrency(pos.avgPrice)}</td>
                      <td className="py-4 px-4 font-semibold text-slate-200">{pos.ltp !== null ? formatCurrency(pos.ltp) : "-"}</td>
                      <td className={`py-4 px-4 font-bold ${unPnl > 0 ? "text-emerald-400" : unPnl < 0 ? "text-rose-400" : "text-slate-300"}`}>
                        {formatCurrency(unPnl)}
                      </td>
                      <td className={`py-4 px-4 font-bold ${totPnl > 0 ? "text-emerald-400" : totPnl < 0 ? "text-rose-400" : "text-slate-300"}`}>
                        {formatCurrency(totPnl)}
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="info" className="uppercase">{pos.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Grid: 4. Strategy Orders & 5. Live Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. Strategy Orders */}
        <Card className="border-slate-800 bg-slate-950 p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800/80 pb-4">
            <Layers className="h-5 w-5 text-indigo-400" />
            Strategy Orders
          </h3>

          {strategyOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm font-medium">
              No orders executed yet.
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              <table className="w-full text-left text-xs font-mono text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2 px-2">Time</th>
                    <th className="py-2 px-2">Side</th>
                    <th className="py-2 px-2">Symbol</th>
                    <th className="py-2 px-2">Qty</th>
                    <th className="py-2 px-2">Price</th>
                    <th className="py-2 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {strategyOrders.map((order) => {
                    const orderTime = new Date(order.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    });
                    const sideFormatted = formatTradeSide(order.side);
                    return (
                      <tr key={order.id} className="hover:bg-slate-900/20">
                        <td className="py-3 px-2 text-slate-400">{orderTime}</td>
                        <td className="py-3 px-2">
                          <Badge variant={sideFormatted === "BUY" ? "success" : "danger"}>
                            {sideFormatted}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 font-bold text-slate-200">{order.symbol}</td>
                        <td className="py-3 px-2 font-semibold text-slate-200">{order.quantity}</td>
                        <td className="py-3 px-2 font-semibold text-slate-100">{formatCurrency(order.price)}</td>
                        <td className="py-3 px-2 text-right">
                          <Badge variant={order.status === "FILLED" ? "success" : "danger"}>
                            {order.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* 5. Live Logs */}
        <StrategyLogs logs={logs} isPolling={isRunning} />
      </div>

      {/* 6. Collapsible Config Section */}
      <Card className="border-slate-800 bg-slate-950/20 p-4">
        <button
          onClick={() => setIsConfigExpanded(!isConfigExpanded)}
          className="w-full flex items-center justify-between py-2 text-slate-300 hover:text-white transition-colors duration-150"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-slate-400" />
            <span className="font-bold text-sm uppercase tracking-wider">Strategy Config</span>
          </div>
          <div className="flex items-center gap-3">
            {!isConfigExpanded && (
              <span className="hidden lg:inline text-xs text-slate-500 font-medium truncate max-w-xl">
                {configSummaryText}
              </span>
            )}
            {isConfigExpanded ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </div>
        </button>

        {!isConfigExpanded && (
          <div className="lg:hidden mt-2 pt-2 border-t border-slate-900/60 text-[10px] text-slate-500 font-medium leading-relaxed">
            {configSummaryText}
          </div>
        )}

        {isConfigExpanded && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-800/80 animate-fadeIn">
            <StrategyInfoCard strategy={strategy} />
            <StrategyJsonPreview strategy={strategy} />
          </div>
        )}
      </Card>
    </div>
  );
};
