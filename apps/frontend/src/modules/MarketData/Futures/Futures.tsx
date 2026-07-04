import React from "react";
import { Link } from "react-router-dom";
import { useFutures } from "./useFutures";
import { FuturesControls } from "./components/FuturesControls";
import { FuturesSummary } from "./components/FuturesSummary";
import { FuturesTable } from "./components/FuturesTable";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";
import { AlertCircle, ShieldAlert } from "lucide-react";

export const Futures: React.FC = () => {
  const {
    activeAccount,
    symbol,
    setSymbol,
    futures,
    derivedRows,
    summary,
    isLoading,
    futuresError,
    isLive,
    refresh,
  } = useFutures();

  if (!isLoading && !activeAccount) {
    return (
      <div className="max-w-2xl mx-auto mt-12 space-y-6">
        <Card className="border-slate-800 bg-slate-900/40 p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100">No Active Broker Session</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            No active broker session found. Please connect Angel and create a session first.
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/dashboard/broker">
              <Button variant="primary">
                Go to Broker Setup
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Futures</h1>
        <p className="text-slate-400 text-sm mt-1">
          Analyze real-time futures contracts with live LTP updates.
        </p>
      </div>

      <FuturesControls
        symbol={symbol}
        onSymbolChange={setSymbol}
        isLoading={isLoading}
        onRefresh={refresh}
        isLive={isLive}
      />

      {futuresError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error loading futures data</p>
            <p className="mt-0.5 text-xs">{futuresError}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : futures && derivedRows.length > 0 ? (
        <div className="space-y-6">
          <FuturesSummary summary={summary} />

          <div className="rounded-xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-xl">
            <FuturesTable rows={derivedRows} />
          </div>
        </div>
      ) : (
        !futuresError && (
          <div className="text-center py-20 text-slate-500 text-sm bg-slate-900/20 border border-slate-800/80 rounded-xl">
            No futures contracts found.
          </div>
        )
      )}
    </div>
  );
};
