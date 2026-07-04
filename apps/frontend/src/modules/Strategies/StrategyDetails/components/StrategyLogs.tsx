import React, { useState } from "react";
import { StrategyLog } from "../../../../services/strategies/StrategyService";
import { Card } from "../../../../components/ui/Card";
import { Terminal, ChevronDown, ChevronRight, Activity } from "lucide-react";

interface StrategyLogsProps {
  logs: StrategyLog[];
  isPolling: boolean;
}

export const StrategyLogs: React.FC<StrategyLogsProps> = ({ logs, isPolling }) => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <Card className="border-slate-800 bg-slate-950 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Terminal className="h-5 w-5 text-indigo-400" />
          Execution Activity Logs
        </h3>
        {isPolling && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            <Activity className="h-3 w-3 animate-pulse" />
            Live Polling Active
          </div>
        )}
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto font-mono text-xs pr-2 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No execution activities logged yet.
          </div>
        ) : (
          [...logs]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((log) => {
              const isExpanded = expandedLogId === log.id;
              const hasMeta = Boolean(log.meta && typeof log.meta === "object" && Object.keys(log.meta as object).length > 0);
              const timestamp = new Date(log.createdAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              });

              return (
                <div
                  key={log.id}
                  className="border-b border-slate-900/60 pb-2 last:border-b-0 space-y-1.5"
                >
                  <div
                    onClick={() => hasMeta && toggleExpand(log.id)}
                    className={`flex items-start gap-2.5 py-1 px-2 rounded transition-colors duration-150 ${
                      hasMeta ? "cursor-pointer hover:bg-slate-900/80" : ""
                    }`}
                  >
                    <span className="text-indigo-400/90 font-semibold select-none">[{timestamp}]</span>
                    <span className="text-slate-300 flex-1 break-all">{log.message}</span>
                    {hasMeta && (
                      <span className="text-slate-500 hover:text-slate-300">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 mt-0.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 mt-0.5" />
                        )}
                      </span>
                    )}
                  </div>

                  {hasMeta && isExpanded && (
                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 ml-6 text-[10px] overflow-x-auto text-slate-400">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(log.meta, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>
    </Card>
  );
};
