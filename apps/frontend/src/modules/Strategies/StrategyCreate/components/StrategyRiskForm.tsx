import React from "react";
import { Input } from "../../../../components/ui/Input";
import { Select } from "../../../../components/ui/Select";
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Max Trades Per Day"
          type="number"
          placeholder="1"
          value={form.maxTradesPerDay || ""}
          onChange={(e) => onChange("maxTradesPerDay", parseInt(e.target.value) || 1)}
        />

        <Select
          label="Re-entry Mode"
          value={form.reEntryMode || "NO_REENTRY"}
          onChange={(e) => onChange("reEntryMode", e.target.value)}
          options={[
            { value: "NO_REENTRY", label: "No Re-entry" },
            { value: "AFTER_EXIT", label: "After Exit" },
            { value: "AFTER_NEW_SIGNAL", label: "After New Signal (Coming later)", disabled: true },
          ]}
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

      <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 space-y-2.5 mt-2">
        <h4 className="text-xs font-bold text-slate-300">Re-entry Mode Details:</h4>
        <div className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
          <p>
            <span className="font-semibold text-slate-300">No Re-entry:</span> strategy enters only once after start.
          </p>
          <p>
            <span className="font-semibold text-slate-300">After Exit:</span> strategy can enter again after position closes, until daily trade limit.
          </p>
          <p>
            <span className="font-semibold text-slate-300">After New Signal:</span> coming later, requires signal reset before re-entry.
          </p>
        </div>
        <div className="pt-2.5 border-t border-slate-800/60 text-xs text-amber-400/90 font-medium">
          ⚠️ After New Signal is planned but not active yet. Use No Re-entry or After Exit for now.
        </div>
      </div>
    </div>
  );
};
