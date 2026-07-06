import React, { useMemo } from "react";
import { FutureContractUI } from "../types";
import { DataTable } from "../../../../components/table/DataTable";
import { getFuturesColumns } from "./futuresColumns";

interface FuturesTableProps {
  rows: FutureContractUI[];
  brokerAccountId?: string;
}

export const FuturesTable: React.FC<FuturesTableProps> = ({ rows, brokerAccountId }) => {
  const columns = useMemo(() => getFuturesColumns(brokerAccountId), [brokerAccountId]);

  return (
    <DataTable
      data={rows}
      columns={columns}
      emptyMessage="No futures contracts found."
    />
  );
};
