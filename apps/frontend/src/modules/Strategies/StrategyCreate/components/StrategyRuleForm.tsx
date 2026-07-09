import React from "react";
import { AlertCircle } from "lucide-react";
import { Select } from "../../../../components/ui/Select";
import { Input } from "../../../../components/ui/Input";
import { StrategyFormValues } from "../types";
import { RULE_TYPE_OPTIONS, UNDERLYING_TOKENS } from "../constants";

export interface StrategyRuleFormProps {
  form: StrategyFormValues;
  onChange: (field: keyof StrategyFormValues, value: any) => void;
  underlyingLtp?: number;
  triggerPriceWarning: string | null;
}

export const StrategyRuleForm: React.FC<StrategyRuleFormProps> = ({
  form,
  onChange,
  underlyingLtp,
  triggerPriceWarning,
}) => {
  const underlying = UNDERLYING_TOKENS[form.symbol];

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-2">
        2. Underlying Price Rules
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Rule Type"
          value={form.ruleType}
          options={RULE_TYPE_OPTIONS}
          onChange={(e) => onChange("ruleType", e.target.value)}
        />

        <div className="w-full">
          <Input
            label="Spot Trigger Price (₹)"
            type="number"
            placeholder="e.g. 24200"
            value={form.triggerPrice || ""}
            onChange={(e) => onChange("triggerPrice", parseFloat(e.target.value) || 0)}
          />
          {underlyingLtp !== undefined && (
            <div className="text-slate-400 text-[11px] mt-1.5 font-medium">
              Current {form.symbol} Spot LTP: ₹{underlyingLtp.toLocaleString("en-IN")}
            </div>
          )}
          {triggerPriceWarning && (
            <div className="text-amber-400 text-xs mt-2.5 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl leading-relaxed shadow-lg shadow-amber-500/5">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-500" />
              <span>{triggerPriceWarning}</span>
            </div>
          )}
        </div>

        <div className="sm:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-slate-400 select-none">
          <div>
            <span className="font-semibold text-slate-300">Underlying Index Feed Asset:</span>{" "}
            {form.symbol} Spot
          </div>
          <div>
            <span className="font-semibold text-slate-300">Feed Token ID:</span>{" "}
            <span className="font-mono">{underlying.token}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-300">Exchange ID:</span>{" "}
            {underlying.exchangeType} (NSE)
          </div>
        </div>
      </div>
    </div>
  );
};
