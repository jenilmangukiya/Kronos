import React, { useState, useEffect } from "react";
import { Select } from "../../../../components/ui/Select";
import { Input } from "../../../../components/ui/Input";
import { StrategyFormValues } from "../types";
import { Spinner } from "../../../../components/ui/Spinner";
import { FutureContract } from "../../../../services/market-data/MarketDataService";

interface StrategyTradeFormProps {
  form: StrategyFormValues;
  onChange: (field: keyof StrategyFormValues, value: any) => void;
  futures: FutureContract[];
  isFuturesLoading: boolean;
  expiries: string[];
  isExpiriesLoading: boolean;
  optionChain: any;
  isOptionChainLoading: boolean;
}

export const StrategyTradeForm: React.FC<StrategyTradeFormProps> = ({
  form,
  onChange,
  futures,
  isFuturesLoading,
  expiries,
  isExpiriesLoading,
  optionChain,
  isOptionChainLoading,
}) => {
  const isFuture = form.instrumentType === "FUTURE";
  const selectedStrike = form.tradeStrike || "";
  const selectedOptionType = form.tradeOptionType || "CE";

  const lotSize = form.symbol === "BANKNIFTY" ? 15 : form.symbol === "NIFTY" ? 65 : 1;

  // Default selected strike to ATM when option chain loads
  useEffect(() => {
    if (!isFuture && optionChain?.rows && optionChain.rows.length > 0) {
      const atm = optionChain.underlying?.atmStrike;
      const defaultStrike = atm
        ? atm.toString()
        : optionChain.rows[Math.floor(optionChain.rows.length / 2)].strike.toString();
      
      const hasCurrentStrike = optionChain.rows.some((r: any) => r.strike.toString() === form.tradeStrike);
      if (!form.tradeStrike || !hasCurrentStrike) {
        onChange("tradeStrike", defaultStrike);
      }
    }
  }, [optionChain, isFuture, form.tradeStrike]);

  // Update token and symbol on Strike or Type change
  useEffect(() => {
    if (!isFuture && optionChain?.rows && form.tradeStrike) {
      const optionType = form.tradeOptionType || "CE";
      const row = optionChain.rows.find((r: any) => r.strike.toString() === form.tradeStrike);
      const leg = row ? (optionType === "CE" ? row.ce : row.pe) : null;
      if (leg) {
        onChange("tradeToken", leg.token);
        onChange("tradeSymbol", leg.symbol);
      } else {
        onChange("tradeToken", "");
        onChange("tradeSymbol", "");
      }
    }
  }, [form.tradeStrike, form.tradeOptionType, optionChain, isFuture]);

  const handleFutureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const token = e.target.value;
    const contract = futures.find((f) => f.token === token);
    if (contract) {
      onChange("tradeToken", contract.token);
      onChange("tradeSymbol", contract.symbol);
      onChange("tradeQuantity", contract.lotSize);
    } else {
      onChange("tradeToken", "");
      onChange("tradeSymbol", "");
      onChange("tradeQuantity", 0);
    }
  };

  const expiryOptions = expiries.map((exp) => ({ value: exp, label: exp }));
  
  const strikeOptions = optionChain?.rows
    ? optionChain.rows.map((row: any) => ({
        value: row.strike.toString(),
        label: `₹${row.strike.toLocaleString("en-IN")}`,
      }))
    : [];

  const optTypeOptions = [
    { value: "CE", label: "CALL (CE)" },
    { value: "PE", label: "PUT (PE)" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-2">
        3. Execution Trade Action
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Buy/Sell side */}
        <Select
          label="Order Side"
          value={form.tradeSide}
          options={[
            { value: "BUY", label: "BUY / LONG" },
            { value: "SELL", label: "SELL / SHORT" },
          ]}
          onChange={(e) => onChange("tradeSide", e.target.value)}
        />

        {/* Quantity / Lots */}
        {isFuture ? (
          <Input
            label="Order Quantity (Lots / Units)"
            type="number"
            placeholder="e.g. 65"
            value={form.tradeQuantity || ""}
            onChange={(e) => onChange("tradeQuantity", parseInt(e.target.value) || 0)}
          />
        ) : (
          <div className="w-full">
            <Input
              label="Order Quantity (Lots)"
              type="number"
              placeholder="e.g. 1"
              value={form.tradeLots || ""}
              onChange={(e) => onChange("tradeLots", parseInt(e.target.value) || 0)}
            />
            <div className="text-xs text-slate-400 mt-1.5 font-medium">
              1 lot = {lotSize} qty (Total: {(form.tradeLots || 0) * lotSize} qty)
            </div>
          </div>
        )}

        {isFuture ? (
          /* FUTURE Layout */
          <div className="sm:col-span-2">
            {isFuturesLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center text-slate-400 text-xs">
                <Spinner size="sm" /> Fetching active futures contracts...
              </div>
            ) : futures.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-4 bg-slate-900/20 border border-slate-800 rounded-lg">
                No future contracts loaded. Please verify index selector.
              </div>
            ) : (
              <Select
                label="Futures Contract"
                value={form.tradeToken}
                options={[
                  { value: "", label: "Select Futures Contract" },
                  ...futures.map((contract) => ({
                    value: contract.token,
                    label: `${contract.symbol} (Expiry: ${contract.expiry}) - Lot: ${contract.lotSize}`,
                  })),
                ]}
                onChange={handleFutureChange}
              />
            )}
          </div>
        ) : (
          /* OPTION Layout */
          <>
            {isExpiriesLoading ? (
              <div className="sm:col-span-2 flex items-center gap-2 py-4 justify-center text-slate-400 text-xs">
                <Spinner size="sm" /> Loading option chain expiries...
              </div>
            ) : (
              <Select
                label="Option Expiry Date"
                value={form.tradeExpiry || ""}
                options={expiryOptions}
                onChange={(e) => onChange("tradeExpiry", e.target.value)}
              />
            )}

            {form.tradeExpiry && (
              <>
                {isOptionChainLoading ? (
                  <div className="sm:col-span-2 flex items-center gap-2 py-4 justify-center text-slate-400 text-xs">
                    <Spinner size="sm" /> Fetching option strikes...
                  </div>
                ) : (
                  <>
                    <Select
                      label="Strike Price"
                      value={selectedStrike}
                      options={strikeOptions}
                      onChange={(e) => onChange("tradeStrike", e.target.value)}
                    />
                    <Select
                      label="Option Type"
                      value={selectedOptionType}
                      options={optTypeOptions}
                      onChange={(e) => onChange("tradeOptionType", e.target.value as "CE" | "PE")}
                    />
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Selected asset details preview and Strategy summary preview */}
        {form.tradeToken && form.tradeSymbol && (
          <div className="sm:col-span-2 space-y-4">
            <div className="bg-slate-900/60 border border-indigo-500/10 rounded-xl p-4 text-xs space-y-1.5 text-slate-400">
              <span className="font-bold text-slate-300 block mb-1">Target Execution Asset:</span>
              <div>
                Symbol: <span className="font-mono text-indigo-400 font-bold">{form.tradeSymbol}</span>
              </div>
              <div>
                Token ID: <span className="font-mono">{form.tradeToken}</span>
              </div>
              {optionChain?.underlying?.ltp && !isFuture && (
                <div>
                  Underlying Index LTP: ₹{optionChain.underlying.ltp.toLocaleString("en-IN")}
                </div>
              )}
            </div>

            {form.triggerPrice > 0 && (
              <div className="bg-slate-900/60 border border-indigo-500/20 rounded-xl p-4 text-xs space-y-2 text-slate-300">
                <span className="font-bold text-indigo-400 block uppercase tracking-wider text-[10px]">Strategy Summary Preview</span>
                <div className="grid grid-cols-2 gap-4 border-b border-slate-800 pb-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 font-medium block">Watch</span>
                    <span className="font-semibold text-slate-200">{form.symbol} Spot</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Trade</span>
                    <span className="font-semibold text-slate-200">{isFuture ? "Future Contract" : "Option Contract"}</span>
                  </div>
                </div>
                <div className="pt-1 text-slate-300 leading-relaxed text-sm">
                  If <span className="font-bold text-slate-100">{form.symbol} Spot</span>{" "}
                  {form.ruleType === "UNDERLYING_CROSS_ABOVE" ? "crosses above" : "crosses below"}{" "}
                  <span className="font-bold text-slate-100">₹{(form.triggerPrice || 0).toLocaleString("en-IN")}</span>,
                  <br />
                  <span className={`font-bold ${form.tradeSide === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                    {form.tradeSide}
                  </span>{" "}
                  <span className="font-bold text-indigo-400 font-mono">{form.tradeSymbol}</span>
                  {!isFuture && (
                    <span className="text-slate-400 text-xs ml-1.5 font-normal">
                      ({form.tradeLots || 0} Lot{(form.tradeLots || 0) > 1 ? "s" : ""} = {(form.tradeLots || 0) * lotSize} qty)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
