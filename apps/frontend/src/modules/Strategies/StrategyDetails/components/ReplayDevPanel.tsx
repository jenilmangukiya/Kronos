import React, { useState, useEffect, useRef } from "react";
import { Play, Square, Terminal, Shield, RefreshCw, Clock, TrendingUp, Coins, Compass, Activity } from "lucide-react";
import { axiosAuth } from "../../../../services/api/axios";
import { Card } from "../../../../components/ui/Card";
import { Badge } from "../../../../components/ui/Badge";
import { Spinner } from "../../../../components/ui/Spinner";
import { formatCurrency } from "../../../../utils/format";

interface ReplayPosition {
  id: string;
  symbol: string;
  token: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  status: "OPEN" | "CLOSED";
  side: "LONG" | "SHORT";
  realizedPnl: number;
  pnl: number;
  openedAtMarketTime?: number;
  closedAtMarketTime?: number;
}

interface ReplayLog {
  id: string;
  message: string;
  createdAt: string;
}

interface ReplaySession {
  id: string;
  isRunning: boolean;
  speed: number;
  currentIndex: number;
  candles: any[];
  logs: ReplayLog[];
  positions: ReplayPosition[];
  currentTime?: number | string | null;
  currentUnderlyingPrice?: number | null;
  currentTradePrice?: number | null;
  totalCandles?: number | null;
  totalTrades?: number;
  winningTrades?: number;
  losingTrades?: number;
  totalPnl?: number;
  maxProfit?: number;
  maxLoss?: number;
  winRate?: number;
  avgPnl?: number;
  isPaused?: boolean;
  shouldStep?: boolean;
}

interface ReplayDevPanelProps {
  strategyId: string;
  brokerAccountId: string;
  symbol: string;
}

