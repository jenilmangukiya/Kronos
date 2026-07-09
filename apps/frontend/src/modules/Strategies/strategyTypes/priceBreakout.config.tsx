import React from "react";
import { Sliders } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { StrategyRuleForm } from "../StrategyCreate/components/StrategyRuleForm";
import { formatRuleType } from "../StrategyDetails/helpers";
import { UNDERLYING_TOKENS } from "../StrategyCreate/constants";

export const PriceBreakoutConfig = {
  strategyType: "PRICE_BREAKOUT",
  label: "Price Breakout",
  description: "Triggers trade when spot price crosses a threshold.",
  defaultValues: {
    ruleType: "UNDERLYING_CROSS_ABOVE",
    triggerPrice: 0,
  },
  FormComponent: StrategyRuleForm,
  PreviewComponent: ({ strategy }: { strategy: any }) => {
    const rules = strategy?.rules || {};
    return (
      <Card className="border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Sliders className="h-4.5 w-4.5 text-blue-400" />
          Rule Engine Details
        </h4>
        <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-800/60 pt-3">
          <div>
            <span className="text-slate-400 block font-medium">Trigger Condition</span>
            <span className="text-slate-200 font-semibold mt-0.5 block">
              Spot {rules.type === "UNDERLYING_CROSS_ABOVE" ? "Crosses Above" : "Crosses Below"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Trigger Price</span>
            <span className="text-slate-100 font-bold mt-0.5 block">
              ₹{rules.triggerPrice?.toLocaleString("en-IN") || 0}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Underlying Token</span>
            <span className="text-slate-300 mt-0.5 block">{rules.underlyingToken}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Exchange ID</span>
            <span className="text-slate-300 mt-0.5 block">{rules.underlyingExchangeType}</span>
          </div>
        </div>
      </Card>
    );
  },
  RuntimeSignalComponent: ({ runtimeStatus }: { runtimeStatus: any }) => {
    const signal = runtimeStatus?.strategySignal;
    if (!signal) return null;
    return (
      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center py-1 border-b border-slate-900/40">
          <span className="text-slate-400 font-semibold">Underlying LTP</span>
          <span className="text-slate-200 font-mono">
            ₹{signal.underlyingPrice?.toLocaleString("en-IN") || "-"}
          </span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-slate-900/40">
          <span className="text-slate-400">Trigger Price</span>
          <span className="text-slate-200 font-mono">
            ₹{signal.triggerPrice?.toLocaleString("en-IN") || "-"}
          </span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-slate-900/40">
          <span className="text-slate-400">Condition Matched</span>
          <span className={`font-semibold ${signal.conditionMatched ? "text-emerald-400" : "text-amber-400"}`}>
            {signal.conditionMatched ? "Matched" : "Waiting"}
          </span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-slate-400">Rule Type</span>
          <span className="text-slate-200">
            {formatRuleType(signal.ruleType)}
          </span>
        </div>
      </div>
    );
  },
  getSummaryText: (strategy: any) => {
    const rules = strategy?.rules || {};
    return `Spot ${rules.type === "UNDERLYING_CROSS_ABOVE" ? "crosses above" : "crosses below"} ${rules.triggerPrice ? rules.triggerPrice.toLocaleString("en-IN") : "0"}`;
  },
  buildRulesPayload: (form: any) => {
    const underlying = UNDERLYING_TOKENS[form.symbol as keyof typeof UNDERLYING_TOKENS];
    return {
      type: form.ruleType,
      underlyingToken: underlying?.token || "",
      underlyingExchangeType: underlying?.exchangeType || 2,
      triggerPrice: Number(form.triggerPrice),
    };
  },
  isFormValid: (form: any) => {
    return !!(form.triggerPrice && Number(form.triggerPrice) > 0);
  }
};
