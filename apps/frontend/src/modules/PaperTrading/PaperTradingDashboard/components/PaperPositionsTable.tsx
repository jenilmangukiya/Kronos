import React from "react";
import { PaperPosition as ServicePaperPosition } from "../../../../services/paper-trading/PaperTradingService";
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from "../../../../components/ui/Table";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { formatCurrency, formatNumber } from "../../../../utils/format";

interface PaperPositionsTableProps {
  positions: ServicePaperPosition[];
  onExitClick: (position: ServicePaperPosition) => void;
}

export const PaperPositionsTable: React.FC<PaperPositionsTableProps> = ({
  positions,
  onExitClick,
}) => {
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

  return (
    <Table className="text-xs">
      <TableHeader className="bg-slate-950">
        <TableRow className="border-b border-slate-800">
          <TableHeadCell className="text-left py-3">Symbol</TableHeadCell>
          <TableHeadCell className="text-left">Type</TableHeadCell>
          <TableHeadCell className="text-right">Qty</TableHeadCell>
          <TableHeadCell className="text-right">Avg Price</TableHeadCell>
          <TableHeadCell className="text-right">LTP</TableHeadCell>
          <TableHeadCell className="text-right">Realized P&L</TableHeadCell>
          <TableHeadCell className="text-right">Unrealized P&L</TableHeadCell>
          <TableHeadCell className="text-right">Total P&L</TableHeadCell>
          <TableHeadCell className="text-center">Status</TableHeadCell>
          <TableHeadCell className="text-center py-3">Action</TableHeadCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {positions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={10} className="text-center py-8 text-slate-500 text-sm">
              No positions open or closed yet.
            </TableCell>
          </TableRow>
        ) : (
          positions.map((pos) => {
            return (
              <TableRow key={pos.id} className="hover:bg-slate-900/40 border-b border-slate-900 transition-colors">
                <TableCell className="text-left font-mono font-bold text-slate-200 py-3">
                  {pos.symbol}
                </TableCell>
                <TableCell className="text-left text-slate-400">
                  <Badge variant="neutral" className="!bg-slate-800 !text-slate-300 border-slate-700">
                    {pos.instrumentType}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-slate-300">
                  {pos.quantity}
                </TableCell>
                <TableCell className="text-right font-mono text-slate-300">
                  {formatCurrency(pos.avgPrice)}
                </TableCell>
                <TableCell className="text-right font-mono text-slate-100 font-bold">
                  {pos.ltp !== null ? formatCurrency(pos.ltp) : "-"}
                </TableCell>
                <TableCell className={`text-right font-mono ${getPnlClass(pos.realizedPnl)}`}>
                  {formatCurrency(pos.realizedPnl)}
                </TableCell>
                <TableCell className={`text-right font-mono ${getPnlClass(pos.unrealizedPnl)}`}>
                  {formatCurrency(pos.unrealizedPnl)}
                </TableCell>
                <TableCell className={`text-right font-mono ${getPnlClass(pos.totalPnl)}`}>
                  {formatCurrency(pos.totalPnl)}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(pos.status)}
                </TableCell>
                <TableCell className="text-center py-2">
                  {pos.status === "OPEN" ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onExitClick(pos)}
                      className="!bg-rose-600/10 hover:!bg-rose-600/20 !text-rose-400 border border-rose-500/20 hover:border-rose-500/40 py-1 px-3 text-xs"
                    >
                      Exit
                    </Button>
                  ) : (
                    <span className="text-slate-600 text-xs">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};
