import React from "react";
import { Link } from "react-router-dom";
import { usePaperTradingDashboard } from "./usePaperTradingDashboard";
import { PaperTradingSummary } from "./components/PaperTradingSummary";
import { PaperPositionsTable } from "./components/PaperPositionsTable";
import { PaperOrdersTable } from "./components/PaperOrdersTable";
import { ExitPositionDialog } from "./components/ExitPositionDialog";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";
import { RefreshCw, PlayCircle, ShieldAlert, Award } from "lucide-react";

export const PaperTradingDashboard: React.FC = () => {
  const {
    activeAccount,
    orders,
    positions,
    summary,
    isLoading,
    isRefreshing,
    refresh,
    selectedExitPosition,
    isExitDialogOpen,
    handleOpenExitDialog,
    handleCloseExitDialog,
  } = usePaperTradingDashboard();

  if (isLoading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Award className="h-8 w-8 text-blue-500" />
            Paper Trading
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Simulate trades, practice strategies, and view virtual profits in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 cursor-pointer border-slate-800 hover:bg-slate-800 text-slate-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* No active session notice */}
      {!activeAccount && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-4 rounded-xl flex items-start gap-3 max-w-4xl">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">No Active Broker Session</p>
            <p className="mt-0.5">
              Live market feed is offline. Paper trading executes at the last recorded prices, and unrealized positions P&L will not update live until you establish an active broker session.
            </p>
            <div className="mt-2.5">
              <Link to="/dashboard/broker">
                <Button size="sm" variant="secondary" className="!bg-slate-800 !text-slate-200 border-slate-700 py-1 px-3">
                  Go to Broker Setup
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <PaperTradingSummary summary={summary} />

      {/* Positions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-emerald-500" />
            Positions
          </h2>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-xl">
          <PaperPositionsTable 
            positions={positions} 
            onExitClick={handleOpenExitDialog} 
          />
        </div>
      </div>

      {/* Orders Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-100">Order History</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-xl">
          <PaperOrdersTable orders={orders} />
        </div>
      </div>

      {/* Exit confirmation overlay dialog */}
      <ExitPositionDialog
        isOpen={isExitDialogOpen}
        position={selectedExitPosition}
        onClose={handleCloseExitDialog}
        onSuccess={refresh}
      />
    </div>
  );
};
export default PaperTradingDashboard;
