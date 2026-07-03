import React from "react";
import { Select } from "../../../../components/ui/Select";
import { DEFAULT_SYMBOLS, STRIKE_RANGES } from "../constants";
import { Badge } from "../../../../components/ui/Badge";
import { RadioTower, Radio } from "lucide-react";

interface OptionChainControlsProps {
  symbol: string;
  onSymbolChange: (val: string) => void;
  expiry: string;
  onExpiryChange: (val: string) => void;
  expiries: string[];
  strikeRange: number;
  onStrikeRangeChange: (val: number) => void;
  isLive: boolean;
}

export const OptionChainControls: React.FC<OptionChainControlsProps> = ({
  symbol,
  onSymbolChange,
  expiry,
  onExpiryChange,
  expiries,
  strikeRange,
  onStrikeRangeChange,
  isLive,
}) => {
  const expiryOptions = expiries.map((exp) => ({ value: exp, label: exp }));

  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row gap-5 items-end justify-between backdrop-blur-md">
      <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          label="Underlying Symbol"
          options={DEFAULT_SYMBOLS}
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
        />

        <Select
          label="Expiry Date"
          options={expiryOptions.length > 0 ? expiryOptions : [{ value: "", label: "No expiries loaded" }]}
          value={expiry}
          onChange={(e) => onExpiryChange(e.target.value)}
          disabled={expiryOptions.length === 0}
        />

        <Select
          label="Strike Range"
          options={STRIKE_RANGES}
          value={String(strikeRange)}
          onChange={(e) => onStrikeRangeChange(Number(e.target.value))}
        />
      </div>

      <div className="flex items-center gap-2 mb-1 justify-end w-full md:w-auto">
        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tick Stream</span>
        {isLive ? (
          <Badge variant="success">
            <RadioTower className="h-3.5 w-3.5 mr-1.5 animate-pulse text-emerald-400" />
            Live
          </Badge>
        ) : (
          <Badge variant="neutral">
            <Radio className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            REST Static
          </Badge>
        )}
      </div>
    </div>
  );
};
