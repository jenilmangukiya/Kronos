import { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { Play, Square, Eye } from "lucide-react";
import { Strategy } from "../../../../services/strategies/StrategyService";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";

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
      <span className="text-slate-400 mt-0.5 truncate max-w-[200px]" title={symbol}>
        {symbol}
      </span>
    </div>
  );
};

export const getStrategyColumns = (
  onStart: (id: string) => void,
  onStop: (id: string) => void,
  isActionLoading: boolean
): ColumnDef<Strategy>[] => [
  {
    accessorKey: "name",
    header: "Name",
    meta: { align: "left" },
    cell: ({ row }) => <span className="font-semibold text-slate-100">{row.original.name}</span>,
  },
  {
    accessorKey: "symbol",
    header: "Symbol",
    meta: { align: "left" },
    cell: ({ row }) => <span className="text-slate-300">{row.original.symbol}</span>,
  },
  {
    accessorKey: "instrumentType",
    header: "Instrument",
    meta: { align: "left" },
    cell: ({ row }) => (
      <Badge variant="neutral" className="!bg-slate-800/80 !text-slate-300 border-slate-700/60">
        {row.original.instrumentType}
      </Badge>
    ),
  },
  {
    accessorKey: "mode",
    header: "Mode",
    meta: { align: "left" },
    cell: ({ row }) => (
      <Badge variant="info" className="!bg-blue-500/15 !text-blue-400 border-blue-500/20">
        {row.original.mode}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { align: "left" },
    cell: ({ row }) => {
      const isRunning = row.original.status === "RUNNING";
      return (
        <Badge variant={isRunning ? "success" : "neutral"}>
          {row.original.status}
        </Badge>
      );
    },
  },
  {
    id: "triggerRule",
    header: "Trigger Rule",
    meta: { align: "left", className: "min-w-[150px]" },
    cell: ({ row }) => formatTriggerRule(row.original),
  },
  {
    id: "tradeDetails",
    header: "Trade Details",
    meta: { align: "left", className: "min-w-[220px]" },
    cell: ({ row }) => formatTradeDetails(row.original),
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    meta: { align: "left" },
    cell: ({ row }) => {
      const createdDate = new Date(row.original.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return <span className="text-slate-400 text-xs">{createdDate}</span>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    meta: { align: "right" },
    enableSorting: false,
    cell: ({ row }) => {
      const strategy = row.original;
      const isRunning = strategy.status === "RUNNING";
      return (
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
      );
    },
  },
];
