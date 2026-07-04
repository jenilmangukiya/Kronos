import React from "react";
import { DashboardSummary } from "../types";
import { Card } from "../../../../components/ui/Card";
import { formatCurrency } from "../../../../utils/format";
import { Activity, CircleDot, TrendingUp, DollarSign, BarChart2 } from "lucide-react";

interface PaperTradingSummaryProps {
  summary: DashboardSummary;
}

export const PaperTradingSummary: React.FC<PaperTradingSummaryProps> = ({ summary }) => {
  const getPnlClass = (val: number) => {
    if (val > 0) return "text-emerald-400 font-extrabold";
    if (val < 0) return "text-rose-400 font-extrabold";
    return "text-slate-300 font-extrabold";
  };

  const getPnlBorderClass = (val: number) => {
    if (val > 0) return "border-emerald-500/20 bg-emerald-500/5";
    if (val < 0) return "border-rose-500/20 bg-rose-500/5";
    return "border-slate-800 bg-slate-900/30";
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {/* Open Positions Card */}
      <Card className="border-slate-800 bg-slate-900/30 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Open Positions</p>
            <CircleDot className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-blue-400 mt-2">{summary.openPositionsCount}</p>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">Active paper trades</p>
      </Card>

      {/* Closed Positions Card */}
      <Card className="border-slate-800 bg-slate-900/30 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Closed Positions</p>
            <Activity className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-300 mt-2">{summary.closedPositionsCount}</p>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">Completed paper trades</p>
      </Card>

      {/* Realized P&L Card */}
      <Card className={`p-4 border flex flex-col justify-between transition-colors duration-300 ${getPnlBorderClass(summary.totalRealizedPnl)}`}>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Realized P&L</p>
            <DollarSign className={`h-3.5 w-3.5 ${summary.totalRealizedPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`} />
          </div>
          <p className={`text-2xl mt-2 ${getPnlClass(summary.totalRealizedPnl)}`}>
            {formatCurrency(summary.totalRealizedPnl)}
          </p>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">Booked profits/losses</p>
      </Card>

      {/* Unrealized P&L Card */}
      <Card className={`p-4 border flex flex-col justify-between transition-colors duration-300 ${getPnlBorderClass(summary.totalUnrealizedPnl)}`}>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Unrealized P&L</p>
            <BarChart2 className={`h-3.5 w-3.5 ${summary.totalUnrealizedPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`} />
          </div>
          <p className={`text-2xl mt-2 ${getPnlClass(summary.totalUnrealizedPnl)}`}>
            {formatCurrency(summary.totalUnrealizedPnl)}
          </p>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">Floating profit/loss</p>
      </Card>

      {/* Total P&L Card */}
      <Card className={`p-4 border flex flex-col justify-between transition-colors duration-300 ${getPnlBorderClass(summary.totalPnl)}`}>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total P&L</p>
            <TrendingUp className={`h-3.5 w-3.5 ${summary.totalPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`} />
          </div>
          <p className={`text-2xl mt-2 ${getPnlClass(summary.totalPnl)}`}>
            {formatCurrency(summary.totalPnl)}
          </p>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">Combined net P&L</p>
      </Card>
    </div>
  );
};
