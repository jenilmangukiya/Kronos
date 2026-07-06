import { ColumnDef } from "@tanstack/react-table";
import { PaperOrder } from "../../../../services/paper-trading/PaperTradingService";
import { formatCurrency, formatDate } from "../../../../utils/format";
import { Badge } from "../../../../components/ui/Badge";

const getSideBadge = (side: "BUY" | "SELL") => {
  if (side === "BUY") {
    return (
      <Badge variant="success" className="!bg-emerald-500/10 !text-emerald-400 border-emerald-500/20">
        BUY
      </Badge>
    );
  }
  return (
    <Badge variant="danger" className="!bg-rose-500/10 !text-rose-400 border-rose-500/20">
      SELL
    </Badge>
  );
};

const getStatusBadge = (status: "FILLED" | "CANCELLED") => {
  if (status === "FILLED") {
    return (
      <Badge variant="info" className="!bg-blue-500/10 !text-blue-400 border-blue-500/20">
        FILLED
      </Badge>
    );
  }
  return <Badge variant="neutral">CANCELLED</Badge>;
};

export const paperOrdersColumns: ColumnDef<PaperOrder>[] = [
  {
    accessorKey: "createdAt",
    header: "Time",
    meta: { align: "left" },
    cell: ({ row }) => <span className="text-slate-400">{formatDate(row.original.createdAt)}</span>,
  },
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
    meta: { align: "center" },
    cell: ({ row }) => getSideBadge(row.original.side),
  },
  {
    accessorKey: "quantity",
    header: "Qty",
    meta: { align: "right" },
    cell: ({ row }) => <span className="font-mono text-slate-300">{row.original.quantity}</span>,
  },
  {
    accessorKey: "price",
    header: "Price",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-mono text-slate-100 font-bold">{formatCurrency(row.original.price)}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { align: "center" },
    cell: ({ row }) => getStatusBadge(row.original.status),
  },
];
