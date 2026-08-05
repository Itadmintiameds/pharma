"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
}

export default function DataTable<TData>({
  columns,
  data,
}: DataTableProps<TData>) {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-pneutral-200 bg-white">
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-secondary-600 h-18 ">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="text-p3 font-bold text-pneutral-50 font-noto-sans border border-pneutral-200"
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
            <tr className="border border-pneutral-200 h-17">
              <td
                colSpan={columns.length}
                className="px-4 border border-pneutral-200 text-center text-label-l4 text-pneutral-500"
              >
                No records found.
              </td>
            </tr>
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
    </div>
  );
}
