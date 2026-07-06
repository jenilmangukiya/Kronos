import { ColumnDef } from "@tanstack/react-table";
import { FutureContractUI } from "../types";
import { formatNumber } from "../../../../utils/format";
import { PaperTradeButtons } from "../../../PaperTrading/components/PaperTradeButtons";

export const getFuturesColumns = (brokerAccountId?: string): ColumnDef<FutureContractUI>[] => [
  {
    accessorKey: "expiry",
    header: "Expiry",
    meta: { align: "left" },
  },
  {
    accessorKey: "symbol",
    header: "Symbol",
    meta: { align: "left" },
    cell: ({ row }) => <span className="font-mono text-slate-400">{row.original.symbol}</span>,
  },
  {
    accessorKey: "ltp",
    header: "LTP",
    meta: { align: "right" },
    cell: ({ row }) => {
      const val = row.original.ltp;
      const direction = row.original.direction;
      const flashClass =
        direction === "up"
          ? "bg-emerald-500/25 text-emerald-300 font-bold transition-all duration-300 px-2 py-0.5 rounded"
          : direction === "down"
          ? "bg-rose-500/25 text-rose-300 font-bold transition-all duration-300 px-2 py-0.5 rounded"
          : "";
      return <span className={`font-extrabold text-slate-100 ${flashClass}`}>{val ? formatNumber(val, 2) : "-"}</span>;
    },
  },
  {
    id: "changePercent",
    header: "Change (%)",
    meta: { align: "right" },
    accessorFn: (row) => row.changePercent,
    cell: ({ row }) => {
      const change = row.original.change;
      const pct = row.original.changePercent;
      if (change === null || pct === null) return "-";
      const sign = change > 0 ? "+" : "";
      const colorClass = change > 0 ? "text-emerald-400 font-medium" : change < 0 ? "text-rose-400 font-medium" : "text-slate-400";
      return <span className={colorClass}>{`${sign}${formatNumber(change, 2)} (${sign}${formatNumber(pct, 2)}%)`}</span>;
    },
  },
  {
    accessorKey: "open",
    header: "Open",
    meta: { align: "right" },
    cell: ({ row }) => {
      const val = row.original.open;
      return <span className="text-slate-400">{val ? formatNumber(val, 2) : "-"}</span>;
    },
  },
  {
    accessorKey: "high",
    header: "High",
    meta: { align: "right" },
    cell: ({ row }) => {
      const val = row.original.high;
      return <span className="text-slate-400">{val ? formatNumber(val, 2) : "-"}</span>;
    },
  },
  {
    accessorKey: "low",
    header: "Low",
    meta: { align: "right" },
    cell: ({ row }) => {
      const val = row.original.low;
      return <span className="text-slate-400">{val ? formatNumber(val, 2) : "-"}</span>;
    },
  },
  {
    accessorKey: "close",
    header: "Close",
    meta: { align: "right" },
    cell: ({ row }) => {
      const val = row.original.close;
      return <span className="text-slate-400">{val ? formatNumber(val, 2) : "-"}</span>;
    },
  },
  {
    accessorKey: "oi",
    header: "OI (Lakhs)",
    meta: { align: "right" },
    cell: ({ row }) => {
      const val = row.original.oi;
      return <span className="text-slate-300">{val ? formatNumber(val / 100000, 2) : "-"}</span>;
    },
  },
  {
    accessorKey: "volume",
    header: "Volume",
    meta: { align: "right" },
    cell: ({ row }) => {
      const val = row.original.volume;
      return <span className="text-slate-400">{val ? formatNumber(val, 0) : "-"}</span>;
    },
  },
  {
    accessorKey: "bid",
    header: "Bid",
    meta: { align: "right" },
    cell: ({ row }) => {
      const val = row.original.bid;
      return <span className="text-emerald-400/90 font-medium">{val ? formatNumber(val, 2) : "-"}</span>;
    },
  },
  {
    accessorKey: "ask",
    header: "Ask",
    meta: { align: "right" },
    cell: ({ row }) => {
      const val = row.original.ask;
      return <span className="text-rose-400/90 font-medium">{val ? formatNumber(val, 2) : "-"}</span>;
    },
  },
  {
    accessorKey: "lotSize",
    header: "Lot Size",
    meta: { align: "right" },
    cell: ({ row }) => <span className="text-slate-400">{row.original.lotSize}</span>,
  },
  {
    id: "actions",
    header: "Actions",
    meta: { align: "center" },
    enableSorting: false,
    cell: ({ row }) => (
      <PaperTradeButtons
        brokerAccountId={brokerAccountId}
        instrumentType="FUTURE"
        token={row.original.token}
        symbol={row.original.symbol}
        exchangeType={2}
        exchange="NFO"
        lotSize={row.original.lotSize}
        price={row.original.ltp}
        defaultQuantity={row.original.lotSize}
      />
    ),
  },
];
