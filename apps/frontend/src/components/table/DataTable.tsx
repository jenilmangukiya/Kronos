import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  RowData,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from "../ui/Table";
import { Spinner } from "../ui/Spinner";
import { DataTableProps } from "./types";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "center" | "right";
    className?: string;
  }
}

export function DataTable<TData, TValue>({
  data,
  columns,
  isLoading = false,
  emptyMessage = "No data found",
  pageSize = 10,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
  });

  return (
    <div className="w-full flex flex-col">
      <Table className="text-xs">
        <TableHeader className="bg-slate-950">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b border-slate-800">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const isSorted = header.column.getIsSorted();
                const align = header.column.columnDef.meta?.align || "left";
                
                return (
                  <TableHeadCell
                    key={header.id}
                    className={`${canSort ? "cursor-pointer select-none" : ""} py-3 ${
                      align === "right"
                        ? "text-right"
                        : align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${header.column.columnDef.meta?.className || ""}`}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        align === "right"
                          ? "justify-end w-full"
                          : align === "center"
                          ? "justify-center w-full"
                          : "justify-start"
                      }`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {canSort && (
                        <span className="text-slate-500">
                          {isSorted === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 text-blue-400" />
                          ) : isSorted === "desc" ? (
                            <ArrowDown className="h-3.5 w-3.5 text-blue-400" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100 transition-opacity" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHeadCell>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center py-12"
              >
                <div className="flex justify-center items-center gap-2">
                  <Spinner size="sm" />
                  <span className="text-slate-500">Loading data...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center py-8 text-slate-500 text-sm"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="hover:bg-slate-900/40 border-b border-slate-900 transition-colors"
              >
                {row.getVisibleCells().map((cell) => {
                  const align = cell.column.columnDef.meta?.align || "left";
                  return (
                    <TableCell
                      key={cell.id}
                      className={`py-3 ${
                        align === "right"
                          ? "text-right"
                          : align === "center"
                          ? "text-center"
                          : "text-left"
                      } ${cell.column.columnDef.meta?.className || ""}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/20 text-slate-400">
          <div className="flex items-center gap-1 font-medium">
            <span>Page</span>
            <strong>
              {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="py-1 px-3 h-8 text-xs font-bold rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-900 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="py-1 px-3 h-8 text-xs font-bold rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-900 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
