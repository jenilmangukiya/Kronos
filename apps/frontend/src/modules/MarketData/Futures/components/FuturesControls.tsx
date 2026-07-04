import React from "react";
import { Select } from "../../../../components/ui/Select";
import { Button } from "../../../../components/ui/Button";
import { DEFAULT_SYMBOLS } from "../constants";
import { RefreshCw, RadioTower, Radio } from "lucide-react";
import { Badge } from "../../../../components/ui/Badge";

interface FuturesControlsProps {
  symbol: string;
  onSymbolChange: (val: string) => void;
  isLoading?: boolean;
  onRefresh: () => void;
  isLive?: boolean;
}

export const FuturesControls: React.FC<FuturesControlsProps> = ({
  symbol,
  onSymbolChange,
  isLoading = false,
  onRefresh,
  isLive = false,
}) => {
  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 flex flex-col sm:flex-row gap-5 items-end justify-between backdrop-blur-md">
      <div className="w-full sm:w-64">
        <Select
          label="Underlying Symbol"
          options={DEFAULT_SYMBOLS}
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
        <div className="flex items-center gap-2">
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

        <Button
          variant="secondary"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
};
