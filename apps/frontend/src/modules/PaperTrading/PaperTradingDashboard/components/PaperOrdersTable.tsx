import React from "react";
import { PaperOrder } from "../../../../services/paper-trading/PaperTradingService";
import { DataTable } from "../../../../components/table/DataTable";
import { paperOrdersColumns } from "./paperOrdersColumns";

interface PaperOrdersTableProps {
  orders: PaperOrder[];
}

export const PaperOrdersTable: React.FC<PaperOrdersTableProps> = ({ orders }) => {
  return (
    <DataTable
      data={orders}
      columns={paperOrdersColumns}
      emptyMessage="No orders placed yet."
    />
  );
};
