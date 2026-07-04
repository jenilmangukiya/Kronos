import React from "react";
import { FutureContractUI } from "../types";
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from "../../../../components/ui/Table";
import { formatNumber } from "../../../../utils/format";

interface FuturesTableProps {
  rows: FutureContractUI[];
}

export const FuturesTable: React.FC<FuturesTableProps> = ({ rows }) => {
  const getFlashClass = (direction?: "up" | "down" | "flat") => {
    if (direction === "up") return "bg-emerald-500/25 text-emerald-300 font-bold transition-all duration-300";
    if (direction === "down") return "bg-rose-500/25 text-rose-300 font-bold transition-all duration-300";
    return "";
  };

  const getChangeStyle = (change: number | null) => {
    if (change === null || change === 0) return "text-slate-400";
    return change > 0 ? "text-emerald-400 font-medium" : "text-rose-400 font-medium";
  };

  const formatChange = (change: number | null, pct: number | null) => {
    if (change === null || pct === null) return "-";
    const sign = change > 0 ? "+" : "";
    return `${sign}${formatNumber(change, 2)} (${sign}${formatNumber(pct, 2)}%)`;
  };

  return (
    <Table className="text-xs">
      <TableHeader className="sticky top-0 z-10 bg-slate-950">
        <TableRow className="border-b border-slate-800">
          <TableHeadCell className="text-left py-3">Expiry</TableHeadCell>
          <TableHeadCell className="text-left">Symbol</TableHeadCell>
          <TableHeadCell className="text-right">LTP</TableHeadCell>
          <TableHeadCell className="text-right">Change (%)</TableHeadCell>
          <TableHeadCell className="text-right">Open</TableHeadCell>
          <TableHeadCell className="text-right">High</TableHeadCell>
          <TableHeadCell className="text-right">Low</TableHeadCell>
          <TableHeadCell className="text-right">Close</TableHeadCell>
          <TableHeadCell className="text-right">OI (Lakhs)</TableHeadCell>
          <TableHeadCell className="text-right">Volume</TableHeadCell>
          <TableHeadCell className="text-right">Bid</TableHeadCell>
          <TableHeadCell className="text-right">Ask</TableHeadCell>
          <TableHeadCell className="text-right">Lot Size</TableHeadCell>
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.map((row) => {
          return (
            <TableRow key={row.token} className="hover:bg-slate-900/40 border-b border-slate-900 transition-colors">
              <TableCell className="text-left font-semibold text-slate-200 py-3">
                {row.expiry}
              </TableCell>
              <TableCell className="text-left text-slate-400 font-mono">
                {row.symbol}
              </TableCell>
              <TableCell className={`text-right text-slate-100 font-extrabold ${getFlashClass(row.direction)}`}>
                {row.ltp ? formatNumber(row.ltp, 2) : "-"}
              </TableCell>
              <TableCell className={`text-right ${getChangeStyle(row.change)}`}>
                {formatChange(row.change, row.changePercent)}
              </TableCell>
              <TableCell className="text-right text-slate-400">
                {row.open ? formatNumber(row.open, 2) : "-"}
              </TableCell>
              <TableCell className="text-right text-slate-400">
                {row.high ? formatNumber(row.high, 2) : "-"}
              </TableCell>
              <TableCell className="text-right text-slate-400">
                {row.low ? formatNumber(row.low, 2) : "-"}
              </TableCell>
              <TableCell className="text-right text-slate-400">
                {row.close ? formatNumber(row.close, 2) : "-"}
              </TableCell>
              <TableCell className="text-right text-slate-300">
                {row.oi ? formatNumber(row.oi / 100000, 2) : "-"}
              </TableCell>
              <TableCell className="text-right text-slate-400">
                {row.volume ? formatNumber(row.volume, 0) : "-"}
              </TableCell>
              <TableCell className="text-right text-emerald-400/90 font-medium">
                {row.bid ? formatNumber(row.bid, 2) : "-"}
              </TableCell>
              <TableCell className="text-right text-rose-400/90 font-medium">
                {row.ask ? formatNumber(row.ask, 2) : "-"}
              </TableCell>
              <TableCell className="text-right text-slate-400">
                {row.lotSize}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
