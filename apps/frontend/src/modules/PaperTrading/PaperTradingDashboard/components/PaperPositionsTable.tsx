import React, { useMemo } from "react";
import { PaperPosition as ServicePaperPosition } from "../../../../services/paper-trading/PaperTradingService";
import { DataTable } from "../../../../components/table/DataTable";
import { getPaperPositionsColumns } from "./paperPositionsColumns";

interface PaperPositionsTableProps {
  positions: ServicePaperPosition[];
  onExitClick: (position: ServicePaperPosition) => void;
}

export const PaperPositionsTable: React.FC<PaperPositionsTableProps> = ({
  positions,
  onExitClick,
}) => {
  const columns = useMemo(() => getPaperPositionsColumns(onExitClick), [onExitClick]);

  return (
    <DataTable
      data={positions}
      columns={columns}
      emptyMessage="No positions open or closed yet."
    />
  );
};
