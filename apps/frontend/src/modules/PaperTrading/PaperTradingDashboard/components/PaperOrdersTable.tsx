import React from "react";
import { PaperOrder } from "../../../../services/paper-trading/PaperTradingService";
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from "../../../../components/ui/Table";
import { Badge } from "../../../../components/ui/Badge";
import { formatCurrency, formatDate } from "../../../../utils/format";

interface PaperOrdersTableProps {
  orders: PaperOrder[];
}

export const PaperOrdersTable: React.FC<PaperOrdersTableProps> = ({ orders }) => {
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

  return (
    <Table className="text-xs">
      <TableHeader className="bg-slate-950">
        <TableRow className="border-b border-slate-800">
          <TableHeadCell className="text-left py-3">Time</TableHeadCell>
          <TableHeadCell className="text-left">Symbol</TableHeadCell>
          <TableHeadCell className="text-left">Type</TableHeadCell>
          <TableHeadCell className="text-center">Side</TableHeadCell>
          <TableHeadCell className="text-right">Qty</TableHeadCell>
          <TableHeadCell className="text-right">Price</TableHeadCell>
          <TableHeadCell className="text-center">Status</TableHeadCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-slate-500 text-sm">
              No orders placed yet.
            </TableCell>
          </TableRow>
        ) : (
          orders.map((order) => {
            return (
              <TableRow key={order.id} className="hover:bg-slate-900/40 border-b border-slate-900 transition-colors">
                <TableCell className="text-left text-slate-400 py-3">
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell className="text-left font-mono font-bold text-slate-200">
                  {order.symbol}
                </TableCell>
                <TableCell className="text-left text-slate-400">
                  <Badge variant="neutral" className="!bg-slate-800 !text-slate-300 border-slate-700">
                    {order.instrumentType}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {getSideBadge(order.side)}
                </TableCell>
                <TableCell className="text-right font-mono text-slate-300">
                  {order.quantity}
                </TableCell>
                <TableCell className="text-right font-mono text-slate-100 font-bold">
                  {formatCurrency(order.price)}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(order.status)}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};
