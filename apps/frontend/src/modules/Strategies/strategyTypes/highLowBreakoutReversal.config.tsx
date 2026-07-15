import React from "react";
import { Sliders } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { UNDERLYING_TOKENS } from "../StrategyCreate/constants";

export const HighLowBreakoutReversalConfig = {
  strategyType: "HIGH_LOW_BREAKOUT_REVERSAL",
  label: "High/Low Breakout Reversal",
  description: "Trades reversal after breakout of high/low using 5-min candles",
  defaultValues: {
    squareOffTime: "15:15",
  },
  FormComponent: ({ form, onChange }: { form: any; onChange: (field: any, value: any) => void }) => {
    return (
      <div className="space-y-4">
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl text-xs text-slate-400 space-y-2.5">
          <p className="font-extrabold text-sm text-slate-200 tracking-wide uppercase">Strategy Logic Overview</p>
          <p className="leading-relaxed">This strategy monitors the closed 5-minute candles of the selected Base Index Symbol:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 ml-1">
            <li><strong>PUT Reversal:</strong> If candle high breaks the yesterday's reference High and the candle closes as bearish (close &lt; open), buys the closest ATM PUT option.</li>
            <li><strong>CALL Reversal:</strong> If candle low breaks the yesterday's reference Low and the candle closes as bullish (close &gt; open), buys the closest ATM CALL option.</li>
            <li><strong>Independence:</strong> Both trades can run concurrently. Stop Loss is set to the decision candle's high (PUT) or low (CALL) on the underlying. Target is set to 3x risk.</li>
          </ul>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="EOD Square-off Time (HH:MM, Kolkata time)"
            type="text"
            placeholder="e.g. 15:15"
            value={form.squareOffTime || "15:15"}
            onChange={(e) => onChange("squareOffTime", e.target.value)}
          />
        </div>
      </div>
    );
  },
  PreviewComponent: ({ strategy }: { strategy: any }) => {
    const rules = strategy?.rules || {};
    const risk = strategy?.risk || {};
    return (
      <Card className="border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Sliders className="h-4.5 w-4.5 text-amber-400" />
          Strategy Settings Preview
        </h4>
        <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-800/60 pt-3">
          <div>
            <span className="text-slate-400 block font-medium">Underlying Token ID</span>
            <span className="text-slate-300 mt-0.5 block font-mono">{rules.underlyingToken || "-"}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Exchange Segment</span>
            <span className="text-slate-300 mt-0.5 block font-semibold">{rules.underlyingExchange || "NSE"}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Evaluation Timeframe</span>
            <span className="text-slate-300 mt-0.5 block font-semibold">{rules.timeframe || "5m"}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">EOD Square-off Time</span>
            <span className="text-slate-300 mt-0.5 block font-mono font-semibold">{rules.squareOffTime || "15:15"}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Target Reward Ratio</span>
            <span className="text-slate-300 mt-0.5 block font-bold text-amber-400">
              {risk.rewardRatio ? `${risk.rewardRatio}x Risk` : "3x Risk"}
            </span>
          </div>
        </div>
      </Card>
    );
  },
  RuntimeSignalComponent: ({ runtimeStatus, strategy, candles = [], positions = [] }: { runtimeStatus: any; strategy: any; candles?: any[]; positions?: any[] }) => {
    const state = strategy?.state || runtimeStatus?.state || {};
    const putTrack = state.putTrack || {};
    const callTrack = state.callTrack || {};

    const lastCandle = candles[candles.length - 1];
    const isBearish = lastCandle ? lastCandle.close < lastCandle.open : false;
    const isBullish = lastCandle ? lastCandle.close > lastCandle.open : false;

    // Signal Condition checks
    const putHighBreak = lastCandle && putTrack.referenceHigh ? (lastCandle.high > putTrack.referenceHigh ? "YES" : "NO") : "NO";
    const putRedCandle = isBearish ? "YES" : "NO";
    const putSignalReady = putHighBreak === "YES" && putRedCandle === "YES" ? "YES" : "NO";

    const callLowBreak = lastCandle && callTrack.referenceLow ? (lastCandle.low < callTrack.referenceLow ? "YES" : "NO") : "NO";
    const callGreenCandle = isBullish ? "YES" : "NO";
    const callSignalReady = callLowBreak === "YES" && callGreenCandle === "YES" ? "YES" : "NO";

    // Find positions
    const putPos = positions.find(p => p.id === putTrack.currentPositionId && p.status === "OPEN");
    const callPos = positions.find(p => p.id === callTrack.currentPositionId && p.status === "OPEN");
    const putPnL = putPos?.pnl ?? 0;
    const callPnL = callPos?.pnl ?? 0;

    return (
      <div className="space-y-5 text-xs">
        {/* Live 5-Min Candle Panel */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-300 uppercase tracking-wide">Live 5-Min Candle Info</span>
            {lastCandle && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${isBearish ? "bg-red-500/20 text-red-400" : isBullish ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                {isBearish ? "Bearish (RED)" : isBullish ? "Bullish (GREEN)" : "Neutral"}
              </span>
            )}
          </div>
          {lastCandle ? (
            <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-mono pt-1 text-slate-300">
              <div className="bg-slate-900/60 p-1.5 rounded border border-slate-900/40">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">Open</span>
                <span>₹{lastCandle.open.toLocaleString("en-IN")}</span>
              </div>
              <div className="bg-slate-900/60 p-1.5 rounded border border-slate-900/40">
                <span className="text-[9px] text-slate-500 block uppercase font-bold text-emerald-500/80">High</span>
                <span>₹{lastCandle.high.toLocaleString("en-IN")}</span>
              </div>
              <div className="bg-slate-900/60 p-1.5 rounded border border-slate-900/40">
                <span className="text-[9px] text-slate-500 block uppercase font-bold text-red-500/80">Low</span>
                <span>₹{lastCandle.low.toLocaleString("en-IN")}</span>
              </div>
              <div className="bg-slate-900/60 p-1.5 rounded border border-slate-900/40">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">Close</span>
                <span>₹{lastCandle.close.toLocaleString("en-IN")}</span>
              </div>
            </div>
          ) : (
            <span className="text-slate-500 italic block text-center py-2">No candle data loaded</span>
          )}
        </div>

        {/* Split PUT and CALL Tracks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PUT Track (Red Theme) */}
          <div className="bg-red-950/10 border border-red-900/30 p-3 rounded-lg space-y-3">
            <div className="border-b border-red-900/20 pb-1.5 flex justify-between items-center">
              <span className="font-extrabold text-red-400 uppercase tracking-wider text-[10px]">PUT Track (High Break)</span>
              <span className={`h-2 w-2 rounded-full ${putTrack.isTradeOpen ? "bg-red-500 animate-ping" : "bg-slate-700"}`} />
            </div>
            
            <div className="space-y-1.5 text-slate-400">
              <div className="flex justify-between">
                <span>Ref High</span>
                <span className="font-mono text-slate-200 font-bold">₹{putTrack.referenceHigh?.toLocaleString("en-IN") || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>High Break</span>
                <span className={`font-mono font-bold ${putHighBreak === "YES" ? "text-red-400" : "text-slate-500"}`}>{putHighBreak}</span>
              </div>
              <div className="flex justify-between">
                <span>Red Candle</span>
                <span className={`font-mono font-bold ${putRedCandle === "YES" ? "text-red-400" : "text-slate-500"}`}>{putRedCandle}</span>
              </div>
              <div className="flex justify-between border-t border-red-900/20 pt-1.5 mt-1.5 font-bold">
                <span className="text-red-300">Signal Ready</span>
                <span className={putSignalReady === "YES" ? "text-red-400 animate-pulse" : "text-slate-500"}>{putSignalReady}</span>
              </div>
            </div>

            {putTrack.isTradeOpen ? (
              <div className="bg-red-950/20 border border-red-900/40 p-2 rounded text-[11px] space-y-1">
                <span className="font-bold text-red-400 uppercase tracking-widest text-[9px] block">Active PUT Position</span>
                <div className="flex justify-between text-slate-400">
                  <span>Entry Spot</span>
                  <span className="font-mono text-slate-300">₹{putTrack.underlyingEntryPrice?.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Target Premium</span>
                  <span className="font-mono text-emerald-400">₹{putTrack.optionTarget?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Stop Loss Spot</span>
                  <span className="font-mono text-red-400">₹{putTrack.stopLoss?.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between border-t border-red-900/20 pt-1 mt-1 font-bold">
                  <span>Unrealized PnL</span>
                  <span className={`font-mono ${putPos ? (putPnL >= 0 ? "text-emerald-400" : "text-red-400") : "text-slate-500"}`}>
                    {putPos ? `₹${putPnL.toFixed(2)}` : "₹0.00"}
                  </span>
                </div>
              </div>
            ) : putTrack.lastEvaluatedCandleTime && (
              <div className="bg-slate-900/30 p-2 rounded text-[10px] text-slate-500 border border-slate-900/40 leading-normal">
                <span className="font-bold uppercase tracking-widest text-[8px] block mb-0.5 text-slate-400">Last Decision Candle</span>
                <div>High (SL): ₹{putTrack.decisionCandleHigh?.toLocaleString("en-IN")}</div>
              </div>
            )}
          </div>

          {/* CALL Track (Green Theme) */}
          <div className="bg-emerald-950/10 border border-emerald-900/30 p-3 rounded-lg space-y-3">
            <div className="border-b border-emerald-900/20 pb-1.5 flex justify-between items-center">
              <span className="font-extrabold text-emerald-400 uppercase tracking-wider text-[10px]">CALL Track (Low Break)</span>
              <span className={`h-2 w-2 rounded-full ${callTrack.isTradeOpen ? "bg-emerald-500 animate-ping" : "bg-slate-700"}`} />
            </div>

            <div className="space-y-1.5 text-slate-400">
              <div className="flex justify-between">
                <span>Ref Low</span>
                <span className="font-mono text-slate-200 font-bold">₹{callTrack.referenceLow?.toLocaleString("en-IN") || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Low Break</span>
                <span className={`font-mono font-bold ${callLowBreak === "YES" ? "text-emerald-400" : "text-slate-500"}`}>{callLowBreak}</span>
              </div>
              <div className="flex justify-between">
                <span>Green Candle</span>
                <span className={`font-mono font-bold ${callGreenCandle === "YES" ? "text-emerald-400" : "text-slate-500"}`}>{callGreenCandle}</span>
              </div>
              <div className="flex justify-between border-t border-emerald-900/20 pt-1.5 mt-1.5 font-bold">
                <span className="text-emerald-300">Signal Ready</span>
                <span className={callSignalReady === "YES" ? "text-emerald-400 animate-pulse" : "text-slate-500"}>{callSignalReady}</span>
              </div>
            </div>

            {callTrack.isTradeOpen ? (
              <div className="bg-emerald-950/20 border border-emerald-900/40 p-2 rounded text-[11px] space-y-1">
                <span className="font-bold text-emerald-400 uppercase tracking-widest text-[9px] block">Active CALL Position</span>
                <div className="flex justify-between text-slate-400">
                  <span>Entry Spot</span>
                  <span className="font-mono text-slate-300">₹{callTrack.underlyingEntryPrice?.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Target Premium</span>
                  <span className="font-mono text-emerald-400">₹{callTrack.optionTarget?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Stop Loss Spot</span>
                  <span className="font-mono text-red-400">₹{callTrack.stopLoss?.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between border-t border-emerald-900/20 pt-1 mt-1 font-bold">
                  <span>Unrealized PnL</span>
                  <span className={`font-mono ${callPos ? (callPnL >= 0 ? "text-emerald-400" : "text-red-400") : "text-slate-500"}`}>
                    {callPos ? `₹${callPnL.toFixed(2)}` : "₹0.00"}
                  </span>
                </div>
              </div>
            ) : callTrack.lastEvaluatedCandleTime && (
              <div className="bg-slate-900/30 p-2 rounded text-[10px] text-slate-500 border border-slate-900/40 leading-normal">
                <span className="font-bold uppercase tracking-widest text-[8px] block mb-0.5 text-slate-400">Last Decision Candle</span>
                <div>Low (SL): ₹{callTrack.decisionCandleLow?.toLocaleString("en-IN")}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
  getSummaryText: (strategy: any) => {
    return "High-Low Breakout Reversal Strategy";
  },
  buildRulesPayload: (form: any) => {
    const underlying = UNDERLYING_TOKENS[form.symbol as keyof typeof UNDERLYING_TOKENS];
    return {
      type: "HIGH_LOW_BREAKOUT_REVERSAL",
      underlyingToken: underlying?.token || "",
      underlyingExchange: "NSE",
      timeframe: "5m",
      squareOffTime: form.squareOffTime || "15:15",
    };
  },
  isFormValid: (form: any) => {
    if (!form.squareOffTime) return false;
    const match = form.squareOffTime.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    return !!match;
  }
};
