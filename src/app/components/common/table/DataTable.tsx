"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import PaginationFooter, {
  type TablePagination,
} from "./Pagination";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  /**
   * The rows to draw. When paginating this is the current slice, not the whole
   * set — the caller slices, because it is the one that knows what its filters
   * left behind. `pagination.totalItems` carries the unsliced count.
   */
  data: TData[];
  emptyState?: React.ReactNode;
  /** Controlled pagination. Omit for a table that shows everything it is given. */
  pagination?: TablePagination;
}

export default function DataTable<TData>({
  columns,
  data,
  emptyState,
  pagination,
}: DataTableProps<TData>) {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-pneutral-200 bg-white shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-secondary-600 h-14">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-p3 font-bold text-pneutral-50 font-noto-sans border-r border-secondary-500 text-left last:border-r-0"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {/* Without this an empty dataset renders a bare header, which reads as
              a broken table rather than "nothing to show". */}
          {table.getRowModel().rows.length === 0 && (
            emptyState ? (
              <tr>
                <td colSpan={columns.length} className="border-t border-pneutral-200 bg-white p-0">
                  {emptyState}
                </td>
              </tr>
            ) : (
              <tr className="border border-pneutral-200 h-17">
                <td
                  colSpan={columns.length}
                  className="px-4 border border-pneutral-200 text-center text-label-l4 text-pneutral-500"
                >
                  No records found.
                </td>
              </tr>
            )
          )}

          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border border-pneutral-200 h-17">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-4 border border-pneutral-200 text-pneutral-900 text-label-l4 align-middle"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Outside the table, inside the card: the footer belongs to the list as
          a whole, and a row spanning every column would inherit the cell
          borders. */}
      {pagination && <PaginationFooter {...pagination} />}
    </div>
  );
}
