import React, { useState } from "react";
import { Strategy } from "../../../../services/strategies/StrategyService";
import { Card } from "../../../../components/ui/Card";
import { Code, Copy, Check } from "lucide-react";

interface StrategyJsonPreviewProps {
  strategy: Strategy;
}

export const StrategyJsonPreview: React.FC<StrategyJsonPreviewProps> = ({ strategy }) => {
  const [copied, setCopied] = useState(false);

  const configJson = JSON.stringify(
    {
      rules: strategy.rules,
      trade: strategy.trade,
      risk: strategy.risk,
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(configJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-slate-800 bg-slate-900/40 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Code className="h-5 w-5 text-indigo-400" />
          JSON Configuration Preview
        </h3>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors duration-200 border border-slate-700 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy Configuration
            </>
          )}
        </button>
      </div>

      <div className="relative bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-[300px] overflow-y-auto">
        <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
          {configJson}
        </pre>
      </div>
    </Card>
  );
};
