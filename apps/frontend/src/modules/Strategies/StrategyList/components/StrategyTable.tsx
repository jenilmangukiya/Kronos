import React from "react";
import { Link } from "react-router-dom";
import { Play, Square, Eye } from "lucide-react";
import { Strategy } from "../../../../services/strategies/StrategyService";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeadCell } from "../../../../components/ui/Table";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";

interface StrategyTableProps {
  strategies: Strategy[];
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  isActionLoading: boolean;
}

export const StrategyTable: React.FC<StrategyTableProps> = ({
  strategies,
  onStart,
  onStop,
  isActionLoading,
}) => {
  const formatTriggerRule = (strategy: Strategy) => {
    const { type, triggerPrice } = strategy.rules;
    const isAbove = type === "UNDERLYING_CROSS_ABOVE";
    return (
      <div className="flex flex-col text-xs text-slate-300">
        <span className="font-semibold text-slate-200">
          Spot {isAbove ? "Crosses Above" : "Crosses Below"}
        </span>
        <span className="text-slate-400">
          Price: ₹{triggerPrice.toLocaleString("en-IN")}
        </span>
      </div>
    );
  };

  const formatTradeDetails = (strategy: Strategy) => {
    const { side, quantity, symbol } = strategy.trade;
    const isBuy = side === "BUY";
    return (
      <div className="flex flex-col text-xs">
        <div className="flex items-center gap-1.5">
          <Badge variant={isBuy ? "success" : "danger"} className="!px-1.5 !py-0 text-[10px]">
            {side}
          </Badge>
          <span className="font-semibold text-slate-200">{quantity} units</span>
        </div>
        <span className="text-slate-400 mt-0.5 truncate max-w-[150px]" title={symbol}>
          {symbol}
        </span>
      </div>
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHeadCell>Name</TableHeadCell>
          <TableHeadCell>Symbol</TableHeadCell>
          <TableHeadCell>Instrument</TableHeadCell>
          <TableHeadCell>Mode</TableHeadCell>
          <TableHeadCell>Status</TableHeadCell>
          <TableHeadCell>Trigger Rule</TableHeadCell>
          <TableHeadCell>Trade Details</TableHeadCell>
          <TableHeadCell>Created At</TableHeadCell>
          <TableHeadCell className="text-right">Actions</TableHeadCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {strategies.map((strategy) => {
          const isRunning = strategy.status === "RUNNING";
          const createdDate = new Date(strategy.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <TableRow key={strategy.id}>
              <TableCell className="font-semibold text-slate-100">{strategy.name}</TableCell>
              <TableCell className="text-slate-300">{strategy.symbol}</TableCell>
              <TableCell className="text-slate-300">
                <Badge variant="neutral" className="!bg-slate-800/80 !text-slate-300 border-slate-700/60">
                  {strategy.instrumentType}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="info" className="!bg-blue-500/15 !text-blue-400 border-blue-500/20">
                  {strategy.mode}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={isRunning ? "success" : "neutral"}>
                  {strategy.status}
                </Badge>
              </TableCell>
              <TableCell>{formatTriggerRule(strategy)}</TableCell>
              <TableCell>{formatTradeDetails(strategy)}</TableCell>
              <TableCell className="text-slate-400 text-xs">{createdDate}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link to={`/dashboard/strategies/${strategy.id}`}>
                    <Button variant="outline" size="sm" className="h-8 !px-2.5">
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                  </Link>

                  {isRunning ? (
                    <Button
                      variant="danger"
                      size="sm"
                      className="h-8 !px-2.5"
                      disabled={isActionLoading}
                      onClick={() => onStop(strategy.id)}
                    >
                      <Square className="h-3.5 w-3.5 mr-1" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      className="h-8 !px-2.5 !from-emerald-600 !to-teal-600 hover:!from-emerald-500 hover:!to-teal-500 shadow-emerald-500/10"
                      disabled={isActionLoading}
                      onClick={() => onStart(strategy.id)}
                    >
                      <Play className="h-3.5 w-3.5 mr-1" />
                      Start
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
