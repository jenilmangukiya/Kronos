import React from "react";
import { OptionChainRow } from "../../../../services/market-data/MarketDataService";
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from "../../../../components/ui/Table";
import { formatNumber, formatGreek, formatPercent } from "../../../../utils/format";

type UILeg = any;

interface OptionChainTableProps {
  rows: OptionChainRow[];
  underlyingLtp: number;
  atmStrike: number;
}

export const OptionChainTable: React.FC<OptionChainTableProps> = ({
  rows,
  underlyingLtp,
  atmStrike,
}) => {
  return (
    <Table className="text-xs">
      <TableHeader className="sticky top-0 z-10 bg-slate-950">
        <TableRow className="border-b-2 border-slate-800">
          <TableHeadCell colSpan={7} className="text-center bg-rose-950/20 text-rose-300 font-bold border-r border-slate-800 py-1.5">
            CALL (CE)
          </TableHeadCell>
          <TableHeadCell className="text-center bg-slate-900 text-slate-100 font-bold border-r border-slate-800 py-1.5">
            STRIKE
          </TableHeadCell>
          <TableHeadCell colSpan={7} className="text-center bg-emerald-950/20 text-emerald-300 font-bold py-1.5">
            PUT (PE)
          </TableHeadCell>
        </TableRow>
        <TableRow>
          <TableHeadCell className="text-right">OI (Lakhs)</TableHeadCell>
          <TableHeadCell className="text-right">Volume</TableHeadCell>
          <TableHeadCell className="text-right">IV</TableHeadCell>
          <TableHeadCell className="text-right">Delta</TableHeadCell>
          <TableHeadCell className="text-right">LTP</TableHeadCell>
          <TableHeadCell className="text-right">Bid</TableHeadCell>
          <TableHeadCell className="text-right border-r border-slate-800">Ask</TableHeadCell>

          <TableHeadCell className="text-center bg-slate-900 border-r border-slate-800">Strike</TableHeadCell>

          <TableHeadCell className="text-left">Bid</TableHeadCell>
          <TableHeadCell className="text-left">Ask</TableHeadCell>
          <TableHeadCell className="text-left">LTP</TableHeadCell>
          <TableHeadCell className="text-left">Delta</TableHeadCell>
          <TableHeadCell className="text-left">IV</TableHeadCell>
          <TableHeadCell className="text-left">Volume</TableHeadCell>
          <TableHeadCell className="text-left">OI (Lakhs)</TableHeadCell>
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.map((row) => {
          const isAtm = row.strike === atmStrike;
          const ceIsItm = row.strike < underlyingLtp;
          const peIsItm = row.strike > underlyingLtp;

          const getFlashClass = (direction?: "up" | "down" | "flat") => {
            if (direction === "up") return "bg-emerald-500/25 text-emerald-300 font-bold transition-all duration-300";
            if (direction === "down") return "bg-rose-500/25 text-rose-300 font-bold transition-all duration-300";
            return "";
          };

          const ceLeg = row.ce as UILeg;
          const peLeg = row.pe as UILeg;

          return (
            <TableRow
              key={row.strike}
              className={`${
                isAtm
                  ? "bg-blue-500/10 hover:bg-blue-500/15 border-y border-blue-500/30 font-bold text-slate-100"
                  : ""
              }`}
            >
              <TableCell className={`text-right ${ceIsItm ? "bg-slate-900/30" : ""}`}>
                {ceLeg?.oi ? formatNumber(ceLeg.oi / 100000, 2) : "-"}
              </TableCell>
              <TableCell className={`text-right text-slate-400 ${ceIsItm ? "bg-slate-900/30" : ""}`}>
                {ceLeg?.volume ? formatNumber(ceLeg.volume, 0) : "-"}
              </TableCell>
              <TableCell className={`text-right text-purple-400 ${ceIsItm ? "bg-slate-900/30" : ""}`}>
                {ceLeg?.iv ? formatPercent(ceLeg.iv) : "-"}
              </TableCell>
              <TableCell className={`text-right text-slate-400 ${ceIsItm ? "bg-slate-900/30" : ""}`}>
                {ceLeg?.delta ? formatGreek(ceLeg.delta) : "-"}
              </TableCell>
              <TableCell
                className={`text-right text-slate-200 font-bold ${
                  ceIsItm ? "bg-slate-900/30" : ""
                } ${getFlashClass(ceLeg?.direction)}`}
              >
                {ceLeg?.ltp ? formatNumber(ceLeg.ltp, 2) : "-"}
              </TableCell>
              <TableCell className={`text-right text-slate-400 ${ceIsItm ? "bg-slate-900/30" : ""}`}>
                {ceLeg?.bid ? formatNumber(ceLeg.bid, 2) : "-"}
              </TableCell>
              <TableCell className={`text-right text-slate-400 border-r border-slate-800 ${ceIsItm ? "bg-slate-900/30" : ""}`}>
                {ceLeg?.ask ? formatNumber(ceLeg.ask, 2) : "-"}
              </TableCell>

              <TableCell
                className={`text-center bg-slate-900 font-extrabold border-r border-slate-800 ${
                  isAtm ? "text-blue-400 ring-1 ring-blue-500/20" : "text-slate-100"
                }`}
              >
                {row.strike}
              </TableCell>

              <TableCell className={`text-left text-slate-400 ${peIsItm ? "bg-slate-900/30" : ""}`}>
                {peLeg?.bid ? formatNumber(peLeg.bid, 2) : "-"}
              </TableCell>
              <TableCell className={`text-left text-slate-400 border-r-0 ${peIsItm ? "bg-slate-900/30" : ""}`}>
                {peLeg?.ask ? formatNumber(peLeg.ask, 2) : "-"}
              </TableCell>
              <TableCell
                className={`text-left text-slate-200 font-bold ${
                  peIsItm ? "bg-slate-900/30" : ""
                } ${getFlashClass(peLeg?.direction)}`}
              >
                {peLeg?.ltp ? formatNumber(peLeg.ltp, 2) : "-"}
              </TableCell>
              <TableCell className={`text-left text-slate-400 ${peIsItm ? "bg-slate-900/30" : ""}`}>
                {peLeg?.delta ? formatGreek(peLeg.delta) : "-"}
              </TableCell>
              <TableCell className={`text-left text-purple-400 ${peIsItm ? "bg-slate-900/30" : ""}`}>
                {peLeg?.iv ? formatPercent(peLeg.iv) : "-"}
              </TableCell>
              <TableCell className={`text-left text-slate-400 ${peIsItm ? "bg-slate-900/30" : ""}`}>
                {peLeg?.volume ? formatNumber(peLeg.volume, 0) : "-"}
              </TableCell>
              <TableCell className={`text-left ${peIsItm ? "bg-slate-900/30" : ""}`}>
                {peLeg?.oi ? formatNumber(peLeg.oi / 100000, 2) : "-"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
