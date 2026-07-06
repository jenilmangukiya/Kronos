import { ColumnDef } from "@tanstack/react-table";

export interface DataTableProps<TData, TValue> {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  isLoading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
}