export const ReplayDevPanel: React.FC<ReplayDevPanelProps> = ({
  strategyId,
  brokerAccountId,
  symbol,
}) => {
  const getYesterdayDateString = () => {
    const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatTime = (ts: number | string | null | undefined): string => {
    if (!ts) return "--:--:--";
    const date = new Date(Number(ts) * 1000);
    return date.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const [date, setDate] = useState(getYesterdayDateString());
  const [speed, setSpeed] = useState<number>(1);
  const [session, setSession] = useState<ReplaySession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const prevLogsLengthRef = useRef(0);

  const [showCandles, setShowCandles] = useState(true);
  const [showChecks, setShowChecks] = useState(true);
  const [showEntries, setShowEntries] = useState(true);

  const parseLog = (log: ReplayLog) => {
    const match = log.message.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*([\s\S]*)$/);
    let timeStr = "";
    let messageBody = log.message;

    if (match) {
      timeStr = match[1] || "";
      messageBody = match[2] || "";
    } else if (log.createdAt) {
      try {
        timeStr = new Date(log.createdAt).toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
      } catch {}
    }

    let tagText = "LOG";
    let content = messageBody.trim();
    let tagType: "candle" | "checkA" | "detect" | "waiting" | "candleBStart" | "checkB" | "entry" | "exit" | "failed" | "other" = "other";

    if (messageBody.includes("[CANDLE]")) {
      tagText = "CANDLE";
      tagType = "candle";
      content = messageBody.replace("[CANDLE] ", "").replace("[CANDLE]", "").trim();
    } else if (messageBody.includes("[CHECK A]")) {
      tagText = "CHECK A";
      tagType = "checkA";
      content = messageBody.replace("[CHECK A] ", "").replace("[CHECK A]", "").trim();
    } else if (messageBody.includes("[CANDLE A DETECTED]")) {
      tagText = "CANDLE A DETECTED";
      tagType = "detect";
      content = messageBody.replace("[CANDLE A DETECTED] ", "").replace("[CANDLE A DETECTED]", "").trim();
    } else if (messageBody.includes("[WAITING]")) {
      tagText = "WAITING";
      tagType = "waiting";
      content = messageBody.replace("[WAITING] ", "").replace("[WAITING]", "").trim();
    } else if (messageBody.includes("[CANDLE B START]")) {
      tagText = "CANDLE B START";
      tagType = "candleBStart";
      content = messageBody.replace("[CANDLE B START] ", "").replace("[CANDLE B START]", "").trim();
    } else if (messageBody.includes("[CHECK B]")) {
      tagText = "CHECK B";
      tagType = "checkB";
      content = messageBody.replace("[CHECK B] ", "").replace("[CHECK B]", "").trim();
    } else if (messageBody.includes("[EXIT]")) {
      tagText = "EXIT";
      tagType = "exit";
      content = messageBody.replace("[EXIT] ", "").replace("[EXIT]", "").trim();
    } else if (messageBody.includes("[ENTRY]")) {
      tagText = "ENTRY";
      tagType = "entry";
      content = messageBody.replace("[ENTRY] ", "").replace("[ENTRY]", "").trim();
    } else if (messageBody.includes("[FAILED]")) {
      tagText = "FAILED";
      tagType = "failed";
      content = messageBody.replace("[FAILED] ", "").replace("[FAILED]", "").trim();
    } else if (messageBody.includes("[REFERENCE]")) {
      tagText = "REFERENCE";
      tagType = "checkA";
      content = messageBody.replace("[REFERENCE] ", "").replace("[REFERENCE]", "").trim();
    } else if (messageBody.includes("[STATE]")) {
      tagText = "STATE";
      tagType = "checkA";
      content = messageBody.replace("[STATE] ", "").replace("[STATE]", "").trim();
    } else if (messageBody.includes("[START]")) {
      tagText = "START";
      tagType = "other";
      content = messageBody.replace("[START] ", "").replace("[START]", "").trim();
    } else if (messageBody.includes("[END]")) {
      tagText = "END";
      tagType = "other";
      content = messageBody.replace("[END] ", "").replace("[END]", "").trim();
    } else {
      if (messageBody.includes("Exited") || messageBody.includes("square-off") || messageBody.includes("Stop Loss hit") || messageBody.includes("Target hit")) {
        tagText = "EXIT";
        tagType = "exit";
      } else if (messageBody.includes("triggered") || messageBody.includes("Entered")) {
        tagText = "ENTRY";
        tagType = "entry";
      } else if (messageBody.includes("Pattern failed")) {
        tagText = "FAILED";
        tagType = "failed";
      }
    }

    return { timeStr, tagText, tagType, content };
  };

  const getLogStyle = (tagType: string) => {
    switch (tagType) {
      case "candle":
        return {
          textColorClass: "text-slate-400 font-normal text-[10px]",
          bgClass: "bg-slate-950/40",
          borderClass: "border-slate-800/40",
          tagColor: "bg-slate-900/60 text-slate-400 border-slate-800/40",
        };
      case "checkA":
      case "checkB":
        return {
          textColorClass: "text-blue-400 font-normal text-[10px]",
          bgClass: "bg-blue-500/5",
          borderClass: "border-blue-500/20",
          tagColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        };
      case "detect":
        return {
          textColorClass: "text-yellow-400 font-bold text-xs leading-normal",
          bgClass: "bg-yellow-500/5",
          borderClass: "border-yellow-500/20",
          tagColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        };
      case "waiting":
        return {
          textColorClass: "text-orange-400 font-normal text-[10px]",
          bgClass: "bg-orange-500/5",
          borderClass: "border-orange-500/20",
          tagColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        };
      case "candleBStart":
        return {
          textColorClass: "text-blue-400 font-semibold text-[10px]",
          bgClass: "bg-blue-500/5",
          borderClass: "border-blue-500/20",
          tagColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        };
      case "entry":
        return {
          textColorClass: "text-emerald-400 font-bold text-xs leading-normal",
          bgClass: "bg-emerald-500/5",
          borderClass: "border-emerald-500/20",
          tagColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        };
      case "exit":
        return {
          textColorClass: "text-rose-400 font-bold text-xs leading-normal",
          bgClass: "bg-rose-500/5",
          borderClass: "border-rose-500/20",
          tagColor: "bg-rose-500/20 text-rose-400 border-rose-500/30",
        };
      case "failed":
        return {
          textColorClass: "text-rose-400 font-bold text-xs leading-normal",
          bgClass: "bg-rose-500/5",
          borderClass: "border-rose-500/20",
          tagColor: "bg-rose-500/20 text-rose-400 border-rose-500/30",
        };
      default:
        return {
          textColorClass: "text-slate-300 font-normal text-[10px]",
          bgClass: "bg-slate-900/20",
          borderClass: "border-slate-800/40",
          tagColor: "bg-slate-850 text-slate-400 border border-slate-800/40",
        };
    }
  };

  // Console logging inside debug mode
  useEffect(() => {
    if (isDebugMode && session?.positions) {
      session.positions.forEach((pos) => {
        const isClosed = pos.status === "CLOSED";
        const isLong = pos.side === "LONG";
        const ltp = pos.currentPrice ?? 0;
        const expectedPnL = isLong
          ? (ltp - pos.entryPrice) * pos.quantity
          : (pos.entryPrice - ltp) * pos.quantity;
        const actualPnL = pos.pnl ?? 0;
        console.log({
          entryPrice: pos.entryPrice,
          exitPrice: isClosed ? pos.currentPrice : null,
          currentPrice: ltp,
          quantity: pos.quantity,
          side: pos.side,
          expectedPnL,
          actualPnL,
        });
      });
    }
  }, [isDebugMode, session?.positions]);

  // Poll current session status
  const pollSession = async () => {
    try {
      const response = await axiosAuth.get<ReplaySession>("/replay/session");
      if (response.data) {
        setSession(response.data);
      } else {
        setSession(null);
      }
    } catch (err) {
      setSession(null);
    }
  };

  // Poll session status exactly once on mount to handle page refreshes
  useEffect(() => {
    pollSession();
  }, []);

  // Poll current session status dynamically only when a replay session is running
  useEffect(() => {
    if (!session?.isRunning) return;

    // Fast poll (2000ms) when running, slow poll (5000ms) when paused or stopped
    const intervalTime = session?.isPaused ? 5000 : 2000;
    const interval = setInterval(pollSession, intervalTime);

    return () => {
      clearInterval(interval);
    };
  }, [session?.isRunning, session?.isPaused]);

  const filteredLogs = session
    ? session.logs.filter((log) => {
        const { tagType } = parseLog(log);
        if (tagType === "candle" && !showCandles) return false;
        if ((tagType === "checkA" || tagType === "checkB") && !showChecks) return false;
        if ((tagType === "detect" || tagType === "waiting" || tagType === "candleBStart" || tagType === "entry" || tagType === "exit" || tagType === "failed") && !showEntries) return false;
        return true;
      })
    : [];

  // Scroll to bottom of logs when they change (only if near bottom or first load)
  useEffect(() => {
    if (logContainerRef.current) {
      const container = logContainerRef.current;
      const logsCount = filteredLogs.length;
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 60;
      const isFirstLoad = prevLogsLengthRef.current === 0 && logsCount > 0;

      if (isAtBottom || isFirstLoad) {
        container.scrollTop = container.scrollHeight;
      }
      prevLogsLengthRef.current = logsCount;
    }
  }, [filteredLogs]);

  // Handle Start Replay
  const handleStart = async () => {
    if (!brokerAccountId) {
      setError("Active broker account is required to start replay.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // 1. Start Replay Session
      await axiosAuth.post("/replay/start", {
        strategyId,
        brokerAccountId,
        speed,
        date,
      });

      // 2. Fetch Historical Candles
      await axiosAuth.get("/replay/history", {
        params: {
          symbol,
          interval: "1m",
          date,
        },
      });

      // 3. Update status immediately
      await pollSession();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error?.message || "Failed to start replay.");
      // Ensure session is cleared if start failed
      try {
        await axiosAuth.post("/replay/stop");
      } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Stop Replay
  const handleStop = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await axiosAuth.post("/replay/stop");
      setSession(null);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to stop replay.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Pause Replay
  const handlePause = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await axiosAuth.post("/replay/pause");
      await pollSession();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to pause replay.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resume Replay
  const handleResume = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await axiosAuth.post("/replay/resume");
      await pollSession();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to resume replay.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step Replay
  const handleStep = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await axiosAuth.post("/replay/step");
      await pollSession();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to step replay.");
    } finally {
      setIsLoading(false);
    }
  };

  const isReplayRunning = session?.isRunning || false;

  return (
    <Card className="border-amber-500/20 bg-slate-950 p-6 space-y-6 relative overflow-hidden shadow-2xl">
      {/* Decorative Gradient Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
            <Shield className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-extrabold text-slate-100 flex items-center gap-2">
              Market Replay Dev Panel
              <Badge variant="warning" className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                DEV ONLY
              </Badge>
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Simulate tick updates without impacting production DB or real trades.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDebugMode(!isDebugMode)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase border transition-all ${
              isDebugMode
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300 hover:border-slate-700"
            }`}
          >
            {isDebugMode ? "Debug Mode: ON" : "Show Debug Mode"}
          </button>

          {isReplayRunning && (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Running ({session?.currentIndex ?? 0}/{session?.candles?.length ?? 0}m)
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-lg font-medium leading-relaxed">
          {error}
        </div>
      )}

      {/* Progress & Summary Stats */}
      {session && (
        (() => {
          const total = session.totalCandles ?? session.candles?.length ?? 0;
          const current = session.currentIndex ?? 0;
          const percent = total > 0 ? Math.round((current / total) * 100) : 0;

          return (
            <div className="space-y-5 animate-fadeIn">
              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] uppercase font-black text-slate-500 tracking-wider">
                  <span>Replay Progress</span>
                  <span>{percent}%</span>
                </div>
                <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                {/* Replay Time */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-amber-500/80" />
                    <span className="text-[9px] uppercase font-extrabold tracking-wider">Replay Time</span>
                  </div>
                  <span className="text-sm font-black text-slate-100 font-mono mt-1.5">
                    {formatTime(session.currentTime)}
                  </span>
                </div>

                {/* Underlying Index Price */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-500/80" />
                    <span className="text-[9px] uppercase font-extrabold tracking-wider">Underlying Price</span>
                  </div>
                  <span className="text-sm font-black text-blue-400 font-mono mt-1.5">
                    {session.currentUnderlyingPrice ? formatCurrency(session.currentUnderlyingPrice) : "₹0.00"}
                  </span>
                </div>

                {/* Traded Instrument Price */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Coins className="h-3.5 w-3.5 text-emerald-500/80" />
                    <span className="text-[9px] uppercase font-extrabold tracking-wider">Trade Price</span>
                  </div>
                  <span className="text-sm font-black text-emerald-400 font-mono mt-1.5">
                    {session.currentTradePrice ? formatCurrency(session.currentTradePrice) : "₹0.00"}
                  </span>
                </div>

                {/* Progress Count */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Compass className="h-3.5 w-3.5 text-indigo-500/80" />
                    <span className="text-[9px] uppercase font-extrabold tracking-wider">Progress</span>
                  </div>
                  <span className="text-sm font-black text-indigo-400 font-mono mt-1.5">
                    {current} / {total} <span className="text-[10px] text-slate-500 font-normal">({percent}%)</span>
                  </span>
                </div>

                {/* Speed Multiplier */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between col-span-2 md:col-span-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Activity className="h-3.5 w-3.5 text-rose-500/80" />
                    <span className="text-[9px] uppercase font-extrabold tracking-wider">Replay Speed</span>
                  </div>
                  <span className="text-sm font-black text-rose-400 font-mono mt-1.5">
                    {session.speed}x
                  </span>
                </div>
              </div>

              {/* Performance Metrics Summary */}
              <div className="space-y-2 bg-slate-900/30 border border-slate-805 rounded-xl p-4.5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                  <Activity className="h-3.5 w-3.5 text-amber-500" />
                  Performance Metrics Summary
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Total Trades & Win Rate */}
                  <div className="bg-slate-950/40 border border-slate-900/60 rounded-xl p-3.5 flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-500">Total Trades</span>
                    <span className="text-base font-black text-slate-100 font-mono mt-1">
                      {session.totalTrades ?? 0}
                    </span>
                    <span className="text-[9.5px] text-slate-500 mt-1">
                      Wins: {session.winningTrades ?? 0} | Losses: {session.losingTrades ?? 0}
                    </span>
                  </div>

                  <div className="bg-slate-950/40 border border-slate-900/60 rounded-xl p-3.5 flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-500">Win Rate</span>
                    <span className="text-base font-black text-amber-400 font-mono mt-1">
                      {(session.winRate ?? 0).toFixed(1)}%
                    </span>
                    <div className="w-full bg-slate-900 h-1 mt-2 overflow-hidden rounded-full">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${session.winRate ?? 0}%` }} />
                    </div>
                  </div>

                  {/* Total PnL & Avg PnL */}
                  <div className="bg-slate-950/40 border border-slate-900/60 rounded-xl p-3.5 flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-500">Total PnL</span>
                    <span className={`text-base font-black font-mono mt-1 ${(session.totalPnl ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatCurrency(session.totalPnl ?? 0)}
                    </span>
                    <span className="text-[9.5px] text-slate-500 mt-1">
                      Avg / Trade: {formatCurrency(session.avgPnl ?? 0)}
                    </span>
                  </div>

                  {/* Max Profit / Loss */}
                  <div className="bg-slate-950/40 border border-slate-900/60 rounded-xl p-3.5 flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-500">Peak Stats</span>
                    <span className="text-[10px] font-black text-slate-300 font-mono mt-1 flex justify-between">
                      <span>Max Profit:</span>
                      <span className="text-emerald-400">{formatCurrency(session.maxProfit ?? 0)}</span>
                    </span>
                    <span className="text-[10px] font-black text-slate-300 font-mono mt-1 flex justify-between">
                      <span>Max Loss:</span>
                      <span className="text-rose-400">{formatCurrency(session.maxLoss ?? 0)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Control Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Date Selector */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Historical Date</label>
          <input
            type="date"
            value={date}
            disabled={isReplayRunning}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>

        {/* Speed Selector */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Replay Speed</label>
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {[1, 5, 10, 20].map((s) => (
              <button
                key={s}
                disabled={isReplayRunning}
                onClick={() => setSpeed(s)}
                className={`flex-1 text-center py-1.5 rounded-md text-xs font-black transition-all ${
                  speed === s
                    ? "bg-amber-500/20 text-amber-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Start / Stop Trigger */}
        <div className="md:col-span-2">
          {!isReplayRunning ? (
            <button
              onClick={handleStart}
              disabled={isLoading || !brokerAccountId}
              className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-black text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 uppercase tracking-wider"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="text-slate-950" /> Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-slate-950" /> Start Replay
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={isLoading}
              className="w-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 hover:border-rose-500/40 text-rose-400 font-black text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all uppercase tracking-wider active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="text-rose-400" /> Stopping...
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 fill-rose-400 text-rose-400" /> Stop Replay
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Playback Controls (Pause/Resume/Step) */}
      {session && (
        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-900 animate-fadeIn">
          {session.isPaused ? (
            <button
              onClick={handleResume}
              disabled={isLoading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all uppercase tracking-wider active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-slate-950" /> Resume Replay
            </button>
          ) : (
            <button
              onClick={handlePause}
              disabled={isLoading}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all uppercase tracking-wider active:scale-[0.98]"
            >
              <div className="flex gap-1 h-3.5 items-center justify-center select-none">
                <div className="w-0.75 bg-slate-950 h-3.5 rounded-sm" />
                <div className="w-0.75 bg-slate-950 h-3.5 rounded-sm" />
              </div>
              Pause Replay
            </button>
          )}

          {session.isPaused && (
            <button
              onClick={handleStep}
              disabled={isLoading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-slate-950 font-black text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all uppercase tracking-wider active:scale-[0.98]"
            >
              <svg className="h-4 w-4 fill-slate-950" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
              Next Step
            </button>
          )}
        </div>
      )}

      {/* Grid of Results: Positions and Logs */}
      {session && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-900 animate-fadeIn">
          {/* Replay Positions */}
          <div className="space-y-3 bg-slate-900/30 border border-slate-900 rounded-xl p-4.5 flex flex-col h-[350px]">
            <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-2 border-b border-slate-900 pb-2 shrink-0">
              <Play className="h-3.5 w-3.5 text-amber-500" />
              Replay Positions ({session.positions.length})
            </h4>

            {session.positions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs italic flex-1 flex items-center justify-center">
                No simulated positions opened yet.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto overflow-x-auto pr-1 custom-scrollbar">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                      <th className="py-2 px-1">Symbol</th>
                      <th className="py-2 px-1">Side</th>
                      <th className="py-2 px-1">Qty</th>
                      <th className="py-2 px-1">Entry</th>
                      <th className="py-2 px-1">Exit</th>
                      <th className="py-2 px-1">LTP</th>
                      <th className="py-2 px-1 text-right">PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {[...session.positions].reverse().map((pos) => {
                      const isClosed = pos.status === "CLOSED";
                      const isLong = pos.side === "LONG";
                      const ltp = pos.currentPrice ?? 0;
                      const expectedPnL = isLong
                        ? (ltp - pos.entryPrice) * pos.quantity
                        : (pos.entryPrice - ltp) * pos.quantity;
                      const actualPnL = pos.pnl ?? 0;
                      const exitPrice = isClosed ? pos.currentPrice : null;

                      const absDiff = Math.abs(expectedPnL - actualPnL);
                      const isMismatch = absDiff > 1.0;

                      return (
                        <React.Fragment key={pos.id}>
                          <tr className="hover:bg-slate-900/20">
                            <td className="py-2 px-1 font-bold text-slate-300">
                              {pos.symbol}
                              {isClosed && (
                                <span className="ml-1 text-[8px] text-slate-500 border border-slate-800 px-1 rounded uppercase">
                                  Closed
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-1">
                              <span className={`font-black ${isLong ? "text-emerald-400" : "text-rose-400"}`}>
                                {pos.side}
                              </span>
                            </td>
                            <td className="py-2 px-1 text-slate-300 font-semibold">{pos.quantity}</td>
                            <td className="py-2 px-1 text-slate-400">
                               <div>{formatCurrency(pos.entryPrice)}</div>
                               {pos.openedAtMarketTime && (
                                 <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                   {formatTime(pos.openedAtMarketTime)}
                                 </div>
                               )}
                             </td>
                             <td className="py-2 px-1 text-slate-400">
                               {exitPrice ? (
                                 <>
                                   <div>{formatCurrency(exitPrice)}</div>
                                   {pos.closedAtMarketTime && (
                                     <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                       {formatTime(pos.closedAtMarketTime)}
                                     </div>
                                   )}
                                 </>
                               ) : (
                                 "-"
                               )}
                             </td>
                            <td className="py-2 px-1 text-slate-300 font-semibold">{formatCurrency(ltp)}</td>
                            <td className={`py-2 px-1 text-right font-black ${actualPnL > 0 ? "text-emerald-400" : actualPnL < 0 ? "text-rose-400" : "text-slate-400"}`}>
                              {formatCurrency(actualPnL)}
                            </td>
                          </tr>

                          {isDebugMode && (
                            <tr className="bg-slate-900/30 border-b border-slate-800/40 text-[10px] font-mono text-slate-400">
                              <td colSpan={7} className="py-2.5 px-3 animate-fadeIn">
                                <div className="flex flex-col gap-2">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Raw entryPrice</span>
                                      <span className="text-slate-300 font-semibold">{pos.entryPrice.toFixed(4)}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Raw exitPrice / currentPrice</span>
                                      <span className="text-slate-300 font-semibold">{ltp.toFixed(4)}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Raw quantity</span>
                                      <span className="text-slate-300 font-semibold">{pos.quantity}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Raw side</span>
                                      <span className="text-slate-300 font-semibold">{pos.side}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-x-6 gap-y-1.5 pt-1.5 border-t border-slate-800/50">
                                    <div>
                                      <span className="text-slate-500 mr-1.5">Expected PnL Formula:</span>
                                      <span className="text-slate-300">
                                        {isLong 
                                          ? `(${ltp.toFixed(2)} - ${pos.entryPrice.toFixed(2)}) * ${pos.quantity}` 
                                          : `(${pos.entryPrice.toFixed(2)} - ${ltp.toFixed(2)}) * ${pos.quantity}`}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 mr-1.5">Expected PnL:</span>
                                      <span className="text-amber-400 font-bold">₹{expectedPnL.toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 mr-1.5">Actual PnL (from system):</span>
                                      <span className="text-emerald-400 font-bold">₹{actualPnL.toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 mr-1.5">Difference:</span>
                                      <span className={`font-bold ${isMismatch ? "text-rose-400" : "text-slate-300"}`}>
                                        ₹{absDiff.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>

                                  {isMismatch && (
                                    <div className="mt-1 flex items-center gap-1.5 text-rose-400 font-bold text-[9px] uppercase tracking-wider bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded w-max">
                                      ⚠ PnL mismatch detected
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Replay Logs */}
          <div className="space-y-3 bg-slate-900/30 border border-slate-900 rounded-xl p-4.5 flex flex-col h-[350px]">
            <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center justify-between border-b border-slate-900 pb-2">
              <span className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-amber-500" />
                Replay Logs ({filteredLogs.length}/{session.logs.length})
              </span>
              <button
                onClick={pollSession}
                className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-slate-200 transition-colors"
                title="Refresh logs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </h4>

            {/* Filter Checkboxes */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] uppercase font-black text-slate-500 select-none pb-2 border-b border-slate-900">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={showCandles}
                  onChange={(e) => setShowCandles(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-0 focus:ring-offset-0 h-3 w-3 cursor-pointer"
                />
                Show Candle Logs
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={showChecks}
                  onChange={(e) => setShowChecks(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-0 focus:ring-offset-0 h-3 w-3 cursor-pointer"
                />
                Show Check Logs
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={showEntries}
                  onChange={(e) => setShowEntries(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-0 focus:ring-offset-0 h-3 w-3 cursor-pointer"
                />
                Show Entry Logs
              </label>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs italic flex-1 flex items-center justify-center">
                No logs matching filters.
              </div>
            ) : (
              <div ref={logContainerRef} className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 pr-2 custom-scrollbar bg-slate-950/80 border border-slate-900 p-3 rounded-lg leading-relaxed">
                {filteredLogs.map((log) => {
                  const { timeStr, tagText, tagType, content } = parseLog(log);
                  const { textColorClass, bgClass, borderClass, tagColor } = getLogStyle(tagType);

                  return (
                    <div
                      key={log.id}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border ${bgClass} ${borderClass} transition-all duration-150`}
                    >
                      {timeStr ? (
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 select-none">
                          {timeStr} —
                        </span>
                      ) : null}
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${tagColor} select-none`}>
                        {tagText}
                      </span>
                      <span className={`flex-1 break-all font-mono ${textColorClass}`}>{content}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
