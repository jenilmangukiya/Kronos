import React from "react";
import { Input } from "../../../../components/ui/Input";
import { Select } from "../../../../components/ui/Select";
import { StrategyFormValues } from "../types";
import { SYMBOL_OPTIONS, INSTRUMENT_TYPE_OPTIONS } from "../constants";

interface StrategyBasicFormProps {
  form: StrategyFormValues;
  onChange: (field: keyof StrategyFormValues, value: any) => void;
}

export const StrategyBasicForm: React.FC<StrategyBasicFormProps> = ({ form, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-2">
        1. General Settings
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Strategy Name"
          placeholder="e.g. NIFTY Scalper Close Above"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
        />
        
        <Select
          label="Base Index Symbol"
          value={form.symbol}
          options={SYMBOL_OPTIONS}
          onChange={(e) => onChange("symbol", e.target.value)}
        />

        <Select
          label="Strategy Type"
          value={form.strategyType || "PRICE_BREAKOUT"}
          options={[
            { value: "PRICE_BREAKOUT", label: "Price Breakout" },
            { value: "HIGH_LOW_BREAKOUT_REVERSAL", label: "High-Low Breakout Reversal" },
          ]}
          onChange={(e) => {
            const val = e.target.value;
            onChange("strategyType", val);
            if (val === "HIGH_LOW_BREAKOUT_REVERSAL") {
              onChange("instrumentType", "OPTION");
            }
          }}
        />

        {form.strategyType !== "HIGH_LOW_BREAKOUT_REVERSAL" ? (
          <Select
            label="Instrument Type"
            value={form.instrumentType}
            options={INSTRUMENT_TYPE_OPTIONS}
            onChange={(e) => onChange("instrumentType", e.target.value)}
          />
        ) : (
          <div className="w-full">
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Instrument Type
            </label>
            <div className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-400 select-none font-semibold">
              OPTION (Required for High-Low Breakout Reversal)
            </div>
          </div>
        )}

        <div className="w-full">
          <label className="block text-sm font-medium text-slate-400 mb-1.5">
            Trading Mode
          </label>
          <div className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-400 select-none">
            PAPER (Live trading is currently locked)
          </div>
        </div>
      </div>
    </div>
  );
};
