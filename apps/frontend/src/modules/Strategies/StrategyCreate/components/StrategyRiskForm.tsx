import React from "react";
import { Input } from "../../../../components/ui/Input";
import { StrategyFormValues } from "../types";

interface StrategyRiskFormProps {
  form: StrategyFormValues;
  onChange: (field: keyof StrategyFormValues, value: any) => void;
}

export const StrategyRiskForm: React.FC<StrategyRiskFormProps> = ({ form, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-2">
        4. Risk Management (Optional)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Max Trades Per Day"
          type="number"
          placeholder="1"
          value={form.maxTradesPerDay || ""}
          onChange={(e) => onChange("maxTradesPerDay", parseInt(e.target.value) || 1)}
        />

        <Input
          label="Stop Loss (%)"
          type="number"
          placeholder="e.g. 5"
          value={form.stopLossPercent === undefined ? "" : form.stopLossPercent}
          onChange={(e) =>
            onChange(
              "stopLossPercent",
              e.target.value === "" ? undefined : parseFloat(e.target.value) || 0
            )
          }
        />

        <Input
          label="Target Profit (%)"
          type="number"
          placeholder="e.g. 10"
          value={form.targetPercent === undefined ? "" : form.targetPercent}
          onChange={(e) =>
            onChange(
              "targetPercent",
              e.target.value === "" ? undefined : parseFloat(e.target.value) || 0
            )
          }
        />
      </div>
    </div>
  );
};
