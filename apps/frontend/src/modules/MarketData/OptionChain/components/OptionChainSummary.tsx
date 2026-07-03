import React from "react";
import { OptionChain } from "../../../../services/market-data/MarketDataService";
import { Card } from "../../../../components/ui/Card";
import { formatNumber } from "../../../../utils/format";

interface OptionChainSummaryProps {
  summary: OptionChain["summary"];
  underlying: OptionChain["underlying"];
}

export const OptionChainSummary: React.FC<OptionChainSummaryProps> = ({
  summary,
  underlying,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card className="border-slate-800 bg-slate-900/30 p-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Underlying Price</p>
        <p className="text-xl font-extrabold text-blue-400 mt-1">{formatNumber(underlying.ltp)}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{underlying.exchange}</p>
      </Card>

      <Card className="border-slate-800 bg-slate-900/30 p-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">ATM Strike</p>
        <p className="text-xl font-extrabold text-slate-200 mt-1">{formatNumber(underlying.atmStrike, 0)}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">At-The-Money</p>
      </Card>

      <Card className="border-slate-800 bg-slate-900/30 p-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Put-Call Ratio (PCR)</p>
        <p className="text-xl font-extrabold text-indigo-400 mt-1">{formatNumber(summary.pcr, 3)}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">
          {summary.pcr && summary.pcr > 1 ? "Bullish Sentiment" : "Bearish Sentiment"}
        </p>
      </Card>

      <Card className="border-slate-800 bg-slate-900/30 p-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Max Call OI Strike</p>
        <p className="text-xl font-extrabold text-rose-400 mt-1">{formatNumber(summary.maxCallOiStrike, 0)}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Strong Resistance</p>
      </Card>

      <Card className="border-slate-800 bg-slate-900/30 p-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Max Put OI Strike</p>
        <p className="text-xl font-extrabold text-emerald-400 mt-1">{formatNumber(summary.maxPutOiStrike, 0)}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Strong Support</p>
      </Card>
    </div>
  );
};
