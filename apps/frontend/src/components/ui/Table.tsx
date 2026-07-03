import React from "react";
import { cn } from "../../utils/cn";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  wrapperClassName?: string;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => {
    return (
      <div className={cn("w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40 backdrop-blur-md", wrapperClassName)}>
        <table
          ref={ref}
          className={cn("w-full text-left text-sm text-slate-300 border-collapse", className)}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-slate-900/90 text-slate-200 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider",
      className
    )}
    {...props}
  >
    {children}
  </thead>
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("divide-y divide-slate-800/60 bg-transparent", className)}
    {...props}
  >
    {children}
  </tbody>
));
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, children, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn("hover:bg-slate-800/30 transition-colors duration-150", className)}
    {...props}
  >
    {children}
  </tr>
));
TableRow.displayName = "TableRow";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, children, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-4 py-3 align-middle font-medium text-slate-300", className)}
    {...props}
  >
    {children}
  </td>
));
TableCell.displayName = "TableCell";

export const TableHeadCell = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, children, ...props }, ref) => (
  <th
    ref={ref}
    className={cn("px-4 py-3 text-left font-semibold text-slate-300 select-none", className)}
    {...props}
  >
    {children}
  </th>
));
TableHeadCell.displayName = "TableHeadCell";
