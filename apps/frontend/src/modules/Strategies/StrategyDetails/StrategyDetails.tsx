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
  Cpu,
} from "lucide-react";
import { useStrategyDetails } from "./useStrategyDetails";
import { StrategyInfoCard } from "./components/StrategyInfoCard";
import { StrategyActions } from "./components/StrategyActions";
import { StrategyLogs } from "./components/StrategyLogs";
import { StrategyJsonPreview } from "./components/StrategyJsonPreview";
import { ExitPlanCard } from "./components/ExitPlanCard";
import { Spinner } from "../../../components/ui/Spinner";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { formatCurrency, formatDate } from "../../../utils/format";
import { CandleChart, PriceLine, ChartMarker, Candle } from "../../../components/charts/CandleChart";
import {
  formatStrategyType,
  formatRuleType,
  formatTradeSide,
  formatInstrumentType,
  formatReEntryMode,
} from "./helpers";
import { getStrategyTypeConfig } from "../strategyTypes";

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
    handleStopExit,
    handleReset,
    handleDuplicate,
    isStartLoading,
    isStopLoading,
    isStopExitLoading,
    isResetLoading,
    isDuplicateLoading,
    candles,
    isCandlesLoading,
    isCandlesFetching,
    candlesError,
    runtimeStatus,
    realtimeConnected,
    isBackendOffline,
    handleRetry,
    watchCurrentPrice,
    tradeCurrentPrice,
    displayUnderlyingTick,
  } = useStrategyDetails();

  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);

  const [chartHeight, setChartHeight] = useState(window.innerWidth >= 1024 ? 420 : 300);
  React.useEffect(() => {
    const handleResize = () => {
      setChartHeight(window.innerWidth >= 1024 ? 420 : 300);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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


  // Filter Positions strictly by strategyId and OPEN status
  const openPositions = positions.filter(
    (pos) => pos.strategyId === strategy.id && pos.status === "OPEN"
  );

  // Filter Orders strictly by strategyId
  const strategyOrders = orders
    .filter((order) => order.strategyId === strategy.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Find open position for the strategy
  const openPosition = openPositions[0];

  const priceLines: PriceLine[] = [];
  if (openPosition) {
    const avgPrice = openPosition.avgPrice;
    const sideFormatted = formatTradeSide(openPosition.side);
    const isLong = sideFormatted === "BUY";
    const stopLossPercent = strategy.risk?.stopLossPercent;
    const targetPercent = strategy.risk?.targetPercent;

    // 1. Entry Price Line
    priceLines.push({
      price: avgPrice,
      title: "Entry",
      color: "#3b82f6", // blue-500
    });

    // 2. Target Price Line
    if (targetPercent && targetPercent > 0) {
      const targetPrice = isLong
        ? avgPrice * (1 + targetPercent / 100)
        : avgPrice * (1 - targetPercent / 100);
      priceLines.push({
        price: targetPrice,
        title: "Target",
        color: "#10b981", // emerald-500
      });
    }

    // 3. Stop Loss Price Line
    if (stopLossPercent && stopLossPercent > 0) {
      const stopLossPrice = isLong
        ? avgPrice * (1 - stopLossPercent / 100)
        : avgPrice * (1 + stopLossPercent / 100);
      priceLines.push({
        price: stopLossPrice,
        title: "SL",
        color: "#ef4444", // red-500
      });
    }
  }

  // Calculate entry/exit markers from filled strategy orders
  const findNearestCandleTime = (orderTimeSec: number, candlesList: Candle[]): number | null => {
    if (candlesList.length === 0) return null;
    let nearestCandle = candlesList[0];
    if (!nearestCandle) return null;
    let minDiff = Math.abs(Number(nearestCandle.time) - orderTimeSec);
    for (let i = 1; i < candlesList.length; i++) {
      const candle = candlesList[i];
      if (!candle) continue;
      const diff = Math.abs(Number(candle.time) - orderTimeSec);
      if (diff < minDiff) {
        minDiff = diff;
        nearestCandle = candle;
      }
    }
    return Number(nearestCandle.time);
  };

  interface StrategyOrderSubset {
    createdAt: string;
    status: string;
    side: string;
    price: number;
    symbol: string;
    quantity: number;
  }

  const getMarkersFromOrders = (candlesList: Candle[], strategyOrdersList: StrategyOrderSubset[]): ChartMarker[] => {
    const chronological = [...strategyOrdersList]
      .filter((order) => order.status === "FILLED")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (chronological.length === 0 || candlesList.length === 0) return [];

    const markersList: ChartMarker[] = [];
    const firstOrder = chronological[0];
    if (!firstOrder) return [];

    const entrySide = formatTradeSide(firstOrder.side);

    chronological.forEach((order, index) => {
      const orderTimeSec = Math.floor(new Date(order.createdAt).getTime() / 1000);
      const nearestTime = findNearestCandleTime(orderTimeSec, candlesList);
      if (nearestTime === null) return;

      const orderSide = formatTradeSide(order.side);
      const isEntry = index === 0;
      const isExit = orderSide !== entrySide;

      let text = "";
      let position: "aboveBar" | "belowBar" = "belowBar";
      let shape: "arrowUp" | "arrowDown" | "circle" = "circle";
      let color = "";

      if (isEntry) {
        if (orderSide === "BUY") {
          text = `ENTRY BUY @ ${formatCurrency(order.price)}`;
          position = "belowBar";
          shape = "arrowUp";
          color = "#10b981"; // green
        } else {
          text = `ENTRY SELL @ ${formatCurrency(order.price)}`;
          position = "aboveBar";
          shape = "arrowDown";
          color = "#ef4444"; // red
        }
      } else if (isExit) {
        if (orderSide === "BUY") {
          text = `EXIT BUY @ ${formatCurrency(order.price)}`;
          position = "belowBar";
          shape = "circle";
          color = "#a855f7"; // purple
        } else {
          text = `EXIT SELL @ ${formatCurrency(order.price)}`;
          position = "aboveBar";
          shape = "circle";
          color = "#a855f7"; // purple
        }
      } else {
        if (orderSide === "BUY") {
          text = `BUY @ ${formatCurrency(order.price)}`;
          position = "belowBar";
          shape = "arrowUp";
          color = "#10b981";
        } else {
          text = `SELL @ ${formatCurrency(order.price)}`;
          position = "aboveBar";
          shape = "arrowDown";
          color = "#ef4444";
        }
      }

      markersList.push({
        time: nearestTime,
        position,
        shape,
        text,
        color,
      });
    });

    return markersList;
  };

  const markers = getMarkersFromOrders(candles, strategyOrders);

  // Live Price Calculation & Proximity Warning
  const ltp = watchCurrentPrice;
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

    if (realtimeConnected) {
      if (displayUnderlyingTick?.ltp !== undefined && displayUnderlyingTick?.ltp !== null) {
        return { state: "Live", badgeVariant: "success" as const };
      }
      if (runtimeStatus?.liveTick?.ltp !== undefined && runtimeStatus?.liveTick?.ltp !== null) {
        return { state: "Live", badgeVariant: "success" as const };
      }
      return { state: "No Tick Yet", badgeVariant: "warning" as const };
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
      return { state: "Live Disconnected", badgeVariant: "danger" as const };
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

  if (!isRunning) {
    conditionStatusText = "Strategy stopped";
    conditionStatusVariant = "neutral";
  } else if (runtimeStatus?.condition !== undefined && runtimeStatus?.condition !== null) {
    const isMatched = runtimeStatus.condition.matched;
    conditionStatusText = isMatched ? "Matched" : "Waiting";
    conditionStatusVariant = isMatched ? "success" : "warning";
  } else if (priceState.state === "Live" && ltp !== null) {
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
    conditionStatusText = priceState.state === "No Tick Yet" && realtimeConnected ? "Waiting for live tick" : priceState.state;
    conditionStatusVariant = priceState.badgeVariant;
  }

  // Create collapsible summary description in one line
  const strategyConfig = getStrategyTypeConfig(strategy.strategyType);
  const strategySpecificSummary = strategyConfig?.getSummaryText ? strategyConfig.getSummaryText(strategy) : "";

  const configSummaryText = [
    formatStrategyType(strategy.strategyType),
    formatInstrumentType(strategy.instrumentType),
    strategySpecificSummary,
    `Trade ${formatTradeSide(strategy.trade.side)} ${strategy.trade.symbol}`,
    `SL ${strategy.risk?.stopLossPercent ? `${strategy.risk.stopLossPercent}%` : "None"}`,
    `Target ${strategy.risk?.targetPercent ? `${strategy.risk.targetPercent}%` : "None"}`
  ].filter(Boolean).join(" • ");

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-4 lg:px-8">
      {isBackendOffline && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm p-4 rounded-xl flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-amber-200">Connection Offline</p>
              <p className="text-xs text-slate-400">Multiple failed attempts to connect to the backend. Polling paused.</p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition duration-200"
          >
            Retry Connection
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{strategy.name}</h1>
            <Badge variant={isRunning ? "success" : "neutral"} className={isRunning ? "animate-pulse font-semibold" : "font-semibold"}>
              {strategy.status}
            </Badge>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            {formatStrategyType(strategy.strategyType)} • {strategy.mode} • {strategy.trade?.symbol || "-"} • {formatTradeSide(strategy.trade?.side)} • Qty {strategy.trade?.quantity || 0}
          </p>
        </div>

        {/* Action Buttons */}
        <StrategyActions
          strategy={strategy}
          hasOpenPosition={!!openPosition}
          onStart={handleStart}
          onStop={handleStop}
          onStopExit={handleStopExit}
          onReset={handleReset}
          onDuplicate={handleDuplicate}
          isStartLoading={isStartLoading}
          isStopLoading={isStopLoading}
          isStopExitLoading={isStopExitLoading}
          isResetLoading={isResetLoading}
          isDuplicateLoading={isDuplicateLoading}
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

      {/* Main Monitor Grid (Chart at the top, Controls at the bottom) */}
      <div className="flex flex-col gap-6">
        {/* Top Chart Row */}
        <div className="w-full">
          <Card className="border-slate-800 bg-slate-900/40 p-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <LineChart className="h-4.5 w-4.5 text-indigo-400" />
                  {strategy.trade?.symbol || "Strategy"} 5m Candles
                </h3>
                <p className="text-slate-500 text-[10px] mt-0.5">
                  Refreshing every 30 seconds
                </p>
              </div>
              {isCandlesFetching && (
                <span className="flex items-center gap-1.5 text-[9px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 font-semibold uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
                  Updating
                </span>
              )}
            </div>

            <div className="flex-grow flex flex-col justify-center min-h-[300px]">
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
                  height={chartHeight}
                  emptyMessage="No candle data available yet"
                  markers={markers}
                  priceLines={priceLines}
                />
              )}
            </div>
          </Card>
        </div>

        {/* Bottom Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {/* Live Price Card */}
          <Card className="border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between">
            <div>
              <div className="flex flex-col gap-1 border-b border-slate-800/80 pb-2 mb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Activity className="h-4.5 w-4.5 text-emerald-400" />
                    Watch Price
                  </h3>
                  <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${
                    priceState.badgeVariant === "success"
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : priceState.badgeVariant === "danger"
                      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                      : priceState.badgeVariant === "warning"
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      : "text-slate-400 bg-slate-500/10 border-slate-800"
                  }`}>
                    {priceState.badgeVariant === "success" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    )}
                    {priceState.state}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  Used for entry condition
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Underlying LTP</span>
                  <span className={`text-xl font-extrabold mt-1 block font-mono ${
                    isRunning && ltp !== null ? "text-emerald-400" : "text-slate-400"
                  }`}>
                    {isRunning ? (ltp !== null ? formatCurrency(ltp) : (realtimeConnected ? "Waiting..." : "Fetching...")) : "--"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Trigger Price</span>
                  <span className="text-xl font-extrabold text-slate-200 mt-1 block font-mono">
                    {formatCurrency(triggerPrice)}
                  </span>
                </div>
              </div>

              {/* Trigger price warning callout */}
              {showWarning && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] p-2 rounded-lg flex items-start gap-1.5 shadow-lg mt-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Trigger price is far from current price.
                  </span>
                </div>
              )}

              {/* Live Price Error or Disconnected Warning Callout */}
              {isRunning && priceState.state === "Live Disconnected" && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] p-2 rounded-lg flex items-start gap-1.5 shadow-lg mt-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Start strategy again or reconnect broker session.
                  </span>
                </div>
              )}

              {isRunning && priceState.state === "Broker Session Expired" && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] p-2 rounded-lg flex items-start gap-1.5 shadow-lg mt-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Broker session expired. Please log in again.
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800/40 text-xs mt-3">
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Rule Type</span>
                <span className="text-slate-200 font-semibold mt-0.5 block truncate" title={formatRuleType(ruleType)}>
                  {formatRuleType(ruleType)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Condition Status</span>
                <div className="mt-1 flex flex-col gap-0.5 items-start">
                  <Badge variant={conditionStatusVariant} className="px-1.5 py-0.5 text-[10px]">{conditionStatusText}</Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Runtime Status Card */}
          <Card className="border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Cpu className="h-4.5 w-4.5 text-indigo-400" />
                  Runtime Status
                </h3>
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${
                  realtimeConnected
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                }`}>
                  {realtimeConnected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
                  {realtimeConnected ? "Connected" : "Disconnected"}
                </span>
              </div>

              {!runtimeStatus ? (
                <div className="text-slate-500 text-xs py-4 text-center">Loading runtime status...</div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-900/40">
                    <span className="text-slate-400">Can Enter</span>
                    <Badge variant={runtimeStatus.canEnter ? "success" : "neutral"} className="px-1.5 py-0.5 text-[10px]">
                      {runtimeStatus.canEnter ? "Yes" : "No"}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-start py-1 border-b border-slate-900/40">
                    <span className="text-slate-400 shrink-0">Reason</span>
                    <span className="text-slate-200 text-right font-medium max-w-[70%] leading-tight break-words">
                      {runtimeStatus.reason || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-900/40">
                    <span className="text-slate-400">Trades Today</span>
                    <span className="text-slate-200 font-bold font-mono">
                      {runtimeStatus.tradesToday} / {runtimeStatus.maxTradesPerDay}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-900/40">
                    <span className="text-slate-400">Re-entry Mode</span>
                    <span className="text-slate-200 font-semibold">
                      {formatReEntryMode(runtimeStatus.reEntryMode)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-900/40">
                    <span className="text-slate-400">Has Open Position</span>
                    <Badge variant={runtimeStatus.hasOpenPosition ? "danger" : "success"} className="px-1.5 py-0.5 text-[10px]">
                      {runtimeStatus.hasOpenPosition ? "Yes" : "No"}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Last Triggered</span>
                    <span className="text-slate-200 font-semibold" title={strategy.lastTriggeredAt ? formatDate(strategy.lastTriggeredAt) : "Never"}>
                      {strategy.lastTriggeredAt ? formatDate(strategy.lastTriggeredAt) : "Never"}
                    </span>
                  </div>

                  {strategyConfig?.RuntimeSignalComponent && (
                    <div className="border-t border-slate-800/80 pt-2 mt-2">
                      <strategyConfig.RuntimeSignalComponent runtimeStatus={runtimeStatus} strategy={strategy} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Exit Plan Card */}
          <ExitPlanCard
            position={openPosition}
            risk={strategy.risk}
            currentPrice={tradeCurrentPrice}
          />
        </div>
      </div>

      {/* Position Section */}
      <Card className="border-slate-800 bg-slate-950 p-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Briefcase className="h-4.5 w-4.5 text-indigo-400" />
            Open Position
          </h3>
          {openPositions.length > 0 && openPositions[0] && (
            <Badge variant="info" className="uppercase font-mono text-[10px]">
              {openPositions[0].status}
            </Badge>
          )}
        </div>

        {openPositions.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs font-medium">
            No open strategy position
          </div>
        ) : openPositions.length === 1 ? (
          (() => {
            const pos = openPositions[0];
            if (!pos) return null;
            const sideFormatted = formatTradeSide(pos.side);
            const isLong = sideFormatted === "BUY";
            const unPnl = pos.unrealizedPnl;
            const totPnl = pos.totalPnl;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-4 items-center font-mono text-xs">
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[9px] uppercase font-semibold">Symbol</span>
                  <span className="text-slate-200 font-bold text-sm block mt-0.5">{pos.symbol}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-semibold">Side</span>
                  <Badge variant={isLong ? "success" : "danger"} className="mt-1 px-1.5 py-0.5 text-[9px] font-bold">
                    {isLong ? "LONG" : "SHORT"}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-semibold">Qty</span>
                  <span className="text-slate-200 font-bold block mt-0.5">{pos.quantity}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-semibold">Avg Price</span>
                  <span className="text-slate-200 font-bold block mt-0.5">{formatCurrency(pos.avgPrice)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-semibold">LTP</span>
                  <span className="text-slate-200 font-bold block mt-0.5">{pos.ltp !== null ? formatCurrency(pos.ltp) : "-"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-semibold">Unrealized P&L</span>
                  <span className={`font-bold block mt-0.5 text-sm ${unPnl > 0 ? "text-emerald-400" : unPnl < 0 ? "text-rose-400" : "text-slate-300"}`}>
                    {formatCurrency(unPnl)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-semibold">Total P&L</span>
                  <span className={`font-bold block mt-0.5 text-sm ${totPnl > 0 ? "text-emerald-400" : totPnl < 0 ? "text-rose-400" : "text-slate-300"}`}>
                    {formatCurrency(totPnl)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-semibold">Status</span>
                  <Badge variant="info" className="uppercase mt-1 px-1.5 py-0.5 text-[9px] font-bold">{pos.status}</Badge>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[9px]">
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Avg Price</th>
                  <th className="py-2.5 px-3">LTP</th>
                  <th className="py-2.5 px-3">Unrealized P&L</th>
                  <th className="py-2.5 px-3">Total P&L</th>
                  <th className="py-2.5 px-3">Status</th>
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
                      <td className="py-3 px-3 font-bold text-slate-200">{pos.symbol}</td>
                      <td className="py-3 px-3">
                        <Badge variant={isLong ? "success" : "danger"} className="px-1.5 py-0.5 text-[9px] font-bold">
                          {isLong ? "LONG" : "SHORT"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-200">{pos.quantity}</td>
                      <td className="py-3 px-3 font-semibold">{formatCurrency(pos.avgPrice)}</td>
                      <td className="py-3 px-3 font-semibold text-slate-200">{pos.ltp !== null ? formatCurrency(pos.ltp) : "-"}</td>
                      <td className={`py-3 px-3 font-bold ${unPnl > 0 ? "text-emerald-400" : unPnl < 0 ? "text-rose-400" : "text-slate-300"}`}>
                        {formatCurrency(unPnl)}
                      </td>
                      <td className={`py-3 px-3 font-bold ${totPnl > 0 ? "text-emerald-400" : totPnl < 0 ? "text-rose-400" : "text-slate-300"}`}>
                        {formatCurrency(totPnl)}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="info" className="uppercase px-1.5 py-0.5 text-[9px] font-bold">{pos.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Orders and Logs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy Orders */}
        <Card className="border-slate-800 bg-slate-950 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800/80 pb-2">
            <Layers className="h-4.5 w-4.5 text-indigo-400" />
            Strategy Orders
          </h3>

          {strategyOrders.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs font-medium">
              No orders executed yet.
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              <table className="w-full text-left text-xs font-mono text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[9px]">
                    <th className="py-2 px-1">Time</th>
                    <th className="py-2 px-1">Side</th>
                    <th className="py-2 px-1">Symbol</th>
                    <th className="py-2 px-1">Qty</th>
                    <th className="py-2 px-1">Price</th>
                    <th className="py-2 px-1 text-right">Status</th>
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
                        <td className="py-2.5 px-1 text-slate-400">{orderTime}</td>
                        <td className="py-2.5 px-1">
                          <Badge variant={sideFormatted === "BUY" ? "success" : "danger"} className="px-1.5 py-0.5 text-[9px] font-bold">
                            {sideFormatted}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-1 font-bold text-slate-200">{order.symbol}</td>
                        <td className="py-2.5 px-1 font-semibold text-slate-200">{order.quantity}</td>
                        <td className="py-2.5 px-1 font-semibold text-slate-100">{formatCurrency(order.price)}</td>
                        <td className="py-2.5 px-1 text-right">
                          <Badge variant={order.status === "FILLED" ? "success" : "danger"} className="px-1.5 py-0.5 text-[9px] font-bold">
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

        {/* Live Logs */}
        <StrategyLogs logs={logs} isPolling={isRunning} />
      </div>

      {/* Collapsible Config Section */}
      <Card className="border-slate-800 bg-slate-950/20 p-4">
        <button
          onClick={() => setIsConfigExpanded(!isConfigExpanded)}
          className="w-full flex items-center justify-between py-1 text-slate-300 hover:text-white transition-colors duration-150"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-4.5 w-4.5 text-slate-400" />
            <span className="font-bold text-xs uppercase tracking-wider">Strategy Config</span>
          </div>
          <div className="flex items-center gap-3">
            {!isConfigExpanded && (
              <span className="hidden lg:inline text-xs text-slate-500 font-medium truncate max-w-[800px]">
                {configSummaryText}
              </span>
            )}
            {isConfigExpanded ? (
              <ChevronUp className="h-4.5 w-4.5 text-slate-400" />
            ) : (
              <ChevronDown className="h-4.5 w-4.5 text-slate-400" />
            )}
          </div>
        </button>

        {!isConfigExpanded && (
          <div className="lg:hidden mt-2 pt-2 border-t border-slate-900/60 text-[10px] text-slate-500 font-medium leading-relaxed">
            {configSummaryText}
          </div>
        )}

        {isConfigExpanded && (
          <div className="space-y-6 mt-4 pt-4 border-t border-slate-800/80 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StrategyInfoCard strategy={strategy} />
              <StrategyJsonPreview strategy={strategy} />
            </div>

            {/* Advanced / Debug Section */}
            <div className="border-t border-slate-800/60 pt-4">
              <div className="border border-slate-800 rounded-xl bg-slate-950/40 p-4">
                <button
                  type="button"
                  onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
                  className="flex items-center justify-between w-full text-slate-300 hover:text-white transition-colors duration-150 py-1"
                >
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-400">Advanced / Debug</span>
                  {isAdvancedExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>

                {isAdvancedExpanded && (
                  <div className="mt-4 border-t border-slate-800/60 pt-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Runtime State
                      </h4>
                      {(() => {
                        const state = runtimeStatus?.state ?? strategy.state;
                        if (!state || Object.keys(state).length === 0) {
                          return <p className="text-xs text-slate-500 italic">No runtime state yet.</p>;
                        }
                        return (
                          <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[300px] whitespace-pre-wrap leading-relaxed">
                            {JSON.stringify(state, null, 2)}
                          </pre>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
