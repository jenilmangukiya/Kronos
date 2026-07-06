import { ColumnDef } from "@tanstack/react-table";
import { PaperPosition } from "../../../../services/paper-trading/PaperTradingService";
import { formatCurrency } from "../../../../utils/format";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";

const getPnlClass = (val: number) => {
  if (val > 0) return "text-emerald-400 font-bold";
  if (val < 0) return "text-rose-400 font-bold";
  return "text-slate-400";
};

const getStatusBadge = (status: "OPEN" | "CLOSED") => {
  if (status === "OPEN") {
    return <Badge variant="success">OPEN</Badge>;
  }
  return <Badge variant="neutral">CLOSED</Badge>;
};

export const getPaperPositionsColumns = (
  onExitClick: (position: PaperPosition) => void
): ColumnDef<PaperPosition>[] => [
  {
    accessorKey: "symbol",
    header: "Symbol",
    meta: { align: "left" },
    cell: ({ row }) => <span className="font-mono font-bold text-slate-200">{row.original.symbol}</span>,
  },
  {
    accessorKey: "instrumentType",
    header: "Type",
    meta: { align: "left" },
    cell: ({ row }) => (
      <Badge variant="neutral" className="!bg-slate-800 !text-slate-300 border-slate-700">
        {row.original.instrumentType}
      </Badge>
    ),
  },
  {
    accessorKey: "side",
    header: "Side",
    meta: { align: "left" },
    cell: ({ row }) => (
      row.original.side === "LONG" ? (
        <Badge variant="info" className="!bg-blue-500/10 !text-blue-400 border-blue-500/20">
          LONG
        </Badge>
      ) : (
        <Badge variant="warning" className="!bg-amber-500/10 !text-amber-400 border-amber-500/20">
          SHORT
        </Badge>
      )
    ),
  },
  {
    accessorKey: "quantity",
    header: "Qty",
    meta: { align: "right" },
    cell: ({ row }) => <span className="font-mono text-slate-300">{row.original.quantity}</span>,
  },
  {
    accessorKey: "avgPrice",
    header: "Avg Price",
    meta: { align: "right" },
    cell: ({ row }) => <span className="font-mono text-slate-300">{formatCurrency(row.original.avgPrice)}</span>,
  },
  {
    accessorKey: "ltp",
    header: "LTP",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-mono text-slate-100 font-bold">
        {row.original.ltp !== null ? formatCurrency(row.original.ltp) : "-"}
      </span>
    ),
  },
  {
    accessorKey: "realizedPnl",
    header: "Realized P&L",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className={`font-mono ${getPnlClass(row.original.realizedPnl)}`}>
        {formatCurrency(row.original.realizedPnl)}
      </span>
    ),
  },
  {
    accessorKey: "unrealizedPnl",
    header: "Unrealized P&L",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className={`font-mono ${getPnlClass(row.original.unrealizedPnl)}`}>
        {formatCurrency(row.original.unrealizedPnl)}
      </span>
    ),
  },
  {
    accessorKey: "totalPnl",
    header: "Total P&L",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className={`font-mono ${getPnlClass(row.original.totalPnl)}`}>
        {formatCurrency(row.original.totalPnl)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { align: "center" },
    cell: ({ row }) => getStatusBadge(row.original.status),
  },
  {
    id: "action",
    header: "Action",
    meta: { align: "center" },
    enableSorting: false,
    cell: ({ row }) => (
      row.original.status === "OPEN" ? (
        <Button
          variant="danger"
          size="sm"
          onClick={() => onExitClick(row.original)}
          className="!bg-rose-600/10 hover:!bg-rose-600/20 !text-rose-400 border border-rose-500/20 hover:border-rose-500/40 py-1 px-3 text-xs"
        >
          Exit
        </Button>
      ) : (
        <span className="text-slate-600 text-xs">-</span>
      )
    ),
  },
];
