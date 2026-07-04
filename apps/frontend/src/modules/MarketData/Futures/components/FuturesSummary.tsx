import React from "react";
import { FuturesSummaryData } from "../types";
import { Card } from "../../../../components/ui/Card";
import { formatNumber } from "../../../../utils/format";

interface FuturesSummaryProps {
  summary: FuturesSummaryData | null;
}

export const FuturesSummary: React.FC<FuturesSummaryProps> = ({ summary }) => {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card className="border-slate-800 bg-slate-900/30 p-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Symbol</p>
        <p className="text-xl font-extrabold text-blue-400 mt-1">{summary.symbol}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Underlying Asset</p>
      </Card>

      <Card className="border-slate-800 bg-slate-900/30 p-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Near Month LTP</p>
        <p className="text-xl font-extrabold text-slate-200 mt-1">{formatNumber(summary.nearMonthLtp)}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Active Contract</p>
      </Card>

      <Card className="border-slate-800 bg-slate-900/30 p-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Near Month Expiry</p>
        <p className="text-xl font-extrabold text-indigo-400 mt-1">{summary.nearMonthExpiry || "-"}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Expiry Date</p>
      </Card>

      <Card className="border-slate-800 bg-slate-900/30 p-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total OI (Lakhs)</p>
        <p className="text-xl font-extrabold text-rose-400 mt-1">{formatNumber(summary.totalOi / 100000, 2)}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Open Interest</p>
      </Card>

      <Card className="border-slate-800 bg-slate-900/30 p-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Volume</p>
        <p className="text-xl font-extrabold text-emerald-400 mt-1">{formatNumber(summary.totalVolume, 0)}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Traded Contracts</p>
      </Card>
    </div>
  );
};
