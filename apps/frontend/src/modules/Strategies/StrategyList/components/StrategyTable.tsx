import React, { useMemo } from "react";
import { Strategy } from "../../../../services/strategies/StrategyService";
import { DataTable } from "../../../../components/table/DataTable";
import { getStrategyColumns } from "./strategyColumns";

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
  const columns = useMemo(
    () => getStrategyColumns(onStart, onStop, isActionLoading),
    [onStart, onStop, isActionLoading]
  );

  return (
    <DataTable
      data={strategies}
      columns={columns}
      emptyMessage="No strategies created yet."
    />
  );
};
