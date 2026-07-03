import React from "react";
import { Link } from "react-router-dom";
import { useOptionChain } from "./useOptionChain";
import { OptionChainControls } from "./components/OptionChainControls";
import { OptionChainSummary } from "./components/OptionChainSummary";
import { OptionChainTable } from "./components/OptionChainTable";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";
import { AlertCircle, ShieldAlert } from "lucide-react";

export const OptionChain: React.FC = () => {
  const {
    activeAccount,
    symbol,
    setSymbol,
    expiry,
    setExpiry,
    expiries,
    strikeRange,
    setStrikeRange,
    optionChain,
    derivedRows,
    isLoading,
    optionChainError,
    isLive,
  } = useOptionChain();

  if (!isLoading && !activeAccount) {
    return (
      <div className="max-w-2xl mx-auto mt-12 space-y-6">
        <Card className="border-slate-800 bg-slate-900/40 p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100">No Active Broker Session</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            You must connect a broker account and establish an active interactive session
            to view option chains and stream live tick data.
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
        <h1 className="text-3xl font-bold tracking-tight text-white">Option Chain</h1>
        <p className="text-slate-400 text-sm mt-1">
          Analyze real-time derivatives with live LTP updates and Greeks.
        </p>
      </div>

      <OptionChainControls
        symbol={symbol}
        onSymbolChange={setSymbol}
        expiry={expiry}
        onExpiryChange={setExpiry}
        expiries={expiries}
        strikeRange={strikeRange}
        onStrikeRangeChange={setStrikeRange}
        isLive={isLive}
      />

      {optionChainError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error loading option chain</p>
            <p className="mt-0.5 text-xs">{optionChainError}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : optionChain ? (
        <div className="space-y-6">
          <OptionChainSummary
            summary={optionChain.summary}
            underlying={optionChain.underlying}
          />

          <div className="rounded-xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-xl">
            <OptionChainTable
              rows={derivedRows}
              underlyingLtp={optionChain.underlying.ltp}
              atmStrike={optionChain.underlying.atmStrike}
            />
          </div>
        </div>
      ) : (
        !optionChainError && (
          <div className="text-center py-20 text-slate-500 text-sm">
            Select symbol and expiry to load the option chain.
          </div>
        )
      )}
    </div>
  );
};
